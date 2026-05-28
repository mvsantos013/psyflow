from __future__ import annotations

from core.validation import JsonField
from core.validation import JsonSchema
from flask import Blueprint, jsonify, request

_CREATE_EXERCISE_SCHEMA = JsonSchema(
    fields={
        "title": JsonField(required=True),
        "description": JsonField(required=True),
        "type": JsonField(required=True),
    }
)


def create_exercise_blueprint(
    *,
    exercise_service,
    deps,
):
    bp = Blueprint("exercises", __name__)
    d = deps

    @bp.get("/api/exercises")
    def get_exercises():
        org_id = d.extract_org_id()
        exercise_type = request.args.get("type")
        exercises = exercise_service.list_exercises(org_id, exercise_type=exercise_type)
        return jsonify(d.json_ready(exercises))

    @bp.post("/api/exercises")
    def create_exercise():
        org_id, role = d.extract_auth_context()
        d.require_write_role(role)
        payload = d.validate_json_schema(_CREATE_EXERCISE_SCHEMA)

        title = d.require_string(payload, "title", max_length=200)
        description = d.require_string(payload, "description", max_length=4000)
        exercise_type = d.require_string(payload, "type", max_length=20)

        exercise = exercise_service.create_exercise(
            org_id,
            title=title,
            description=description,
            exercise_type=exercise_type,
        )
        return jsonify(d.json_ready(exercise)), 201

    return bp
