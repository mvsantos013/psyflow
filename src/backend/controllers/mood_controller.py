from __future__ import annotations

from core.validation import JsonField
from core.validation import JsonSchema
from flask import Blueprint, jsonify

_CREATE_MOOD_SCHEMA = JsonSchema(
    fields={
        "value": JsonField(required=True),
        "date": JsonField(),
        "source": JsonField(),
    }
)


def create_mood_blueprint(
    *,
    mood_service,
    deps,
):
    bp = Blueprint("mood", __name__)
    d = deps

    @bp.get("/api/patients/<patient_id>/mood")
    def get_patient_mood(patient_id: str):
        org_id = d.extract_org_id()
        mood = mood_service.list_mood(org_id, patient_id)
        return jsonify(d.json_ready(mood))

    @bp.post("/api/patients/<patient_id>/mood")
    def create_patient_mood(patient_id: str):
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        payload = d.validate_json_schema(_CREATE_MOOD_SCHEMA)
        if not d.patient_exists(org_id, patient_id):
            return d.json_error(404, "PATIENT_NOT_FOUND", "patient not found")

        value = d.require_int(payload, "value", min_value=0, max_value=10)
        date = d.require_date_yyyy_mm_dd(payload, "date") if payload.get("date") is not None else d.today_yyyy_mm_dd()
        source = d.optional_string(payload, "source", max_length=20) or "professional"
        mood = mood_service.create_mood(org_id, patient_id, value=value, date=date, source=source)
        return jsonify(d.json_ready(mood)), 201

    return bp
