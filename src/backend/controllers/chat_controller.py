from __future__ import annotations

from flask import Blueprint, jsonify, request


def create_chat_blueprint(*, chat_service, deps):
    bp = Blueprint("chat", __name__)
    d = deps

    @bp.get("/api/patients/<patient_id>/chat")
    def get_patient_chat(patient_id: str):
        org_id = d.extract_org_id()
        limit = request.args.get("limit", default=50, type=int)
        data = chat_service.get_patient_chat(org_id, patient_id, limit=limit)
        return jsonify(d.json_ready(data))

    return bp
