from __future__ import annotations

import uuid


class MoodService:
    def __init__(self, mood_repository, *, now_iso, today_yyyy_mm_dd):
        self._mood_repository = mood_repository
        self._now_iso = now_iso
        self._today_yyyy_mm_dd = today_yyyy_mm_dd

    @staticmethod
    def _patient_pk(org_id: str, patient_id: str) -> str:
        return f"ORG#{org_id}#PATIENT#{patient_id}"

    @staticmethod
    def _to_api_mood(item: dict) -> dict:
        return {
            "date": item.get("date", ""),
            "value": int(item.get("value", 0)),
            "source": item.get("source", "professional"),
        }

    def list_mood(self, org_id: str, patient_id: str) -> list[dict]:
        items = self._mood_repository.list_by_patient(org_id, patient_id)
        mapped = [self._to_api_mood(item) for item in items]
        mapped.sort(key=lambda x: x.get("date", ""), reverse=True)
        return mapped

    def create_mood(self, org_id: str, patient_id: str, *, value: int, date: str, source: str) -> dict:
        if source not in {"professional", "patient"}:
            raise ValueError("source must be 'professional' or 'patient'")

        mood_id = str(uuid.uuid4())
        item = {
            "PK": self._patient_pk(org_id, patient_id),
            "SK": f"MOOD#{mood_id}",
            "id": mood_id,
            "orgId": org_id,
            "patientId": patient_id,
            "date": date,
            "value": value,
            "source": source,
            "createdAt": self._now_iso(),
        }
        self._mood_repository.put(item)
        return self._to_api_mood(item)
