from __future__ import annotations

from core.validation import JsonField
from core.validation import JsonSchema
from flask import Blueprint, jsonify
from flask import request

_CREATE_SESSION_SCHEMA = JsonSchema(
    fields={
        "date": JsonField(required=True),
        "type": JsonField(required=True),
        "duration": JsonField(required=True),
        "moodStart": JsonField(),
        "moodEnd": JsonField(),
        "summary": JsonField(),
        "insights": JsonField(),
        "tasks": JsonField(),
        "paid": JsonField(),
    }
)

_SAVE_TRANSCRIPTION_SCHEMA = JsonSchema(
    fields={
        "patientId": JsonField(required=True),
        "transcription": JsonField(required=True),
        "audioS3Key": JsonField(),
        "storeInS3": JsonField(),
        "transcriptionS3Key": JsonField(),
        "summary": JsonField(),
        "insights": JsonField(),
        "tasks": JsonField(),
    }
)

_PATCH_SESSION_SCHEMA = JsonSchema(
    fields={
        "patientId": JsonField(required=True),
        "audioS3Key": JsonField(),
        "transcriptionS3Key": JsonField(),
        "transcriptionStatus": JsonField(),
        "paid": JsonField(),
    }
)


def create_session_blueprint(
    *,
    session_service,
    deps,
):
    bp = Blueprint("sessions", __name__)
    d = deps

    @bp.get("/api/patients/<patient_id>/sessions")
    def get_patient_sessions(patient_id: str):
        org_id = d.extract_org_id()
        sessions = session_service.list_sessions(org_id, patient_id)
        return jsonify(d.json_ready(sessions))

    @bp.post("/api/patients/<patient_id>/sessions")
    def create_patient_session(patient_id: str):
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        payload = d.validate_json_schema(_CREATE_SESSION_SCHEMA)

        if not d.patient_exists(org_id, patient_id):
            return d.json_error(404, "PATIENT_NOT_FOUND", "patient not found")

        date = d.require_date_yyyy_mm_dd(payload, "date")
        session_type = d.require_string(payload, "type", max_length=20)
        duration = d.require_int(payload, "duration", min_value=1, max_value=300)
        mood_start = d.optional_int(payload, "moodStart", min_value=0, max_value=10) or 0
        mood_end = d.optional_int(payload, "moodEnd", min_value=0, max_value=10) or 0
        summary = d.optional_string(payload, "summary", max_length=10000) or ""
        insights = d.optional_string_list(payload, "insights")
        tasks = d.optional_string_list(payload, "tasks")
        paid = d.optional_bool(payload, "paid", default=False)

        session = session_service.create_session(
            org_id,
            patient_id,
            date=date,
            session_type=session_type,
            duration=duration,
            mood_start=mood_start,
            mood_end=mood_end,
            summary=summary,
            insights=insights,
            tasks=tasks,
            paid=paid,
        )
        return jsonify(d.json_ready(session)), 201

    @bp.get("/api/patients/<patient_id>/transcription")
    def get_patient_transcription(patient_id: str):
        org_id = d.extract_org_id()
        data = session_service.get_patient_transcription(org_id, patient_id)
        if data is None:
            return d.json_error(404, "TRANSCRIPTION_NOT_FOUND", "transcription not found")
        return jsonify(d.json_ready(data))

    @bp.post("/api/sessions/<session_id>/transcription")
    def save_session_transcription(session_id: str):
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        d.enforce_sensitive_rate_limit(
            "save_session_transcription",
            org_id=org_id,
            user_id=d.extract_user_sub(),
            role=role,
        )
        payload = d.validate_json_schema(_SAVE_TRANSCRIPTION_SCHEMA)
        patient_id = d.require_string(payload, "patientId", max_length=128)
        transcription_text = d.require_string(payload, "transcription", max_length=500000)

        if not session_service.session_exists(org_id, patient_id, session_id):
            return d.json_error(404, "SESSION_NOT_FOUND", "session not found")

        session_service.save_transcription(
            org_id,
            patient_id,
            session_id,
            transcription_text=transcription_text,
            audio_s3_key=d.optional_string(payload, "audioS3Key", max_length=2048),
            store_in_s3=d.optional_bool(payload, "storeInS3", default=False),
            transcription_s3_key=d.optional_string(payload, "transcriptionS3Key", max_length=2048),
            summary=d.optional_string(payload, "summary", max_length=10000) or "",
            insights=d.optional_string_list(payload, "insights"),
            tasks=d.optional_string_list(payload, "tasks"),
        )

        return jsonify({"ok": True, "sessionId": session_id})

    @bp.patch("/api/sessions/<session_id>")
    def patch_session(session_id: str):
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        d.enforce_sensitive_rate_limit(
            "patch_session",
            org_id=org_id,
            user_id=d.extract_user_sub(),
            role=role,
        )
        payload = d.validate_json_schema(_PATCH_SESSION_SCHEMA)
        patient_id = d.require_string(payload, "patientId", max_length=128)

        if not session_service.session_exists(org_id, patient_id, session_id):
            return d.json_error(404, "SESSION_NOT_FOUND", "session not found")

        transcription_status = payload.get("transcriptionStatus")
        if transcription_status is not None:
            transcription_status = d.require_string(payload, "transcriptionStatus", max_length=20)
            if transcription_status not in ("none", "processing", "done"):
                raise ValueError("transcriptionStatus must be one of: none, processing, done")

        updated = session_service.patch_session(
            org_id,
            patient_id,
            session_id,
            audio_s3_key=d.optional_string(payload, "audioS3Key", max_length=2048),
            transcription_s3_key=d.optional_string(payload, "transcriptionS3Key", max_length=2048),
            transcription_status=transcription_status,
            paid=d.optional_bool(payload, "paid"),
        )

        if not updated:
            return d.json_error(404, "SESSION_NOT_FOUND", "session not found")

        return jsonify(d.json_ready(updated))

    @bp.delete("/api/sessions/<session_id>")
    def delete_session(session_id: str):
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        patient_id = request.args.get("patientId", "")
        patient_id = d.require_string({"patientId": patient_id}, "patientId", max_length=128)

        if not session_service.session_exists(org_id, patient_id, session_id):
            return d.json_error(404, "SESSION_NOT_FOUND", "session not found")

        deleted = session_service.delete_session(org_id, patient_id, session_id)
        if not deleted:
            return d.json_error(404, "SESSION_NOT_FOUND", "session not found")

        return jsonify({"ok": True, "sessionId": session_id})

    return bp
