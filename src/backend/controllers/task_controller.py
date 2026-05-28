from __future__ import annotations

from core.validation import JsonField
from core.validation import JsonSchema
from flask import Blueprint, jsonify, request

_CREATE_TASK_SCHEMA = JsonSchema(
    fields={
        "title": JsonField(required=True),
        "description": JsonField(required=True),
        "type": JsonField(required=True),
    }
)


def create_task_blueprint(
    *,
    task_service,
    deps,
):
    bp = Blueprint("tasks", __name__)
    d = deps

    @bp.get("/api/patients/<patient_id>/tasks")
    def get_patient_tasks(patient_id: str):
        org_id = d.extract_org_id()
        status_filter = request.args.get("status")
        tasks = task_service.list_tasks(org_id, patient_id, status_filter=status_filter)
        return jsonify(d.json_ready(tasks))

    @bp.post("/api/patients/<patient_id>/tasks")
    def create_patient_task(patient_id: str):
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        payload = d.validate_json_schema(_CREATE_TASK_SCHEMA)
        if not d.patient_exists(org_id, patient_id):
            return d.json_error(404, "PATIENT_NOT_FOUND", "patient not found")

        title = d.require_string(payload, "title", max_length=200)
        description = d.require_string(payload, "description", max_length=4000)
        task_type = d.require_string(payload, "type", max_length=20)

        task = task_service.create_task(
            org_id,
            patient_id,
            title=title,
            description=description,
            task_type=task_type,
        )
        return jsonify(d.json_ready(task)), 201

    return bp
