from __future__ import annotations


class ChatService:
    def __init__(self, chat_repository):
        self._chat_repository = chat_repository

    def get_patient_chat(self, org_id: str, patient_id: str, *, limit: int = 50) -> list[dict]:
        items = self._chat_repository.list_by_patient(org_id, patient_id)
        items.sort(key=lambda x: x.get("SK", ""), reverse=True)
        if limit and limit > 0:
            items = items[:limit]
        return items
