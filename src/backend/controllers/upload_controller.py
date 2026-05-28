from __future__ import annotations

from core.validation import JsonField
from core.validation import JsonSchema
from flask import Blueprint, jsonify

_CREATE_UPLOAD_URL_SCHEMA = JsonSchema(
    fields={
        "patientId": JsonField(required=True),
        "sessionId": JsonField(required=True),
        "filename": JsonField(),
        "contentType": JsonField(),
        "expiresIn": JsonField(),
    }
)


def create_upload_blueprint(
    *,
    upload_service,
    deps,
):
    bp = Blueprint("uploads", __name__)
    d = deps

    @bp.post("/api/uploads/audio")
    def create_audio_upload_url():
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        d.enforce_sensitive_rate_limit(
            "create_audio_upload_url",
            org_id=org_id,
            user_id=d.extract_user_sub(),
            role=role,
        )
        payload = d.validate_json_schema(_CREATE_UPLOAD_URL_SCHEMA)

        patient_id = d.require_string(payload, "patientId", max_length=128)
        session_id = d.require_string(payload, "sessionId", max_length=128)

        if not d.session_exists(org_id, patient_id, session_id):
            return d.json_error(404, "SESSION_NOT_FOUND", "session not found")

        filename = d.optional_string(payload, "filename", max_length=255)
        content_type = d.optional_string(payload, "contentType", max_length=120) or "audio/mpeg"
        expires_in = (
            d.require_int(payload, "expiresIn", min_value=60, max_value=3600)
            if payload.get("expiresIn") is not None
            else 900
        )

        data = upload_service.create_audio_upload_url(
            org_id,
            patient_id,
            session_id,
            filename=str(filename) if filename else None,
            content_type=content_type,
            expires_in=expires_in,
        )
        return jsonify(data)

    return bp
