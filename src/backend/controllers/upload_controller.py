from __future__ import annotations

from flask import Blueprint, jsonify
from flask import Response
from flask import request


def create_upload_blueprint(
    *,
    upload_service,
    session_service,
    deps,
):
    bp = Blueprint("uploads", __name__)
    d = deps

    @bp.get("/api/sessions/<session_id>/audio")
    def get_audio_stream(session_id: str):
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        d.enforce_sensitive_rate_limit(
            "get_audio_stream",
            org_id=org_id,
            user_id=d.extract_user_sub(),
            role=role,
        )

        patient_id = request.args.get("patientId", "")
        patient_id = d.require_string({"patientId": patient_id}, "patientId", max_length=128)

        if not d.session_exists(org_id, patient_id, session_id):
            return d.json_error(404, "SESSION_NOT_FOUND", "session not found")

        session = session_service.get_session(org_id, patient_id, session_id)
        if not session:
            return d.json_error(404, "SESSION_NOT_FOUND", "session not found")

        audio_s3_key = session.get("audioS3Key")
        if not audio_s3_key:
            return d.json_error(404, "AUDIO_NOT_FOUND", "audio not found")

        data = upload_service.get_decrypted_audio(
            org_id=org_id,
            object_key=str(audio_s3_key),
        )
        response = Response(data["payload"], mimetype=str(data["contentType"]))
        response.headers["Cache-Control"] = "no-store"
        return response

    @bp.post("/api/sessions/<session_id>/audio")
    def upload_encrypted_audio(session_id: str):
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        d.enforce_sensitive_rate_limit(
            "upload_session_audio",
            org_id=org_id,
            user_id=d.extract_user_sub(),
            role=role,
        )

        patient_id = request.form.get("patientId", "")
        patient_id = d.require_string({"patientId": patient_id}, "patientId", max_length=128)

        if not d.session_exists(org_id, patient_id, session_id):
            return d.json_error(404, "SESSION_NOT_FOUND", "session not found")

        audio_file = request.files.get("audio")
        if audio_file is None:
            raise ValueError("audio file is required")

        payload = audio_file.read()
        filename = audio_file.filename or None
        content_type = (audio_file.mimetype or "").strip() or "application/octet-stream"

        stored = upload_service.store_encrypted_audio(
            org_id=org_id,
            patient_id=patient_id,
            session_id=session_id,
            payload=payload,
            filename=filename,
            content_type=content_type,
        )
        session_service.patch_session(
            org_id,
            patient_id,
            session_id,
            audio_s3_key=str(stored["key"]),
            transcription_s3_key=None,
            transcription_status="processing",
            paid=None,
        )

        return jsonify(
            {
                "ok": True,
                "sessionId": session_id,
                "audioS3Key": stored["key"],
            }
        )

    return bp
