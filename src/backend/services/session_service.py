from __future__ import annotations

import json
import uuid

_CLINICAL_PLAINTEXT_FIELDS = ("summary", "insights", "suggestedTasks")


class SessionService:
    def __init__(
        self,
        session_repository,
        *,
        session_types: set[str],
        now_iso,
        optional_env,
        s3_client,
        encryption_service,
    ):
        self._session_repository = session_repository
        self._session_types = session_types
        self._now_iso = now_iso
        self._optional_env = optional_env
        self._s3_client = s3_client
        self._encryption_service = encryption_service

    @staticmethod
    def _extract_id_from_sk(sk: str, prefix: str) -> str:
        if not sk.startswith(prefix):
            return sk
        return sk[len(prefix) :]

    def _decrypt_item(self, item: dict) -> dict:
        """
        Returns a copy of *item* with ``encryptedContent`` decrypted and merged
        back as plaintext fields.  Returns the original item unchanged for legacy
        records that predate encryption (no ``encryptedContent`` field).
        """
        envelope = item.get("encryptedContent")
        if not envelope:
            return item
        org_id = item.get("orgId")
        if not org_id:
            return item
        try:
            payload = json.loads(self._encryption_service.decrypt(org_id, envelope))
            return {**item, **payload}
        except Exception:
            return item

    def _encrypt_clinical(self, org_id: str, summary: str, insights: list, suggested_tasks: list) -> str:
        payload = json.dumps(
            {"summary": summary, "insights": insights, "suggestedTasks": suggested_tasks},
            ensure_ascii=False,
        )
        return self._encryption_service.encrypt(org_id, payload)

    def _to_api_session(self, item: dict) -> dict:
        item = self._decrypt_item(item)
        session_id = self._extract_id_from_sk(str(item.get("SK", "")), "SESSION#")
        return {
            "id": item.get("id", session_id),
            "patientId": item.get("patientId"),
            "date": item.get("date", ""),
            "type": item.get("type", "remote"),
            "duration": int(item.get("durationMinutes", 50)),
            "summary": item.get("summary", ""),
            "insights": item.get("insights", []),
            "moodStart": int(item.get("moodStart", 0)),
            "moodEnd": int(item.get("moodEnd", 0)),
            "hasTranscription": bool(item.get("transcription") or item.get("transcriptionS3Key")),
            "transcription": item.get("transcription"),
            "audioS3Key": item.get("audioS3Key"),
            "transcriptionS3Key": item.get("transcriptionS3Key"),
            "paid": bool(item.get("paid", False)),
        }

    @staticmethod
    def _patient_pk(org_id: str, patient_id: str) -> str:
        return f"ORG#{org_id}#PATIENT#{patient_id}"

    @staticmethod
    def _build_transcription_object_key(org_id: str, patient_id: str, session_id: str) -> str:
        return f"orgs/{org_id}/patients/{patient_id}/sessions/{session_id}/transcription.txt"

    def list_sessions(self, org_id: str, patient_id: str) -> list[dict]:
        items = self._session_repository.list_by_patient(org_id, patient_id)
        mapped = [self._to_api_session(item) for item in items]
        mapped.sort(key=lambda x: x.get("date", ""), reverse=True)
        return mapped

    def create_session(
        self,
        org_id: str,
        patient_id: str,
        *,
        date: str,
        session_type: str,
        duration: int,
        mood_start: int,
        mood_end: int,
        summary: str,
        insights: list[str],
        tasks: list[str],
        paid: bool,
    ) -> dict:
        if session_type not in self._session_types:
            raise ValueError("type must be 'inPerson' or 'remote'")

        session_id = str(uuid.uuid4())
        item: dict = {
            "PK": self._patient_pk(org_id, patient_id),
            "SK": f"SESSION#{session_id}",
            "id": session_id,
            "orgId": org_id,
            "patientId": patient_id,
            "date": date,
            "type": session_type,
            "durationMinutes": duration,
            "moodStart": mood_start,
            "moodEnd": mood_end,
            "paid": bool(paid),
            "createdAt": self._now_iso(),
        }
        item["encryptedContent"] = self._encrypt_clinical(org_id, summary, insights, tasks)
        self._session_repository.put(item)
        # Merge plaintext back so the returned dict is fully populated without a round-trip
        return self._to_api_session({**item, "summary": summary, "insights": insights, "suggestedTasks": tasks})

    def session_exists(self, org_id: str, patient_id: str, session_id: str) -> bool:
        return self._session_repository.get_by_id(org_id, patient_id, session_id) is not None

    def get_patient_transcription(self, org_id: str, patient_id: str) -> dict | None:
        items = self._session_repository.list_by_patient(org_id, patient_id)
        with_transcription = [item for item in items if item.get("transcription")]
        if not with_transcription:
            return None

        latest = sorted(with_transcription, key=lambda x: x.get("date", ""), reverse=True)[0]
        transcription_text = latest.get("transcription")

        if not transcription_text and latest.get("transcriptionS3Key"):
            bucket = self._optional_env("TRANSCRIPTIONS_BUCKET_NAME")
            if bucket:
                try:
                    response = self._s3_client.get_object(Bucket=bucket, Key=str(latest["transcriptionS3Key"]))
                    transcription_text = response["Body"].read().decode("utf-8")
                except Exception:
                    transcription_text = None

        latest_plain = self._decrypt_item(latest)
        return {
            "summary": latest_plain.get("summary", ""),
            "insights": latest_plain.get("insights", []),
            "tasks": latest_plain.get("suggestedTasks", []),
            "transcription": transcription_text,
        }

    def save_transcription(
        self,
        org_id: str,
        patient_id: str,
        session_id: str,
        *,
        transcription_text: str,
        audio_s3_key: str | None,
        store_in_s3: bool,
        transcription_s3_key: str | None,
        summary: str,
        insights: list[str],
        tasks: list[str],
    ) -> None:
        if store_in_s3:
            bucket = self._optional_env("TRANSCRIPTIONS_BUCKET_NAME")
            if not bucket:
                raise ValueError("TRANSCRIPTIONS_BUCKET_NAME is required when storeInS3=true")
            if not transcription_s3_key:
                transcription_s3_key = self._build_transcription_object_key(org_id, patient_id, session_id)
            self._s3_client.put_object(
                Bucket=bucket,
                Key=str(transcription_s3_key),
                Body=transcription_text.encode("utf-8"),
                ContentType="text/plain; charset=utf-8",
                ServerSideEncryption="AES256",
            )

        update_fields: dict = {
            "transcription": transcription_text if not store_in_s3 else "",
            "transcriptionS3Key": str(transcription_s3_key) if transcription_s3_key else "",
            "audioS3Key": str(audio_s3_key) if audio_s3_key else "",
            "updatedAt": self._now_iso(),
            "encryptedContent": self._encrypt_clinical(org_id, summary, insights, tasks),
        }
        self._session_repository.update_fields(
            org_id,
            patient_id,
            session_id,
            update_fields,
            remove_fields=list(_CLINICAL_PLAINTEXT_FIELDS),
        )

    def patch_session(
        self,
        org_id: str,
        patient_id: str,
        session_id: str,
        *,
        audio_s3_key: str | None,
        transcription_s3_key: str | None,
        transcription_status: str | None,
        paid: bool | None,
    ) -> dict:
        fields: dict[str, object] = {
            "updatedAt": self._now_iso(),
        }
        if audio_s3_key is not None:
            fields["audioS3Key"] = audio_s3_key
        if transcription_s3_key is not None:
            fields["transcriptionS3Key"] = transcription_s3_key
        if transcription_status is not None:
            fields["transcriptionStatus"] = transcription_status
        if paid is not None:
            fields["paid"] = bool(paid)

        updated = self._session_repository.update_fields(org_id, patient_id, session_id, fields)
        return self._to_api_session(updated)

    def delete_session(self, org_id: str, patient_id: str, session_id: str) -> bool:
        return self._session_repository.delete_by_id(org_id, patient_id, session_id)
