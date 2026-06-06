from __future__ import annotations


class UploadService:
    def __init__(self, *, s3_client, uploads_bucket_name_getter, encryption_service):
        self._s3_client = s3_client
        self._uploads_bucket_name_getter = uploads_bucket_name_getter
        self._encryption_service = encryption_service

    @staticmethod
    def _build_audio_object_key(org_id: str, patient_id: str, session_id: str, filename: str | None = None) -> str:
        if filename:
            safe_filename = filename.replace("\\", "-").replace("/", "-")
            return f"audio/{org_id}/{patient_id}/{session_id}/{safe_filename}"
        return f"audio/{org_id}/{patient_id}/{session_id}.mp3"

    def store_encrypted_audio(
        self,
        *,
        org_id: str,
        patient_id: str,
        session_id: str,
        payload: bytes,
        filename: str | None,
        content_type: str,
    ) -> dict:
        bucket = self._uploads_bucket_name_getter()
        if not bucket:
            raise ValueError("AUDIO_UPLOADS_BUCKET_NAME or TRANSCRIPTIONS_BUCKET_NAME is required")
        if not payload:
            raise ValueError("audio payload is required")
        if not (content_type.startswith("audio/") or content_type == "application/octet-stream"):
            raise ValueError("contentType must be an audio/* MIME type")

        object_key = self._build_audio_object_key(org_id, patient_id, session_id, filename)
        encrypted_payload = self._encryption_service.encrypt_bytes(org_id, payload)
        self._s3_client.put_object(
            Bucket=bucket,
            Key=object_key,
            Body=encrypted_payload.encode("utf-8"),
            ContentType="application/json; charset=utf-8",
            Metadata={"original-content-type": content_type},
            ServerSideEncryption="AES256",
        )

        return {
            "bucket": bucket,
            "key": object_key,
        }

    def get_decrypted_audio(
        self,
        *,
        org_id: str,
        object_key: str,
    ) -> dict:
        bucket = self._uploads_bucket_name_getter()
        if not bucket:
            raise ValueError("AUDIO_UPLOADS_BUCKET_NAME or TRANSCRIPTIONS_BUCKET_NAME is required")
        if not object_key:
            raise ValueError("object key is required")
        response = self._s3_client.get_object(Bucket=bucket, Key=object_key)
        raw_payload = response["Body"].read()
        metadata = response.get("Metadata", {})
        content_type = metadata.get("original-content-type") or "audio/mpeg"

        try:
            decrypted = self._encryption_service.decrypt_bytes(org_id, raw_payload.decode("utf-8"))
        except Exception:
            # Backward compatibility with legacy plaintext uploads.
            decrypted = raw_payload
            content_type = response.get("ContentType") or content_type

        return {
            "payload": decrypted,
            "contentType": content_type,
        }
