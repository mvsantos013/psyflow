from __future__ import annotations

import uuid


class TaskService:
    def __init__(self, task_repository, *, task_types: set[str], now_iso, today_yyyy_mm_dd):
        self._task_repository = task_repository
        self._task_types = task_types
        self._now_iso = now_iso
        self._today_yyyy_mm_dd = today_yyyy_mm_dd

    @staticmethod
    def _extract_id_from_sk(sk: str, prefix: str) -> str:
        if not sk.startswith(prefix):
            return sk
        return sk[len(prefix) :]

    @classmethod
    def _to_api_task(cls, item: dict) -> dict:
        task_id = cls._extract_id_from_sk(str(item.get("SK", "")), "TASK#")
        return {
            "id": item.get("id", task_id),
            "patientId": item.get("patientId"),
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "type": item.get("type", "exercise"),
            "status": item.get("status", "pending"),
            "prescribedAt": item.get("prescribedAt", ""),
            "completedAt": item.get("completedAt"),
        }

    @staticmethod
    def _composite_patient_pk(org_id: str, patient_id: str) -> str:
        return f"ORG#{org_id}#PATIENT#{patient_id}"

    def list_tasks(self, org_id: str, patient_id: str, *, status_filter: str | None = None) -> list[dict]:
        items = self._task_repository.list_by_patient(org_id, patient_id)
        mapped = [self._to_api_task(item) for item in items]
        if status_filter:
            mapped = [item for item in mapped if item.get("status") == status_filter]
        mapped.sort(key=lambda x: x.get("prescribedAt", ""), reverse=True)
        return mapped

    def create_task(self, org_id: str, patient_id: str, *, title: str, description: str, task_type: str) -> dict:
        if task_type not in self._task_types:
            raise ValueError("type must be one of: exercise, audio, journal, habit")

        task_id = str(uuid.uuid4())
        item = {
            "PK": self._composite_patient_pk(org_id, patient_id),
            "SK": f"TASK#{task_id}",
            "id": task_id,
            "orgId": org_id,
            "patientId": patient_id,
            "title": title,
            "description": description,
            "type": task_type,
            "status": "pending",
            "prescribedAt": self._today_yyyy_mm_dd(),
            "createdAt": self._now_iso(),
        }
        self._task_repository.put(item)
        return self._to_api_task(item)
