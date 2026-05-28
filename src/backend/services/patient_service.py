from __future__ import annotations


class PatientService:
    def __init__(self, patient_repository):
        self._patient_repository = patient_repository

    @staticmethod
    def _extract_id_from_sk(sk: str, prefix: str) -> str:
        if not sk.startswith(prefix):
            return ""
        return sk[len(prefix) :]

    @classmethod
    def _to_api_patient(cls, item: dict) -> dict:
        sk = str(item.get("SK", ""))
        patient_id = cls._extract_id_from_sk(sk, "PATIENT#")
        return {
            "id": item.get("id", patient_id),
            "name": item.get("name", ""),
            "email": item.get("email", ""),
            "age": int(item.get("age", 0)),
            "treatmentStartDate": item.get("treatmentStartDate", ""),
            "status": item.get("status", "active"),
            "lastSession": item.get("lastSession", ""),
            "nextSession": item.get("nextSession", ""),
            "nextSessionHour": item.get("nextSessionHour"),
            "averageMood": item.get("averageMood", 0),
            "journalCount": int(item.get("journalCount", 0)),
            "avatarUrl": item.get("avatarUrl"),
        }

    def list_patients(self, org_id: str) -> list[dict]:
        items = self._patient_repository.list_by_org(org_id)
        return [self._to_api_patient(item) for item in items]

    def get_patient(self, org_id: str, patient_id: str) -> dict | None:
        item = self._patient_repository.get_by_id(org_id, patient_id)
        if item is None:
            return None
        return self._to_api_patient(item)

    def patient_exists(self, org_id: str, patient_id: str) -> bool:
        return self._patient_repository.exists(org_id, patient_id)
