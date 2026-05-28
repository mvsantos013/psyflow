from __future__ import annotations


class UploadService:
    def __init__(self, *, s3_client, uploads_bucket_name_getter):
        self._s3_client = s3_client
        self._uploads_bucket_name_getter = uploads_bucket_name_getter

    @staticmethod
    def _build_audio_object_key(org_id: str, patient_id: str, session_id: str, filename: str | None = None) -> str:
        if filename:
            safe_filename = filename.replace("\\", "-").replace("/", "-")
            return f"audio/{org_id}/{patient_id}/{session_id}/{safe_filename}"
        return f"audio/{org_id}/{patient_id}/{session_id}.mp3"

    def create_audio_upload_url(
        self,
        org_id: str,
        patient_id: str,
        session_id: str,
        *,
        filename: str | None,
        content_type: str,
        expires_in: int,
    ) -> dict:
        bucket = self._uploads_bucket_name_getter()
        if not bucket:
            raise ValueError("AUDIO_UPLOADS_BUCKET_NAME or TRANSCRIPTIONS_BUCKET_NAME is required")

        if not (content_type.startswith("audio/") or content_type == "application/octet-stream"):
            raise ValueError("contentType must be an audio/* MIME type")
        if expires_in < 60 or expires_in > 3600:
            raise ValueError("expiresIn must be between 60 and 3600 seconds")

        object_key = self._build_audio_object_key(org_id, patient_id, session_id, filename)
        upload_url = self._s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": bucket,
                "Key": object_key,
                "ContentType": content_type,
                "ServerSideEncryption": "AES256",
            },
            ExpiresIn=expires_in,
        )

        return {
            "uploadUrl": upload_url,
            "bucket": bucket,
            "key": object_key,
            "method": "PUT",
            "expiresIn": expires_in,
            "headers": {
                "Content-Type": content_type,
                "x-amz-server-side-encryption": "AES256",
            },
        }
