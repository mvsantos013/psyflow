from __future__ import annotations

from flask import Blueprint, jsonify


def create_agenda_blueprint(*, agenda_service, deps):
    bp = Blueprint("agenda", __name__)
    d = deps

    @bp.get("/api/sessions/agenda")
    def get_sessions_agenda():
        org_id = d.extract_org_id()
        data = agenda_service.get_sessions_agenda(org_id)
        return jsonify(d.json_ready(data))

    return bp
