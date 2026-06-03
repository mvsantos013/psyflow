from __future__ import annotations

from services.agenda_event_service import AgendaEventService


class FakeAgendaEventRepository:
    def __init__(self):
        self._items: dict[tuple[str, str, str], dict] = {}

    def _key(self, org_id: str, therapist_id: str, event_id: str) -> tuple[str, str, str]:
        return org_id, therapist_id, event_id

    def put(self, item: dict):
        event_id = str(item["eventId"])
        self._items[(item["orgId"], item["therapistId"], event_id)] = dict(item)

    def get_by_id(self, org_id: str, therapist_id: str, event_id: str):
        return self._items.get(self._key(org_id, therapist_id, event_id))

    def list_by_therapist_range(self, org_id: str, therapist_id: str, *, start_at_iso: str, end_at_iso: str):
        items = [
            item
            for (item_org, item_therapist, _event_id), item in self._items.items()
            if item_org == org_id and item_therapist == therapist_id
        ]
        return [
            item
            for item in items
            if start_at_iso <= str(item.get("startAt", "")) <= end_at_iso
        ]

    def list_by_recurrence_rule(self, org_id: str, therapist_id: str, recurrence_rule_id: str):
        return [
            item
            for (item_org, item_therapist, _event_id), item in self._items.items()
            if item_org == org_id
            and item_therapist == therapist_id
            and item.get("recurrenceRuleId") == recurrence_rule_id
        ]

    def update_fields(self, org_id: str, therapist_id: str, event_id: str, fields: dict):
        key = self._key(org_id, therapist_id, event_id)
        current = dict(self._items[key])
        current.update(fields)
        self._items[key] = current
        return current

    def delete_by_id(self, org_id: str, therapist_id: str, event_id: str):
        key = self._key(org_id, therapist_id, event_id)
        return self._items.pop(key, None) is not None


class FakeAgendaRecurrenceRuleRepository:
    def __init__(self):
        self._items: dict[tuple[str, str, str], dict] = {}

    def _key(self, org_id: str, therapist_id: str, recurrence_rule_id: str) -> tuple[str, str, str]:
        return org_id, therapist_id, recurrence_rule_id

    def put(self, item: dict):
        recurrence_rule_id = str(item["recurrenceRuleId"])
        self._items[(item["orgId"], item["therapistId"], recurrence_rule_id)] = dict(item)

    def get_by_id(self, org_id: str, therapist_id: str, recurrence_rule_id: str):
        return self._items.get(self._key(org_id, therapist_id, recurrence_rule_id))

    def list_by_therapist(self, org_id: str, therapist_id: str):
        return [
            item
            for (item_org, item_therapist, _rule_id), item in self._items.items()
            if item_org == org_id and item_therapist == therapist_id
        ]

    def update_fields(self, org_id: str, therapist_id: str, recurrence_rule_id: str, fields: dict):
        key = self._key(org_id, therapist_id, recurrence_rule_id)
        current = dict(self._items[key])
        current.update(fields)
        self._items[key] = current
        return current

    def delete_by_id(self, org_id: str, therapist_id: str, recurrence_rule_id: str):
        return self._items.pop(self._key(org_id, therapist_id, recurrence_rule_id), None) is not None


def _build_service() -> AgendaEventService:
    repo = FakeAgendaEventRepository()
    recurrence_repo = FakeAgendaRecurrenceRuleRepository()
    return AgendaEventService(
        repo,
        now_iso=lambda: "2026-05-30T12:00:00Z",
        agenda_recurrence_rule_repository=recurrence_repo,
    )


def test_create_and_list_one_off_events():
    service = _build_service()

    created = service.create_event(
        "org-1",
        "therapist-1",
        created_by="therapist-1",
        payload={
            "title": "Sessão A",
            "description": "Descrição",
            "startAt": "2026-06-01T14:00:00Z",
            "endAt": "2026-06-01T14:50:00Z",
            "eventType": "session",
            "locationType": "remote",
            "timezone": "UTC",
        },
    )

    assert created["id"]
    assert created["durationMinutes"] == 50

    items = service.list_events(
        "org-1",
        "therapist-1",
        start_at_iso="2026-06-01T00:00:00Z",
        end_at_iso="2026-06-02T00:00:00Z",
    )
    assert len(items) == 1
    assert items[0]["title"] == "Sessão A"


def test_create_event_defaults_status_when_payload_status_is_none():
    service = _build_service()

    created = service.create_event(
        "org-1",
        "therapist-1",
        created_by="therapist-1",
        payload={
            "title": "Sessão Sem Status",
            "description": "Descrição",
            "startAt": "2026-06-01T14:00:00Z",
            "endAt": "2026-06-01T14:50:00Z",
            "eventType": "session",
            "locationType": "remote",
            "timezone": "UTC",
            "status": None,
        },
    )

    assert created["status"] == "scheduled"


def test_create_event_defaults_status_when_payload_status_is_empty_string():
    service = _build_service()

    created = service.create_event(
        "org-1",
        "therapist-1",
        created_by="therapist-1",
        payload={
            "title": "Sessão Sem Status",
            "description": "Descrição",
            "startAt": "2026-06-01T16:00:00Z",
            "endAt": "2026-06-01T16:50:00Z",
            "eventType": "session",
            "locationType": "remote",
            "timezone": "UTC",
            "status": "",
        },
    )

    assert created["status"] == "scheduled"


def test_create_one_off_event_does_not_write_empty_recurrence_index_keys():
    repo = FakeAgendaEventRepository()
    recurrence_repo = FakeAgendaRecurrenceRuleRepository()
    service = AgendaEventService(
        repo,
        now_iso=lambda: "2026-05-30T12:00:00Z",
        agenda_recurrence_rule_repository=recurrence_repo,
    )

    created = service.create_event(
        "org-1",
        "therapist-1",
        created_by="therapist-1",
        payload={
            "title": "Sessão Sem Recorrência",
            "description": "Descrição",
            "startAt": "2026-06-01T18:00:00Z",
            "endAt": "2026-06-01T18:50:00Z",
            "eventType": "session",
            "locationType": "remote",
            "timezone": "UTC",
        },
    )

    stored = repo.get_by_id("org-1", "therapist-1", created["id"])
    assert stored is not None
    assert "GSI3PK" not in stored
    assert "GSI3SK" not in stored


def test_create_recurring_event_generates_virtual_rows_in_list_window():
    service = _build_service()

    created = service.create_event(
        "org-1",
        "therapist-1",
        created_by="therapist-1",
        payload={
            "title": "Sessão Semanal",
            "description": "Recorrente",
            "startAt": "2026-06-01T14:00:00Z",
            "endAt": "2026-06-01T14:50:00Z",
            "eventType": "session",
            "locationType": "remote",
            "timezone": "UTC",
            "recurrenceRule": "FREQ=WEEKLY;INTERVAL=1",
        },
    )

    assert created["recurrenceRuleId"]

    this_week = service.list_events(
        "org-1",
        "therapist-1",
        start_at_iso="2026-06-01T00:00:00Z",
        end_at_iso="2026-06-07T23:59:59Z",
    )
    assert len(this_week) == 1
    assert this_week[0]["id"].startswith("R#")

    next_week = service.list_events(
        "org-1",
        "therapist-1",
        start_at_iso="2026-06-08T00:00:00Z",
        end_at_iso="2026-06-14T23:59:59Z",
    )
    assert len(next_week) == 1
    assert next_week[0]["id"].startswith("R#")


def test_patch_single_virtual_occurrence_creates_detached_override():
    service = _build_service()

    created = service.create_event(
        "org-1",
        "therapist-1",
        created_by="therapist-1",
        payload={
            "title": "Sessão C",
            "description": "Descrição",
            "startAt": "2026-06-01T09:00:00Z",
            "endAt": "2026-06-01T10:00:00Z",
            "eventType": "session",
            "locationType": "remote",
            "timezone": "UTC",
            "recurrenceRule": "FREQ=WEEKLY;INTERVAL=1",
        },
    )

    occurrence_id = f"R#{created['recurrenceRuleId']}#2026-06-08T09:00:00Z"
    updated = service.patch_event(
        "org-1",
        "therapist-1",
        occurrence_id,
        payload={"title": "Sessão C Editada"},
        apply_scope="single",
    )

    assert updated is not None
    assert updated["title"] == "Sessão C Editada"
    assert not updated["id"].startswith("R#")

    items = service.list_events(
        "org-1",
        "therapist-1",
        start_at_iso="2026-06-08T00:00:00Z",
        end_at_iso="2026-06-08T23:59:59Z",
    )
    assert len(items) == 1
    assert items[0]["title"] == "Sessão C Editada"


def test_delete_single_virtual_occurrence_adds_exception():
    service = _build_service()

    created = service.create_event(
        "org-1",
        "therapist-1",
        created_by="therapist-1",
        payload={
            "title": "Sessão D",
            "description": "Descrição",
            "startAt": "2026-06-01T09:00:00Z",
            "endAt": "2026-06-01T10:00:00Z",
            "eventType": "session",
            "locationType": "remote",
            "timezone": "UTC",
            "recurrenceRule": "FREQ=WEEKLY;INTERVAL=1",
        },
    )

    occurrence_id = f"R#{created['recurrenceRuleId']}#2026-06-08T09:00:00Z"
    deleted = service.delete_event(
        "org-1",
        "therapist-1",
        occurrence_id,
        apply_scope="single",
    )
    assert deleted == {
        "ok": True,
        "eventId": occurrence_id,
        "applyScope": "single",
        "deletedCount": 1,
    }

    items = service.list_events(
        "org-1",
        "therapist-1",
        start_at_iso="2026-06-08T00:00:00Z",
        end_at_iso="2026-06-08T23:59:59Z",
    )
    assert len(items) == 0


def test_following_patch_splits_series_and_updates_future_template():
    service = _build_service()

    created = service.create_event(
        "org-1",
        "therapist-1",
        created_by="therapist-1",
        payload={
            "title": "Sessão E",
            "description": "Descrição",
            "startAt": "2026-06-01T09:00:00Z",
            "endAt": "2026-06-01T10:00:00Z",
            "eventType": "session",
            "locationType": "remote",
            "timezone": "UTC",
            "recurrenceRule": "FREQ=WEEKLY;INTERVAL=1",
        },
    )

    occurrence_id = f"R#{created['recurrenceRuleId']}#2026-06-08T09:00:00Z"
    updated = service.patch_event(
        "org-1",
        "therapist-1",
        occurrence_id,
        payload={"title": "Novo"},
        apply_scope="following",
    )

    assert updated is not None
    assert updated["title"] == "Novo"

    first_week = service.list_events(
        "org-1",
        "therapist-1",
        start_at_iso="2026-06-01T00:00:00Z",
        end_at_iso="2026-06-07T23:59:59Z",
    )
    assert len(first_week) == 1
    assert first_week[0]["title"] == "Sessão E"

    second_week = service.list_events(
        "org-1",
        "therapist-1",
        start_at_iso="2026-06-08T00:00:00Z",
        end_at_iso="2026-06-14T23:59:59Z",
    )
    assert len(second_week) == 1
    assert second_week[0]["title"] == "Novo"


def test_following_delete_truncates_series_from_pivot_forward():
    service = _build_service()

    created = service.create_event(
        "org-1",
        "therapist-1",
        created_by="therapist-1",
        payload={
            "title": "Sessão F",
            "description": "Descrição",
            "startAt": "2026-06-01T09:00:00Z",
            "endAt": "2026-06-01T10:00:00Z",
            "eventType": "session",
            "locationType": "remote",
            "timezone": "UTC",
            "recurrenceRule": "FREQ=WEEKLY;INTERVAL=1",
        },
    )

    occurrence_id = f"R#{created['recurrenceRuleId']}#2026-06-08T09:00:00Z"
    deleted = service.delete_event(
        "org-1",
        "therapist-1",
        occurrence_id,
        apply_scope="following",
    )

    assert deleted is not None
    assert deleted["ok"] is True

    first_week = service.list_events(
        "org-1",
        "therapist-1",
        start_at_iso="2026-06-01T00:00:00Z",
        end_at_iso="2026-06-07T23:59:59Z",
    )
    assert len(first_week) == 1

    second_week = service.list_events(
        "org-1",
        "therapist-1",
        start_at_iso="2026-06-08T00:00:00Z",
        end_at_iso="2026-06-14T23:59:59Z",
    )
    assert len(second_week) == 0
