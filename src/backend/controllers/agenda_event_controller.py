from __future__ import annotations

from core.validation import JsonField
from core.validation import JsonSchema
from flask import Blueprint, jsonify, request

_CREATE_AGENDA_EVENT_SCHEMA = JsonSchema(
    fields={
        "title": JsonField(required=True),
        "description": JsonField(),
        "startAt": JsonField(required=True),
        "endAt": JsonField(required=True),
        "eventType": JsonField(required=True),
        "locationType": JsonField(required=True),
        "patientId": JsonField(),
        "meetingUrl": JsonField(),
        "status": JsonField(),
        "timezone": JsonField(required=True),
        "recurrenceRule": JsonField(),
        "recurrenceUntil": JsonField(),
        "recurrenceExceptionDates": JsonField(),
    }
)

_PATCH_AGENDA_EVENT_SCHEMA = JsonSchema(
    fields={
        "title": JsonField(),
        "description": JsonField(),
        "startAt": JsonField(),
        "endAt": JsonField(),
        "eventType": JsonField(),
        "locationType": JsonField(),
        "patientId": JsonField(),
        "meetingUrl": JsonField(),
        "status": JsonField(),
        "timezone": JsonField(),
        "recurrenceRule": JsonField(),
        "recurrenceUntil": JsonField(),
        "recurrenceExceptionDates": JsonField(),
        "applyScope": JsonField(),
    }
)


def _to_bool(value: str | None, *, default: bool = False) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "y"}:
        return True
    if normalized in {"0", "false", "no", "n"}:
        return False
    raise ValueError("includeCancelled must be boolean")


def create_agenda_event_blueprint(*, agenda_event_service, deps):
    bp = Blueprint("agenda_events", __name__)
    d = deps

    @bp.get("/api/agenda/events")
    def get_agenda_events():
        org_id = d.extract_org_id()
        therapist_id = d.extract_user_sub()

        from_iso = request.args.get("from", "").strip()
        to_iso = request.args.get("to", "").strip()
        if not from_iso or not to_iso:
            raise ValueError("from and to query params are required")

        include_cancelled = _to_bool(request.args.get("includeCancelled"), default=False)
        events = agenda_event_service.list_events(
            org_id,
            therapist_id,
            start_at_iso=from_iso,
            end_at_iso=to_iso,
            include_cancelled=include_cancelled,
        )
        return jsonify(d.json_ready(events))

    @bp.get("/api/agenda/events/<event_id>")
    def get_agenda_event(event_id: str):
        org_id = d.extract_org_id()
        therapist_id = d.extract_user_sub()

        event = agenda_event_service.get_event(org_id, therapist_id, event_id)
        if not event:
            return d.json_error(404, "AGENDA_EVENT_NOT_FOUND", "agenda event not found")
        return jsonify(d.json_ready(event))

    @bp.post("/api/agenda/events")
    def create_agenda_event():
        org_id, role = d.extract_auth_context()
        therapist_id = d.extract_user_sub()
        d.require_write_role(role)

        payload = d.validate_json_schema(_CREATE_AGENDA_EVENT_SCHEMA)
        payload["title"] = d.require_string(payload, "title", max_length=200)
        payload["description"] = d.optional_string(payload, "description", max_length=2000) or ""
        payload["startAt"] = d.require_string(payload, "startAt", max_length=64)
        payload["endAt"] = d.require_string(payload, "endAt", max_length=64)
        payload["eventType"] = d.require_string(payload, "eventType", max_length=32)
        payload["locationType"] = d.require_string(payload, "locationType", max_length=32)
        payload["timezone"] = d.require_string(payload, "timezone", max_length=64)
        payload["patientId"] = d.optional_string(payload, "patientId", max_length=128)
        payload["meetingUrl"] = d.optional_string(payload, "meetingUrl", max_length=2048)
        payload["status"] = d.optional_string(payload, "status", max_length=32)
        payload["recurrenceRule"] = d.optional_string(payload, "recurrenceRule", max_length=512)
        payload["recurrenceUntil"] = d.optional_string(payload, "recurrenceUntil", max_length=64)
        payload["recurrenceExceptionDates"] = d.optional_string_list(payload, "recurrenceExceptionDates")

        event = agenda_event_service.create_event(
            org_id,
            therapist_id,
            created_by=therapist_id,
            payload=payload,
        )
        return jsonify(d.json_ready(event)), 201

    @bp.patch("/api/agenda/events/<event_id>")
    def patch_agenda_event(event_id: str):
        org_id, role = d.extract_auth_context()
        therapist_id = d.extract_user_sub()
        d.require_write_role(role)

        payload = d.validate_json_schema(_PATCH_AGENDA_EVENT_SCHEMA)
        apply_scope = d.optional_string(payload, "applyScope", max_length=16) or "single"

        if "title" in payload:
            payload["title"] = d.require_string(payload, "title", max_length=200)
        if "description" in payload:
            payload["description"] = d.optional_string(payload, "description", max_length=2000) or ""
        if "startAt" in payload:
            payload["startAt"] = d.require_string(payload, "startAt", max_length=64)
        if "endAt" in payload:
            payload["endAt"] = d.require_string(payload, "endAt", max_length=64)
        if "eventType" in payload:
            payload["eventType"] = d.require_string(payload, "eventType", max_length=32)
        if "locationType" in payload:
            payload["locationType"] = d.require_string(payload, "locationType", max_length=32)
        if "patientId" in payload:
            payload["patientId"] = d.optional_string(payload, "patientId", max_length=128)
        if "meetingUrl" in payload:
            payload["meetingUrl"] = d.optional_string(payload, "meetingUrl", max_length=2048)
        if "status" in payload:
            payload["status"] = d.optional_string(payload, "status", max_length=32)
        if "timezone" in payload:
            payload["timezone"] = d.require_string(payload, "timezone", max_length=64)
        if "recurrenceRule" in payload:
            payload["recurrenceRule"] = d.optional_string(payload, "recurrenceRule", max_length=512)
        if "recurrenceUntil" in payload:
            payload["recurrenceUntil"] = d.optional_string(payload, "recurrenceUntil", max_length=64)
        if "recurrenceExceptionDates" in payload:
            payload["recurrenceExceptionDates"] = d.optional_string_list(payload, "recurrenceExceptionDates")

        updated = agenda_event_service.patch_event(
            org_id,
            therapist_id,
            event_id,
            payload=payload,
            apply_scope=apply_scope,
        )
        if not updated:
            return d.json_error(404, "AGENDA_EVENT_NOT_FOUND", "agenda event not found")

        return jsonify(d.json_ready(updated))

    @bp.delete("/api/agenda/events/<event_id>")
    def delete_agenda_event(event_id: str):
        org_id, role = d.extract_auth_context()
        therapist_id = d.extract_user_sub()
        d.require_write_role(role)

        apply_scope = request.args.get("applyScope", "single").strip() or "single"
        result = agenda_event_service.delete_event(org_id, therapist_id, event_id, apply_scope=apply_scope)
        if not result:
            return d.json_error(404, "AGENDA_EVENT_NOT_FOUND", "agenda event not found")

        return jsonify(d.json_ready(result))

    return bp
