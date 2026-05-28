from __future__ import annotations

import uuid


class ExerciseService:
    def __init__(self, exercise_repository, *, task_types: set[str], now_iso):
        self._exercise_repository = exercise_repository
        self._task_types = task_types
        self._now_iso = now_iso

    @staticmethod
    def _extract_id_from_sk(sk: str, prefix: str) -> str:
        if not sk.startswith(prefix):
            return sk
        return sk[len(prefix) :]

    @classmethod
    def _to_api_exercise(cls, item: dict) -> dict:
        exercise_id = cls._extract_id_from_sk(str(item.get("SK", "")), "EXERCISE#")
        return {
            "id": item.get("id", exercise_id),
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "type": item.get("type", "exercise"),
        }

    @staticmethod
    def _org_pk(org_id: str) -> str:
        return f"ORG#{org_id}"

    def list_exercises(self, org_id: str, *, exercise_type: str | None = None) -> list[dict]:
        items = self._exercise_repository.list_by_org(org_id)
        if exercise_type:
            items = [item for item in items if item.get("type") == exercise_type]
        return [self._to_api_exercise(item) for item in items]

    def create_exercise(self, org_id: str, *, title: str, description: str, exercise_type: str) -> dict:
        if exercise_type not in self._task_types:
            raise ValueError("type must be one of: exercise, audio, journal, habit")

        exercise_id = str(uuid.uuid4())
        item = {
            "PK": self._org_pk(org_id),
            "SK": f"EXERCISE#{exercise_id}",
            "id": exercise_id,
            "orgId": org_id,
            "title": title,
            "description": description,
            "type": exercise_type,
            "createdAt": self._now_iso(),
        }
        self._exercise_repository.put(item)
        return self._to_api_exercise(item)
