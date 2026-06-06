from __future__ import annotations

import logging
import time

import boto3
from asgiref.wsgi import WsgiToAsgi
from controllers.agenda_event_controller import create_agenda_event_blueprint
from controllers.chat_controller import create_chat_blueprint
from controllers.exercise_controller import create_exercise_blueprint
from controllers.organization_controller import OrganizationController
from controllers.organization_controller import create_organization_blueprint
from controllers.mood_controller import create_mood_blueprint
from controllers.patient_controller import create_patient_blueprint
from controllers.patient_controller import PatientController
from controllers.patient_record_controller import create_patient_record_blueprint
from controllers.session_controller import create_session_blueprint
from controllers.task_controller import create_task_blueprint
from controllers.upload_controller import create_upload_blueprint
from core.auth import extract_auth_context as _extract_auth_context
from core.auth import extract_claims as _extract_claims
from core.auth import extract_org_id as _extract_org_id
from core.auth import extract_role as _extract_role
from core.auth import extract_user_sub as _extract_user_sub
from core.auth import require_write_role as _require_write_role
from core.auth import require_super_admin as _require_super_admin
from core.exceptions import RateLimitedError
from core.exceptions import RateLimitPolicyError
from core.dates import now_iso as _now_iso
from core.dates import today_yyyy_mm_dd as _today_yyyy_mm_dd
from core.env import env as _env
from core.env import optional_env as _optional_env
from core.env import uploads_bucket_name as _uploads_bucket_name
from core.controller_deps import ControllerDeps
from core.rate_limiter import InMemoryRateLimiter
from core.serialization import json_error as _json_error
from core.serialization import json_ready as _json_ready
from core.validation import optional_bool as _optional_bool
from core.validation import optional_int as _optional_int
from core.validation import optional_string as _optional_string
from core.validation import optional_string_list as _optional_string_list
from core.validation import require_date_yyyy_mm_dd as _require_date_yyyy_mm_dd
from core.validation import require_int as _require_int
from core.validation import require_string as _require_string
from core.validation import validate_json_schema as _validate_json_schema
from flask import Flask
from flask import request
from mangum import Mangum
from middleware.auth_context import setup_auth_context
from middleware.error_handlers import register_error_handlers
from middleware.request_logging import setup_request_logging
from repositories.chat_repository import ChatRepository
from repositories.exercise_repository import ExerciseRepository
from repositories.agenda_event_repository import AgendaEventRepository
from repositories.agenda_recurrence_rule_repository import AgendaRecurrenceRuleRepository
from repositories.mood_repository import MoodRepository
from repositories.organization_repository import OrganizationRepository
from repositories.patient_repository import PatientRepository
from repositories.session_repository import SessionRepository
from repositories.task_repository import TaskRepository
from services.agenda_event_service import AgendaEventService
from services.chat_service import ChatService
from services.encryption_service import EncryptionService
from services.exercise_service import ExerciseService
from services.mood_service import MoodService
from services.organization_service import OrganizationService
from services.patient_record_service import PatientRecordService
from services.patient_service import PatientService
from services.session_service import SessionService
from services.task_service import TaskService
from services.upload_service import UploadService

app = Flask(__name__)

_dynamodb = boto3.resource("dynamodb")
_s3 = boto3.client("s3")
_kms = boto3.client("kms")
_cognito_idp = boto3.client("cognito-idp")
_STAGE = _env("STAGE", "dev").strip().lower() or "dev"

_TASK_TYPES = {"exercise", "audio", "journal", "habit"}
_SESSION_TYPES = {"inPerson", "remote"}
_RATE_LIMIT_POLICY = {
    "upload_session_audio": {
        "therapist": {"limit": 30, "window_seconds": 60},
        "admin": {"limit": 60, "window_seconds": 60},
        "super_admin": {"limit": 120, "window_seconds": 60},
    },
    "get_audio_stream": {
        "therapist": {"limit": 60, "window_seconds": 60},
        "admin": {"limit": 120, "window_seconds": 60},
        "super_admin": {"limit": 240, "window_seconds": 60},
    },
    "save_session_transcription": {
        "therapist": {"limit": 20, "window_seconds": 60},
        "admin": {"limit": 40, "window_seconds": 60},
        "super_admin": {"limit": 80, "window_seconds": 60},
    },
    "patch_session": {
        "therapist": {"limit": 60, "window_seconds": 60},
        "admin": {"limit": 120, "window_seconds": 60},
        "super_admin": {"limit": 240, "window_seconds": 60},
    },
}

_logger = logging.getLogger(f"psyflow.api.{_STAGE}")
if not _logger.handlers:
    logging.basicConfig(level=logging.INFO)

_raw_cors_origins = _optional_env("CORS_ALLOW_ORIGINS") or "http://localhost:8080,http://127.0.0.1:8080"
_cors_allowed_origins = {origin.strip() for origin in _raw_cors_origins.split(",") if origin.strip()}

_rate_limiter = InMemoryRateLimiter()


def _read_api_delay_seconds() -> float:
    raw_value = _optional_env("API_DELAY_SECONDS") or "0"
    try:
        delay_seconds = float(raw_value)
    except (TypeError, ValueError):
        _logger.warning("Invalid API_DELAY_SECONDS=%r. Falling back to 0.", raw_value)
        return 0.0
    return max(0.0, delay_seconds)


_API_DELAY_SECONDS = _read_api_delay_seconds()

_org_repository = OrganizationRepository(
    _dynamodb,
    table_name=_env("ORGANIZATIONS_TABLE_NAME", f"psyflow-organizations-{_STAGE}"),
)
_kms_key_arn = _optional_env("PSYFLOW_KMS_KEY_ARN")
if not _kms_key_arn:
    raise RuntimeError(
        "PSYFLOW_KMS_KEY_ARN is not set. "
        "Deploy the CDK stack and set this env var to the ClinicalDataKey ARN."
    )
_encryption_service = EncryptionService(
    _kms,
    _org_repository,
    kms_key_arn=_kms_key_arn,
)


def _build_patient_controller() -> PatientController:
    repository = PatientRepository(
        _dynamodb,
        table_name=_env("PATIENTS_TABLE_NAME", f"psyflow-patients-{_STAGE}"),
    )
    service = PatientService(repository)
    return PatientController(service, json_ready=_json_ready, json_error=_json_error)


_patient_controller = _build_patient_controller()


def _build_task_blueprint():
    repository = TaskRepository(
        _dynamodb,
        table_name=_env("TASKS_TABLE_NAME", f"psyflow-patient_tasks-{_STAGE}"),
    )
    service = TaskService(
        repository,
        task_types=_TASK_TYPES,
        now_iso=_now_iso,
        today_yyyy_mm_dd=_today_yyyy_mm_dd,
    )
    return create_task_blueprint(
        task_service=service,
        deps=_deps,
    )


def _build_mood_blueprint():
    repository = MoodRepository(
        _dynamodb,
        table_name=_env("MOOD_TABLE_NAME", f"psyflow-patient_mood-{_STAGE}"),
    )
    service = MoodService(
        repository,
        now_iso=_now_iso,
        today_yyyy_mm_dd=_today_yyyy_mm_dd,
    )
    return create_mood_blueprint(
        mood_service=service,
        deps=_deps,
    )


def _build_exercise_blueprint():
    repository = ExerciseRepository(
        _dynamodb,
        table_name=_env("EXERCISES_TABLE_NAME", f"psyflow-exercises-{_STAGE}"),
    )
    service = ExerciseService(
        repository,
        task_types=_TASK_TYPES,
        now_iso=_now_iso,
    )
    return create_exercise_blueprint(
        exercise_service=service,
        deps=_deps,
    )


def _build_organization_controller() -> OrganizationController:
    service = OrganizationService(
        _org_repository,
        now_iso=_now_iso,
        cognito_client=_cognito_idp,
        user_pool_id=_optional_env("USER_POOL_ID"),
        encryption_service=_encryption_service,
    )
    return OrganizationController(service, json_ready=_json_ready, json_error=_json_error)


def _build_session_service() -> SessionService:
    repository = SessionRepository(
        _dynamodb,
        table_name=_env("SESSIONS_TABLE_NAME", f"psyflow-patient-sessions-{_STAGE}"),
    )
    return SessionService(
        repository,
        session_types=_SESSION_TYPES,
        now_iso=_now_iso,
        optional_env=_optional_env,
        s3_client=_s3,
        encryption_service=_encryption_service,
    )


_session_service = _build_session_service()
_organization_controller = _build_organization_controller()


def _build_session_blueprint():
    return create_session_blueprint(
        session_service=_session_service,
        deps=_deps,
    )


def _build_upload_blueprint():
    service = UploadService(
        s3_client=_s3,
        uploads_bucket_name_getter=_uploads_bucket_name,
        encryption_service=_encryption_service,
    )
    return create_upload_blueprint(
        upload_service=service,
        session_service=_session_service,
        deps=_deps,
    )


def _build_chat_blueprint():
    repository = ChatRepository(
        _dynamodb,
        table_name=_env("CHAT_TABLE_NAME", f"psyflow-patient-chat-{_STAGE}"),
    )
    service = ChatService(repository)
    return create_chat_blueprint(
        chat_service=service,
        deps=_deps,
    )


def _build_agenda_event_blueprint():
    event_repository = AgendaEventRepository(
        _dynamodb,
        table_name=_env("AGENDA_EVENTS_TABLE_NAME", f"psyflow-agenda-events-{_STAGE}"),
    )
    recurrence_rule_repository = AgendaRecurrenceRuleRepository(
        _dynamodb,
        table_name=_env("AGENDA_RECURRENCE_RULES_TABLE_NAME", f"psyflow-agenda-recurrence-rules-{_STAGE}"),
    )
    service = AgendaEventService(
        event_repository,
        now_iso=_now_iso,
        agenda_recurrence_rule_repository=recurrence_rule_repository,
    )
    return create_agenda_event_blueprint(
        agenda_event_service=service,
        deps=_deps,
    )


def _build_patient_record_blueprint():
    patient_repository = PatientRepository(
        _dynamodb,
        table_name=_env("PATIENTS_TABLE_NAME", f"psyflow-patients-{_STAGE}"),
    )
    mood_repository = MoodRepository(
        _dynamodb,
        table_name=_env("MOOD_TABLE_NAME", f"psyflow-patient-mood-{_STAGE}"),
    )
    mood_service = MoodService(
        mood_repository,
        now_iso=_now_iso,
        today_yyyy_mm_dd=_today_yyyy_mm_dd,
    )
    record_service = PatientRecordService(
        patient_repository,
        _session_service,
        mood_service,
    )
    return create_patient_record_blueprint(
        patient_record_service=record_service,
        deps=_deps,
    )


def _build_patient_blueprint():
    return create_patient_blueprint(
        patient_controller=_patient_controller,
        deps=_deps,
    )


def _build_organization_blueprint():
    return create_organization_blueprint(
        organization_controller=_organization_controller,
        deps=_deps,
    )


def _mask_id(value: str | None) -> str:
    if not value:
        return "-"
    if len(value) <= 6:
        return "***"
    return f"{value[:3]}***{value[-2:]}"


def _enforce_rate_limit(scope: str, *, org_id: str | None, user_id: str | None, limit: int, window_seconds: int):
    allowed = _rate_limiter.allow(
        scope=scope,
        org_id=org_id,
        user_id=user_id,
        limit=limit,
        window_seconds=window_seconds,
    )
    if not allowed:
        raise RateLimitedError()


def _enforce_sensitive_rate_limit(scope: str, *, org_id: str, user_id: str | None, role: str):
    scope_policy = _RATE_LIMIT_POLICY.get(scope)
    if not scope_policy:
        return

    role_policy = scope_policy.get(role)
    if not role_policy:
        raise RateLimitPolicyError()

    _enforce_rate_limit(
        scope,
        org_id=org_id,
        user_id=user_id,
        limit=int(role_policy["limit"]),
        window_seconds=int(role_policy["window_seconds"]),
    )


def _patient_exists(org_id: str, patient_id: str) -> bool:
    return _patient_controller.patient_exists(org_id, patient_id)


def _session_exists(org_id: str, patient_id: str, session_id: str) -> bool:
    return _session_service.session_exists(org_id, patient_id, session_id)


_deps = ControllerDeps(
    json_ready=_json_ready,
    json_error=_json_error,
    extract_org_id=_extract_org_id,
    extract_auth_context=_extract_auth_context,
    extract_role=_extract_role,
    extract_user_sub=_extract_user_sub,
    require_write_role=_require_write_role,
    require_super_admin=_require_super_admin,
    enforce_sensitive_rate_limit=_enforce_sensitive_rate_limit,
    validate_json_schema=_validate_json_schema,
    require_string=_require_string,
    require_int=_require_int,
    require_date_yyyy_mm_dd=_require_date_yyyy_mm_dd,
    optional_string=_optional_string,
    optional_int=_optional_int,
    optional_string_list=_optional_string_list,
    optional_bool=_optional_bool,
    today_yyyy_mm_dd=_today_yyyy_mm_dd,
    patient_exists=_patient_exists,
    session_exists=_session_exists,
)


register_error_handlers(app, json_error=_json_error)
setup_auth_context(app, extract_claims=_extract_claims)
setup_request_logging(app, logger=_logger, mask_id=_mask_id)
app.register_blueprint(_build_task_blueprint())
app.register_blueprint(_build_mood_blueprint())
app.register_blueprint(_build_exercise_blueprint())
app.register_blueprint(_build_session_blueprint())
app.register_blueprint(_build_upload_blueprint())
app.register_blueprint(_build_chat_blueprint())
app.register_blueprint(_build_agenda_event_blueprint())
app.register_blueprint(_build_patient_record_blueprint())
app.register_blueprint(_build_patient_blueprint())
app.register_blueprint(_build_organization_blueprint())


@app.before_request
def _simulate_api_delay():
    if _API_DELAY_SECONDS <= 0 or request.method == "OPTIONS":
        return None
    time.sleep(_API_DELAY_SECONDS)
    return None


@app.after_request
def _apply_cors_headers(response):
    origin = request.headers.get("Origin")
    allow_any_origin = "*" in _cors_allowed_origins
    if origin and (allow_any_origin or origin in _cors_allowed_origins):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type"
        response.headers["Access-Control-Max-Age"] = "600"
    return response


asgi_app = WsgiToAsgi(app)
handler = Mangum(asgi_app)
