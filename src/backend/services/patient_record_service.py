from __future__ import annotations


class PatientRecordService:
    def __init__(self, patient_repository, session_service, mood_service):
        self._patient_repository = patient_repository
        self._session_service = session_service
        self._mood_service = mood_service

    @staticmethod
    def _extract_id_from_sk(sk: str, prefix: str) -> str:
        if not sk.startswith(prefix):
            return sk
        return sk[len(prefix) :]

    @classmethod
    def _to_api_patient(cls, item: dict) -> dict:
        sk = str(item.get("SK", ""))
        patient_id = cls._extract_id_from_sk(sk, "PATIENT#")
        return {
            "id": item.get("id", patient_id),
            "name": item.get("name", ""),
            "email": item.get("email", ""),
            "birthDate": item.get("birthDate"),
            "treatmentStartDate": item.get("treatmentStartDate", ""),
            "status": item.get("status", "active"),
            "lastSession": item.get("lastSession", ""),
            "nextSession": item.get("nextSession", ""),
            "nextSessionHour": item.get("nextSessionHour"),
            "averageMood": item.get("averageMood", 0),
            "journalCount": int(item.get("journalCount", 0)),
            "avatarUrl": item.get("avatarUrl"),
        }

    def get_patient_record(self, org_id: str, patient_id: str) -> dict | None:
        raw_patient = self._patient_repository.get_by_id(org_id, patient_id)
        if not raw_patient:
            return None

        patient = self._to_api_patient(raw_patient)
        sessions = self._session_service.list_sessions(org_id, patient_id)
        mood = self._mood_service.list_mood(org_id, patient_id)

        return {
            "patient": patient,
            "sessions": sorted(sessions, key=lambda x: x.get("date", ""), reverse=True),
            "moodRecords": sorted(mood, key=lambda x: x.get("date", "")),
            "diagnoses": raw_patient.get("diagnoses", []),
            "notes": raw_patient.get("notes", ""),
            "generalSummary": raw_patient.get("summary"),
        }
