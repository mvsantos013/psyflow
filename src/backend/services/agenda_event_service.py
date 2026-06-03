from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from dateutil.rrule import rrulestr
from zoneinfo import ZoneInfo


class AgendaEventService:
    _EVENT_TYPES = {"session", "followup", "assessment", "planning", "admin"}
    _LOCATION_TYPES = {"remote", "inPerson"}
    _STATUSES = {"scheduled", "cancelled"}
    _APPLY_SCOPES = {"single", "following", "series"}

    def __init__(
        self,
        agenda_event_repository,
        *,
        now_iso,
        agenda_recurrence_rule_repository=None,
    ):
        self._agenda_event_repository = agenda_event_repository
        self._agenda_recurrence_rule_repository = agenda_recurrence_rule_repository
        self._now_iso = now_iso

    @staticmethod
    def _parse_iso_datetime(value: str, *, timezone_name: str) -> datetime:
        normalized = value.strip()
        if normalized.endswith("Z"):
            normalized = f"{normalized[:-1]}+00:00"
        try:
            dt = datetime.fromisoformat(normalized)
        except ValueError:
            raise ValueError("startAt/endAt must be ISO-8601 datetime") from None

        if dt.tzinfo is None:
            try:
                tz = ZoneInfo(timezone_name)
            except Exception:
                raise ValueError("timezone must be a valid IANA timezone") from None
            dt = dt.replace(tzinfo=tz)
        return dt.astimezone(timezone.utc)

    @staticmethod
    def _ensure_timezone(timezone_name: str) -> str:
        try:
            ZoneInfo(timezone_name)
        except Exception:
            raise ValueError("timezone must be a valid IANA timezone") from None
        return timezone_name

    @staticmethod
    def _iso_z(dt: datetime) -> str:
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    @staticmethod
    def _event_sk(event_id: str) -> str:
        return f"EVENT#{event_id}"

    @classmethod
    def _extract_id_from_sk(cls, sk: str) -> str:
        prefix = "EVENT#"
        if not sk.startswith(prefix):
            return sk
        return sk[len(prefix) :]

    @classmethod
    def _to_api_event(cls, item: dict) -> dict:
        event_id = cls._extract_id_from_sk(str(item.get("SK", "")))
        return {
            "id": item.get("eventId", event_id),
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "startAt": item.get("startAt", ""),
            "endAt": item.get("endAt", ""),
            "durationMinutes": int(item.get("durationMinutes", 0)),
            "eventType": item.get("eventType", "session"),
            "locationType": item.get("locationType", "remote"),
            "patientId": item.get("patientId"),
            "meetingUrl": item.get("meetingUrl"),
            "status": item.get("status", "scheduled"),
            "timezone": item.get("timezone", "UTC"),
            "recurrenceRuleId": item.get("recurrenceRuleId"),
            "occurrenceStartAt": item.get("occurrenceStartAt"),
            "createdAt": item.get("createdAt", ""),
            "updatedAt": item.get("updatedAt", ""),
            "createdBy": item.get("createdBy"),
        }

    @staticmethod
    def _validate_url(value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if not (cleaned.startswith("https://") or cleaned.startswith("http://")):
            raise ValueError("meetingUrl must start with http:// or https://")
        return cleaned

    @classmethod
    def _validate_apply_scope(cls, apply_scope: str) -> str:
        if apply_scope not in cls._APPLY_SCOPES:
            raise ValueError("applyScope must be one of: single, following, series")
        return apply_scope

    @classmethod
    def _ensure_event_type(cls, event_type: str) -> str:
        if event_type not in cls._EVENT_TYPES:
            allowed = ", ".join(sorted(cls._EVENT_TYPES))
            raise ValueError(f"eventType must be one of: {allowed}")
        return event_type

    @classmethod
    def _ensure_location_type(cls, location_type: str) -> str:
        if location_type not in cls._LOCATION_TYPES:
            raise ValueError("locationType must be one of: remote, inPerson")
        return location_type

    @classmethod
    def _ensure_status(cls, status: str) -> str:
        if status not in cls._STATUSES:
            raise ValueError("status must be one of: scheduled, cancelled")
        return status

    @classmethod
    def _normalize_status(cls, value: str | None, *, default: str = "scheduled") -> str:
        if value is None:
            return cls._ensure_status(default)
        normalized = str(value).strip()
        if not normalized:
            return cls._ensure_status(default)
        return cls._ensure_status(normalized)

    @staticmethod
    def _duration_minutes(start_at: datetime, end_at: datetime) -> int:
        delta = end_at - start_at
        minutes = int(delta.total_seconds() / 60)
        if minutes < 5:
            raise ValueError("duration must be at least 5 minutes")
        if minutes > 720:
            raise ValueError("duration must be <= 720 minutes")
        return minutes

    @staticmethod
    def _build_overlap_warnings(items: list[dict], *, start_at: datetime, end_at: datetime) -> list[dict]:
        warnings: list[dict] = []
        for item in items:
            if item.get("status") == "cancelled":
                continue

            current_start = datetime.fromisoformat(str(item.get("startAt", "").replace("Z", "+00:00")))
            current_end = datetime.fromisoformat(str(item.get("endAt", "").replace("Z", "+00:00")))

            if max(current_start, start_at) < min(current_end, end_at):
                warnings.append(
                    {
                        "eventId": item.get("eventId"),
                        "title": item.get("title", ""),
                        "startAt": item.get("startAt", ""),
                        "endAt": item.get("endAt", ""),
                    }
                )
        return warnings

    @staticmethod
    def _virtual_event_id(recurrence_rule_id: str, occurrence_start_at_iso: str) -> str:
        return f"R#{recurrence_rule_id}#{occurrence_start_at_iso}"

    @staticmethod
    def _parse_virtual_event_id(event_id: str) -> tuple[str, str] | None:
        if not event_id.startswith("R#"):
            return None
        rest = event_id[2:]
        split_idx = rest.find("#")
        if split_idx <= 0:
            return None
        recurrence_rule_id = rest[:split_idx]
        occurrence_start_at = rest[split_idx + 1 :]
        if not recurrence_rule_id or not occurrence_start_at:
            return None
        return recurrence_rule_id, occurrence_start_at

    @staticmethod
    def _exception_dates(rule_item: dict) -> set[str]:
        values = rule_item.get("recurrenceExceptionDates")
        if not isinstance(values, list):
            return set()
        return {str(value).strip() for value in values if str(value).strip()}

    def _append_exception_date(self, *, org_id: str, therapist_id: str, rule_item: dict, occurrence_start_at: str):
        if not self._agenda_recurrence_rule_repository:
            raise ValueError("recurrence storage is not configured")

        recurrence_rule_id = str(rule_item.get("recurrenceRuleId") or "")
        if not recurrence_rule_id:
            raise ValueError("recurrence rule id is missing")

        existing = list(self._exception_dates(rule_item))
        if occurrence_start_at not in existing:
            existing.append(occurrence_start_at)
            existing.sort()

        self._agenda_recurrence_rule_repository.update_fields(
            org_id,
            therapist_id,
            recurrence_rule_id,
            {
                "recurrenceExceptionDates": existing,
                "updatedAt": self._now_iso(),
            },
        )

    def _rule_item_to_virtual_event(self, *, rule_item: dict, occurrence_start_at: datetime) -> dict:
        start_at_iso = self._iso_z(occurrence_start_at)
        duration_minutes = int(rule_item.get("durationMinutes") or 0)
        end_at_iso = self._iso_z(occurrence_start_at + timedelta(minutes=duration_minutes))
        recurrence_rule_id = str(rule_item.get("recurrenceRuleId") or "")
        return {
            "id": self._virtual_event_id(recurrence_rule_id, start_at_iso),
            "title": str(rule_item.get("templateTitle") or ""),
            "description": str(rule_item.get("templateDescription") or ""),
            "startAt": start_at_iso,
            "endAt": end_at_iso,
            "durationMinutes": duration_minutes,
            "eventType": str(rule_item.get("templateEventType") or "session"),
            "locationType": str(rule_item.get("templateLocationType") or "remote"),
            "patientId": rule_item.get("templatePatientId"),
            "meetingUrl": rule_item.get("templateMeetingUrl"),
            "status": str(rule_item.get("templateStatus") or "scheduled"),
            "timezone": str(rule_item.get("timezone") or "UTC"),
            "recurrenceRuleId": recurrence_rule_id,
            "occurrenceStartAt": start_at_iso,
            "createdAt": str(rule_item.get("createdAt") or ""),
            "updatedAt": str(rule_item.get("updatedAt") or ""),
            "createdBy": rule_item.get("createdBy"),
        }

    def _build_event_item(
        self,
        *,
        org_id: str,
        therapist_id: str,
        created_by: str,
        payload: dict,
        start_at: datetime,
        end_at: datetime,
        timezone_name: str,
        recurrence_rule_id: str | None,
        occurrence_start_at: str | None,
    ) -> dict:
        event_id = str(uuid.uuid4())
        now = self._now_iso()
        item = {
            "PK": f"ORG#{org_id}#THERAPIST#{therapist_id}",
            "SK": self._event_sk(event_id),
            "eventId": event_id,
            "orgId": org_id,
            "therapistId": therapist_id,
            "title": str(payload.get("title", "")).strip(),
            "description": str(payload.get("description", "")).strip(),
            "startAt": self._iso_z(start_at),
            "endAt": self._iso_z(end_at),
            "durationMinutes": self._duration_minutes(start_at, end_at),
            "eventType": self._ensure_event_type(str(payload.get("eventType", "session"))),
            "locationType": self._ensure_location_type(str(payload.get("locationType", "remote"))),
            "patientId": payload.get("patientId"),
            "meetingUrl": self._validate_url(payload.get("meetingUrl")),
            "status": self._normalize_status(payload.get("status"), default="scheduled"),
            "timezone": timezone_name,
            "createdAt": now,
            "updatedAt": now,
            "createdBy": created_by,
            "GSI1PK": f"ORG#{org_id}#THERAPIST#{therapist_id}",
            "GSI1SK": f"START#{self._iso_z(start_at)}#EVENT#{event_id}",
        }

        if recurrence_rule_id:
            item["recurrenceRuleId"] = recurrence_rule_id
            item["GSI3PK"] = f"ORG#{org_id}#THERAPIST#{therapist_id}#RULE#{recurrence_rule_id}"
            item["GSI3SK"] = f"START#{self._iso_z(start_at)}#EVENT#{event_id}"
        if occurrence_start_at:
            item["occurrenceStartAt"] = occurrence_start_at

        return item

    def _build_recurrence_rule_item(
        self,
        *,
        org_id: str,
        therapist_id: str,
        created_by: str,
        payload: dict,
        timezone_name: str,
        start_at: datetime,
        end_at: datetime,
    ) -> dict:
        if not self._agenda_recurrence_rule_repository:
            raise ValueError("recurrence storage is not configured")

        recurrence_rule = str(payload.get("recurrenceRule") or "").strip()
        if not recurrence_rule:
            raise ValueError("recurrenceRule is required for recurring events")

        recurrence_until = payload.get("recurrenceUntil")
        recurrence_until_iso: str | None = None
        if recurrence_until:
            recurrence_until_dt = self._parse_iso_datetime(str(recurrence_until), timezone_name=timezone_name)
            if recurrence_until_dt < start_at:
                raise ValueError("recurrenceUntil must be >= startAt")
            recurrence_until_iso = self._iso_z(recurrence_until_dt)

        recurrence_exception_dates = payload.get("recurrenceExceptionDates")
        if not isinstance(recurrence_exception_dates, list):
            recurrence_exception_dates = []

        rule_id = str(uuid.uuid4())
        now = self._now_iso()
        item = {
            "PK": f"ORG#{org_id}#THERAPIST#{therapist_id}",
            "SK": f"RULE#{rule_id}",
            "recurrenceRuleId": rule_id,
            "orgId": org_id,
            "therapistId": therapist_id,
            "rrule": recurrence_rule,
            "timezone": timezone_name,
            "seriesStartAt": self._iso_z(start_at),
            "seriesEndAt": self._iso_z(end_at),
            "durationMinutes": self._duration_minutes(start_at, end_at),
            "templateTitle": str(payload.get("title", "")).strip(),
            "templateDescription": str(payload.get("description", "")).strip(),
            "templateEventType": self._ensure_event_type(str(payload.get("eventType", "session"))),
            "templateLocationType": self._ensure_location_type(str(payload.get("locationType", "remote"))),
            "templatePatientId": payload.get("patientId"),
            "templateMeetingUrl": self._validate_url(payload.get("meetingUrl")),
            "templateStatus": self._normalize_status(payload.get("status"), default="scheduled"),
            "recurrenceUntil": recurrence_until_iso,
            "recurrenceExceptionDates": recurrence_exception_dates,
            "active": True,
            "createdAt": now,
            "updatedAt": now,
            "createdBy": created_by,
        }
        return item

    def _filter_exception_dates(self, *, values: set[str], cutoff_iso: str, keep_future: bool) -> list[str]:
        filtered: list[str] = []
        for value in values:
            if keep_future and value >= cutoff_iso:
                filtered.append(value)
            if not keep_future and value < cutoff_iso:
                filtered.append(value)
        filtered.sort()
        return filtered

    def _split_rule_for_following(
        self,
        *,
        org_id: str,
        therapist_id: str,
        created_by: str,
        rule_item: dict,
        occurrence_start_at_iso: str,
        payload: dict,
    ) -> tuple[dict, dict]:
        if not self._agenda_recurrence_rule_repository:
            raise ValueError("recurrence storage is not configured")

        pivot_start = self._parse_iso_datetime(occurrence_start_at_iso, timezone_name="UTC")
        old_until_dt = pivot_start - timedelta(seconds=1)
        old_until_iso = self._iso_z(old_until_dt)

        existing_exceptions = self._exception_dates(rule_item)
        old_rule_exceptions = self._filter_exception_dates(
            values=existing_exceptions,
            cutoff_iso=occurrence_start_at_iso,
            keep_future=False,
        )
        new_rule_exceptions = self._filter_exception_dates(
            values=existing_exceptions,
            cutoff_iso=occurrence_start_at_iso,
            keep_future=True,
        )

        recurrence_until_payload = payload.get("recurrenceUntil")
        recurrence_until_value = (
            str(recurrence_until_payload).strip() if recurrence_until_payload is not None else str(rule_item.get("recurrenceUntil") or "")
        )
        recurrence_until_iso: str | None = recurrence_until_value or None

        timezone_name = self._ensure_timezone(
            str(payload.get("timezone") if payload.get("timezone") is not None else rule_item.get("timezone") or "UTC")
        )

        start_at = (
            self._parse_iso_datetime(str(payload.get("startAt")), timezone_name=timezone_name)
            if payload.get("startAt") is not None
            else pivot_start
        )

        if payload.get("endAt") is not None:
            end_at = self._parse_iso_datetime(str(payload.get("endAt")), timezone_name=timezone_name)
        elif payload.get("startAt") is not None:
            duration_minutes = int(rule_item.get("durationMinutes") or 0)
            end_at = start_at + timedelta(minutes=duration_minutes)
        else:
            duration_minutes = int(rule_item.get("durationMinutes") or 0)
            end_at = pivot_start + timedelta(minutes=duration_minutes)

        if end_at <= start_at:
            raise ValueError("endAt must be greater than startAt")

        old_rule_id = str(rule_item.get("recurrenceRuleId") or "")
        old_rule = self._agenda_recurrence_rule_repository.update_fields(
            org_id,
            therapist_id,
            old_rule_id,
            {
                "recurrenceUntil": old_until_iso,
                "recurrenceExceptionDates": old_rule_exceptions,
                "updatedAt": self._now_iso(),
            },
        )

        new_rule_id = str(uuid.uuid4())
        now = self._now_iso()
        new_rule = {
            "PK": f"ORG#{org_id}#THERAPIST#{therapist_id}",
            "SK": f"RULE#{new_rule_id}",
            "recurrenceRuleId": new_rule_id,
            "orgId": org_id,
            "therapistId": therapist_id,
            "rrule": (
                str(payload.get("recurrenceRule") or "").strip()
                if payload.get("recurrenceRule") is not None
                else str(rule_item.get("rrule") or "")
            ),
            "timezone": timezone_name,
            "seriesStartAt": self._iso_z(start_at),
            "seriesEndAt": self._iso_z(end_at),
            "durationMinutes": self._duration_minutes(start_at, end_at),
            "templateTitle": (
                str(payload.get("title") or "").strip()
                if payload.get("title") is not None
                else str(rule_item.get("templateTitle") or "")
            ),
            "templateDescription": (
                str(payload.get("description") or "").strip()
                if payload.get("description") is not None
                else str(rule_item.get("templateDescription") or "")
            ),
            "templateEventType": self._ensure_event_type(
                str(payload.get("eventType") if payload.get("eventType") is not None else rule_item.get("templateEventType") or "session")
            ),
            "templateLocationType": self._ensure_location_type(
                str(
                    payload.get("locationType")
                    if payload.get("locationType") is not None
                    else rule_item.get("templateLocationType")
                    or "remote"
                )
            ),
            "templatePatientId": payload.get("patientId") if "patientId" in payload else rule_item.get("templatePatientId"),
            "templateMeetingUrl": self._validate_url(
                payload.get("meetingUrl") if "meetingUrl" in payload else rule_item.get("templateMeetingUrl")
            ),
            "templateStatus": self._normalize_status(
                payload.get("status") if payload.get("status") is not None else rule_item.get("templateStatus"),
                default="scheduled",
            ),
            "recurrenceUntil": recurrence_until_iso,
            "recurrenceExceptionDates": new_rule_exceptions,
            "active": True,
            "createdAt": now,
            "updatedAt": now,
            "createdBy": created_by,
        }
        self._agenda_recurrence_rule_repository.put(new_rule)

        detached_rows = self._agenda_event_repository.list_by_recurrence_rule(org_id, therapist_id, old_rule_id)
        moved_count = 0
        for row in detached_rows:
            row_occurrence = str(row.get("occurrenceStartAt") or "")
            if row_occurrence and row_occurrence >= occurrence_start_at_iso:
                row_event_id = str(row.get("eventId") or self._extract_id_from_sk(str(row.get("SK", ""))))
                updates = {
                    "recurrenceRuleId": new_rule_id,
                    "GSI3PK": f"ORG#{org_id}#THERAPIST#{therapist_id}#RULE#{new_rule_id}",
                    "updatedAt": self._now_iso(),
                }
                self._agenda_event_repository.update_fields(org_id, therapist_id, row_event_id, updates)
                moved_count += 1

        _ = moved_count
        return old_rule, new_rule

    def _build_overlap_warnings_for_payload(self, *, org_id: str, therapist_id: str, start_at: datetime, end_at: datetime) -> list[dict]:
        overlap_candidates = self._agenda_event_repository.list_by_therapist_range(
            org_id,
            therapist_id,
            start_at_iso=self._iso_z(start_at - timedelta(days=1)),
            end_at_iso=self._iso_z(end_at + timedelta(days=1)),
        )
        return self._build_overlap_warnings(overlap_candidates, start_at=start_at, end_at=end_at)

    def _expand_rule_in_window(self, *, rule_item: dict, start_at: datetime, end_at: datetime) -> list[dict]:
        recurrence_rule = str(rule_item.get("rrule") or "").strip()
        if not recurrence_rule:
            return []

        series_start_at = self._parse_iso_datetime(str(rule_item.get("seriesStartAt") or ""), timezone_name="UTC")
        recurrence_until_iso = str(rule_item.get("recurrenceUntil") or "").strip() or None
        exception_dates = self._exception_dates(rule_item)

        try:
            rule = rrulestr(recurrence_rule, dtstart=series_start_at)
        except Exception:
            return []

        until_dt: datetime | None = None
        if recurrence_until_iso:
            until_dt = self._parse_iso_datetime(recurrence_until_iso, timezone_name="UTC")

        starts = rule.between(start_at, end_at, inc=True)
        events: list[dict] = []
        for current_start in starts:
            if current_start.tzinfo is None:
                current_start = current_start.replace(tzinfo=timezone.utc)
            current_start = current_start.astimezone(timezone.utc)
            if until_dt and current_start > until_dt:
                continue
            current_start_iso = self._iso_z(current_start)
            if current_start_iso in exception_dates:
                continue
            events.append(self._rule_item_to_virtual_event(rule_item=rule_item, occurrence_start_at=current_start))
        return events

    def _get_rule_by_id(self, org_id: str, therapist_id: str, recurrence_rule_id: str) -> dict | None:
        if not self._agenda_recurrence_rule_repository:
            return None
        return self._agenda_recurrence_rule_repository.get_by_id(org_id, therapist_id, recurrence_rule_id)

    def list_events(
        self,
        org_id: str,
        therapist_id: str,
        *,
        start_at_iso: str,
        end_at_iso: str,
        include_cancelled: bool = False,
    ) -> list[dict]:
        start_at = self._parse_iso_datetime(start_at_iso, timezone_name="UTC")
        end_at = self._parse_iso_datetime(end_at_iso, timezone_name="UTC")
        if end_at <= start_at:
            raise ValueError("to must be greater than from")

        stored_items = self._agenda_event_repository.list_by_therapist_range(
            org_id,
            therapist_id,
            start_at_iso=self._iso_z(start_at),
            end_at_iso=self._iso_z(end_at),
        )
        stored_events = [self._to_api_event(item) for item in stored_items]

        detached_keys: set[tuple[str, str]] = set()
        for event in stored_events:
            recurrence_rule_id = str(event.get("recurrenceRuleId") or "")
            occurrence_start_at = str(event.get("occurrenceStartAt") or "")
            if recurrence_rule_id and occurrence_start_at:
                detached_keys.add((recurrence_rule_id, occurrence_start_at))

        recurring_events: list[dict] = []
        if self._agenda_recurrence_rule_repository:
            rule_items = self._agenda_recurrence_rule_repository.list_by_therapist(org_id, therapist_id)
            for rule_item in rule_items:
                if not bool(rule_item.get("active", True)):
                    continue
                expanded = self._expand_rule_in_window(rule_item=rule_item, start_at=start_at, end_at=end_at)
                for event in expanded:
                    key = (str(event.get("recurrenceRuleId") or ""), str(event.get("occurrenceStartAt") or ""))
                    if key in detached_keys:
                        continue
                    recurring_events.append(event)

        merged = [*stored_events, *recurring_events]
        if not include_cancelled:
            merged = [event for event in merged if event.get("status") != "cancelled"]

        merged.sort(key=lambda event: (str(event.get("startAt") or ""), str(event.get("id") or "")))
        return merged

    def get_event(self, org_id: str, therapist_id: str, event_id: str) -> dict | None:
        stored = self._agenda_event_repository.get_by_id(org_id, therapist_id, event_id)
        if stored:
            return self._to_api_event(stored)

        parsed_virtual = self._parse_virtual_event_id(event_id)
        if not parsed_virtual:
            return None

        recurrence_rule_id, occurrence_start_at_iso = parsed_virtual
        rule_item = self._get_rule_by_id(org_id, therapist_id, recurrence_rule_id)
        if not rule_item or not bool(rule_item.get("active", True)):
            return None

        if occurrence_start_at_iso in self._exception_dates(rule_item):
            return None

        occurrence_start_at = self._parse_iso_datetime(occurrence_start_at_iso, timezone_name="UTC")
        return self._rule_item_to_virtual_event(rule_item=rule_item, occurrence_start_at=occurrence_start_at)

    def create_event(self, org_id: str, therapist_id: str, *, created_by: str, payload: dict) -> dict:
        timezone_name = self._ensure_timezone(str(payload.get("timezone", "UTC")))
        start_at = self._parse_iso_datetime(str(payload.get("startAt", "")), timezone_name=timezone_name)
        end_at = self._parse_iso_datetime(str(payload.get("endAt", "")), timezone_name=timezone_name)
        if end_at <= start_at:
            raise ValueError("endAt must be greater than startAt")

        payload["eventType"] = self._ensure_event_type(str(payload.get("eventType", "session")))
        payload["locationType"] = self._ensure_location_type(str(payload.get("locationType", "remote")))
        payload["status"] = self._normalize_status(payload.get("status"), default="scheduled")
        payload["meetingUrl"] = self._validate_url(payload.get("meetingUrl"))

        warnings = self._build_overlap_warnings_for_payload(
            org_id=org_id,
            therapist_id=therapist_id,
            start_at=start_at,
            end_at=end_at,
        )

        recurrence_rule = str(payload.get("recurrenceRule") or "").strip()
        if not recurrence_rule:
            item = self._build_event_item(
                org_id=org_id,
                therapist_id=therapist_id,
                created_by=created_by,
                payload=payload,
                start_at=start_at,
                end_at=end_at,
                timezone_name=timezone_name,
                recurrence_rule_id=None,
                occurrence_start_at=None,
            )
            self._agenda_event_repository.put(item)
            event = self._to_api_event(item)
            event["warnings"] = warnings
            return event

        rule_item = self._build_recurrence_rule_item(
            org_id=org_id,
            therapist_id=therapist_id,
            created_by=created_by,
            payload=payload,
            timezone_name=timezone_name,
            start_at=start_at,
            end_at=end_at,
        )
        self._agenda_recurrence_rule_repository.put(rule_item)
        first_virtual = self._rule_item_to_virtual_event(rule_item=rule_item, occurrence_start_at=start_at)
        first_virtual["warnings"] = warnings
        return first_virtual

    def _create_detached_override(
        self,
        *,
        org_id: str,
        therapist_id: str,
        created_by: str,
        rule_item: dict,
        occurrence_start_at_iso: str,
        payload: dict,
    ) -> dict:
        timezone_name = str(payload.get("timezone") or rule_item.get("timezone") or "UTC")
        timezone_name = self._ensure_timezone(timezone_name)

        base_start = self._parse_iso_datetime(occurrence_start_at_iso, timezone_name="UTC")
        duration_minutes = int(rule_item.get("durationMinutes") or 0)
        base_end = base_start + timedelta(minutes=duration_minutes)

        start_at = (
            self._parse_iso_datetime(str(payload.get("startAt")), timezone_name=timezone_name)
            if payload.get("startAt") is not None
            else base_start
        )
        end_at = (
            self._parse_iso_datetime(str(payload.get("endAt")), timezone_name=timezone_name)
            if payload.get("endAt") is not None
            else base_end
        )
        if end_at <= start_at:
            raise ValueError("endAt must be greater than startAt")

        merged_payload = {
            "title": payload.get("title") if payload.get("title") is not None else rule_item.get("templateTitle"),
            "description": (
                payload.get("description")
                if payload.get("description") is not None
                else rule_item.get("templateDescription")
            ),
            "eventType": payload.get("eventType") if payload.get("eventType") is not None else rule_item.get("templateEventType"),
            "locationType": (
                payload.get("locationType")
                if payload.get("locationType") is not None
                else rule_item.get("templateLocationType")
            ),
            "patientId": payload.get("patientId") if "patientId" in payload else rule_item.get("templatePatientId"),
            "meetingUrl": payload.get("meetingUrl") if "meetingUrl" in payload else rule_item.get("templateMeetingUrl"),
            "status": payload.get("status") if payload.get("status") is not None else rule_item.get("templateStatus"),
        }

        recurrence_rule_id = str(rule_item.get("recurrenceRuleId") or "")
        override_item = self._build_event_item(
            org_id=org_id,
            therapist_id=therapist_id,
            created_by=created_by,
            payload=merged_payload,
            start_at=start_at,
            end_at=end_at,
            timezone_name=timezone_name,
            recurrence_rule_id=recurrence_rule_id,
            occurrence_start_at=occurrence_start_at_iso,
        )
        self._agenda_event_repository.put(override_item)
        self._append_exception_date(
            org_id=org_id,
            therapist_id=therapist_id,
            rule_item=rule_item,
            occurrence_start_at=occurrence_start_at_iso,
        )
        return self._to_api_event(override_item)

    def patch_event(
        self,
        org_id: str,
        therapist_id: str,
        event_id: str,
        *,
        payload: dict,
        apply_scope: str,
    ) -> dict | None:
        apply_scope = self._validate_apply_scope(apply_scope)

        stored = self._agenda_event_repository.get_by_id(org_id, therapist_id, event_id)
        if stored:
            event_id_target = str(stored.get("eventId") or self._extract_id_from_sk(str(stored.get("SK", ""))))
            timezone_name = str(payload.get("timezone") or stored.get("timezone") or "UTC")
            timezone_name = self._ensure_timezone(timezone_name)

            start_value = str(payload.get("startAt") or stored.get("startAt"))
            end_value = str(payload.get("endAt") or stored.get("endAt"))
            start_at = self._parse_iso_datetime(start_value, timezone_name=timezone_name)
            end_at = self._parse_iso_datetime(end_value, timezone_name=timezone_name)
            if end_at <= start_at:
                raise ValueError("endAt must be greater than startAt")

            updates = {
                "title": str(payload.get("title") if payload.get("title") is not None else stored.get("title") or "").strip(),
                "description": str(
                    payload.get("description")
                    if payload.get("description") is not None
                    else stored.get("description")
                    or ""
                ).strip(),
                "startAt": self._iso_z(start_at),
                "endAt": self._iso_z(end_at),
                "durationMinutes": self._duration_minutes(start_at, end_at),
                "eventType": self._ensure_event_type(
                    str(payload.get("eventType") if payload.get("eventType") is not None else stored.get("eventType") or "session")
                ),
                "locationType": self._ensure_location_type(
                    str(
                        payload.get("locationType")
                        if payload.get("locationType") is not None
                        else stored.get("locationType")
                        or "remote"
                    )
                ),
                "patientId": payload.get("patientId") if "patientId" in payload else stored.get("patientId"),
                "meetingUrl": self._validate_url(payload.get("meetingUrl") if "meetingUrl" in payload else stored.get("meetingUrl")),
                "status": self._normalize_status(
                    payload.get("status") if payload.get("status") is not None else stored.get("status"),
                    default="scheduled",
                ),
                "timezone": timezone_name,
                "updatedAt": self._now_iso(),
                "GSI1PK": f"ORG#{org_id}#THERAPIST#{therapist_id}",
                "GSI1SK": f"START#{self._iso_z(start_at)}#EVENT#{event_id_target}",
            }

            if stored.get("recurrenceRuleId"):
                updates["GSI3PK"] = f"ORG#{org_id}#THERAPIST#{therapist_id}#RULE#{stored.get('recurrenceRuleId')}"
                updates["GSI3SK"] = f"START#{self._iso_z(start_at)}#EVENT#{event_id_target}"

            updated = self._agenda_event_repository.update_fields(org_id, therapist_id, event_id_target, updates)
            result = self._to_api_event(updated)
            result["applyScope"] = apply_scope
            result["affectedCount"] = 1
            return result

        parsed_virtual = self._parse_virtual_event_id(event_id)
        if not parsed_virtual:
            return None

        recurrence_rule_id, occurrence_start_at_iso = parsed_virtual
        rule_item = self._get_rule_by_id(org_id, therapist_id, recurrence_rule_id)
        if not rule_item:
            return None

        if apply_scope == "following":
            _, new_rule = self._split_rule_for_following(
                org_id=org_id,
                therapist_id=therapist_id,
                created_by=str(rule_item.get("createdBy") or therapist_id),
                rule_item=rule_item,
                occurrence_start_at_iso=occurrence_start_at_iso,
                payload=payload,
            )
            representative_start = self._parse_iso_datetime(str(new_rule.get("seriesStartAt") or occurrence_start_at_iso), timezone_name="UTC")
            result = self._rule_item_to_virtual_event(rule_item=new_rule, occurrence_start_at=representative_start)
            result["applyScope"] = apply_scope
            result["affectedCount"] = 1
            return result

        if apply_scope == "series":
            if not self._agenda_recurrence_rule_repository:
                raise ValueError("recurrence storage is not configured")
            updates: dict = {"updatedAt": self._now_iso()}
            if payload.get("title") is not None:
                updates["templateTitle"] = str(payload.get("title") or "").strip()
            if payload.get("description") is not None:
                updates["templateDescription"] = str(payload.get("description") or "").strip()
            if payload.get("eventType") is not None:
                updates["templateEventType"] = self._ensure_event_type(str(payload.get("eventType") or "session"))
            if payload.get("locationType") is not None:
                updates["templateLocationType"] = self._ensure_location_type(str(payload.get("locationType") or "remote"))
            if "patientId" in payload:
                updates["templatePatientId"] = payload.get("patientId")
            if "meetingUrl" in payload:
                updates["templateMeetingUrl"] = self._validate_url(payload.get("meetingUrl"))
            if payload.get("status") is not None:
                updates["templateStatus"] = self._ensure_status(str(payload.get("status") or "scheduled"))
            if payload.get("recurrenceRule") is not None:
                updates["rrule"] = str(payload.get("recurrenceRule") or "").strip()
            if payload.get("recurrenceUntil") is not None:
                value = str(payload.get("recurrenceUntil") or "").strip()
                updates["recurrenceUntil"] = value or None
            if payload.get("recurrenceExceptionDates") is not None:
                value = payload.get("recurrenceExceptionDates")
                if not isinstance(value, list):
                    raise ValueError("recurrenceExceptionDates must be a list")
                updates["recurrenceExceptionDates"] = [str(item).strip() for item in value if str(item).strip()]
            if payload.get("timezone") is not None:
                updates["timezone"] = self._ensure_timezone(str(payload.get("timezone") or "UTC"))

            updated_rule = self._agenda_recurrence_rule_repository.update_fields(
                org_id,
                therapist_id,
                recurrence_rule_id,
                updates,
            )
            occurrence_start_at = self._parse_iso_datetime(occurrence_start_at_iso, timezone_name="UTC")
            result = self._rule_item_to_virtual_event(rule_item=updated_rule, occurrence_start_at=occurrence_start_at)
            result["applyScope"] = apply_scope
            result["affectedCount"] = 1
            return result

        updated_event = self._create_detached_override(
            org_id=org_id,
            therapist_id=therapist_id,
            created_by=str(rule_item.get("createdBy") or therapist_id),
            rule_item=rule_item,
            occurrence_start_at_iso=occurrence_start_at_iso,
            payload=payload,
        )
        updated_event["applyScope"] = apply_scope
        updated_event["affectedCount"] = 1
        return updated_event

    def delete_event(self, org_id: str, therapist_id: str, event_id: str, *, apply_scope: str) -> dict | None:
        apply_scope = self._validate_apply_scope(apply_scope)

        stored = self._agenda_event_repository.get_by_id(org_id, therapist_id, event_id)
        if stored:
            deleted = self._agenda_event_repository.delete_by_id(org_id, therapist_id, str(stored.get("eventId") or ""))
            return {
                "ok": bool(deleted),
                "eventId": event_id,
                "applyScope": apply_scope,
                "deletedCount": 1 if deleted else 0,
            }

        parsed_virtual = self._parse_virtual_event_id(event_id)
        if not parsed_virtual:
            return None

        recurrence_rule_id, occurrence_start_at_iso = parsed_virtual
        rule_item = self._get_rule_by_id(org_id, therapist_id, recurrence_rule_id)
        if not rule_item:
            return None

        if apply_scope == "following":
            self._agenda_recurrence_rule_repository.update_fields(
                org_id,
                therapist_id,
                recurrence_rule_id,
                {
                    "recurrenceUntil": self._iso_z(
                        self._parse_iso_datetime(occurrence_start_at_iso, timezone_name="UTC") - timedelta(seconds=1)
                    ),
                    "recurrenceExceptionDates": self._filter_exception_dates(
                        values=self._exception_dates(rule_item),
                        cutoff_iso=occurrence_start_at_iso,
                        keep_future=False,
                    ),
                    "updatedAt": self._now_iso(),
                },
            )

            detached_rows = self._agenda_event_repository.list_by_recurrence_rule(org_id, therapist_id, recurrence_rule_id)
            deleted_count = 1
            for row in detached_rows:
                row_occurrence = str(row.get("occurrenceStartAt") or "")
                if row_occurrence and row_occurrence >= occurrence_start_at_iso:
                    row_event_id = str(row.get("eventId") or self._extract_id_from_sk(str(row.get("SK", ""))))
                    if self._agenda_event_repository.delete_by_id(org_id, therapist_id, row_event_id):
                        deleted_count += 1
            return {
                "ok": True,
                "eventId": event_id,
                "applyScope": apply_scope,
                "deletedCount": deleted_count,
            }

        if apply_scope == "series":
            if not self._agenda_recurrence_rule_repository:
                raise ValueError("recurrence storage is not configured")
            deleted_count = 0
            if self._agenda_recurrence_rule_repository.delete_by_id(org_id, therapist_id, recurrence_rule_id):
                deleted_count += 1

            detached_rows = self._agenda_event_repository.list_by_recurrence_rule(org_id, therapist_id, recurrence_rule_id)
            for row in detached_rows:
                row_event_id = str(row.get("eventId") or self._extract_id_from_sk(str(row.get("SK", ""))))
                if self._agenda_event_repository.delete_by_id(org_id, therapist_id, row_event_id):
                    deleted_count += 1

            return {
                "ok": deleted_count > 0,
                "eventId": event_id,
                "applyScope": apply_scope,
                "deletedCount": deleted_count,
            }

        self._append_exception_date(
            org_id=org_id,
            therapist_id=therapist_id,
            rule_item=rule_item,
            occurrence_start_at=occurrence_start_at_iso,
        )
        return {
            "ok": True,
            "eventId": event_id,
            "applyScope": apply_scope,
            "deletedCount": 1,
        }
