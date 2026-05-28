from __future__ import annotations

from flask import Blueprint, jsonify


def create_patient_record_blueprint(*, patient_record_service, deps):
    bp = Blueprint("patient_record", __name__)
    d = deps

    @bp.get("/api/patients/<patient_id>/record")
    def get_patient_record(patient_id: str):
        org_id = d.extract_org_id()
        data = patient_record_service.get_patient_record(org_id, patient_id)
        if data is None:
            return d.json_error(404, "PATIENT_NOT_FOUND", "patient not found")
        return jsonify(d.json_ready(data))

    return bp
