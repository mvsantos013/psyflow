from __future__ import annotations

import argparse
import datetime as dt

import boto3

from core.env import env
from core.env import optional_env
from repositories.organization_repository import OrganizationRepository
from services.encryption_service import EncryptionService


def _extract_session_id(item: dict) -> str | None:
    session_id = item.get("id")
    if isinstance(session_id, str) and session_id.strip():
        return session_id.strip()

    sk = item.get("SK")
    if isinstance(sk, str) and sk.startswith("SESSION#"):
        return sk[len("SESSION#") :]

    return None


def _build_transcription_key(org_id: str, patient_id: str, session_id: str) -> str:
    return f"orgs/{org_id}/patients/{patient_id}/sessions/{session_id}/transcription.txt"


def _iter_session_items(table):
    scan_kwargs: dict = {}
    while True:
        response = table.scan(**scan_kwargs)
        for item in response.get("Items", []):
            yield item

        last_evaluated_key = response.get("LastEvaluatedKey")
        if not last_evaluated_key:
            break
        scan_kwargs["ExclusiveStartKey"] = last_evaluated_key


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill plaintext session transcriptions to encrypted S3 objects."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Execute writes. Without this flag, runs in dry-run mode.",
    )
    args = parser.parse_args()

    stage = env("STAGE", "dev").strip().lower() or "dev"
    sessions_table_name = env("SESSIONS_TABLE_NAME", f"psyflow-patient-sessions-{stage}")
    organizations_table_name = env("ORGANIZATIONS_TABLE_NAME", f"psyflow-organizations-{stage}")

    transcriptions_bucket = optional_env("TRANSCRIPTIONS_BUCKET_NAME")
    if not transcriptions_bucket:
        raise RuntimeError("TRANSCRIPTIONS_BUCKET_NAME is required")

    kms_key_arn = optional_env("PSYFLOW_KMS_KEY_ARN")
    if not kms_key_arn:
        raise RuntimeError("PSYFLOW_KMS_KEY_ARN is required")

    dynamodb = boto3.resource("dynamodb")
    s3 = boto3.client("s3")
    kms = boto3.client("kms")

    org_repository = OrganizationRepository(dynamodb, table_name=organizations_table_name)
    encryption_service = EncryptionService(kms, org_repository, kms_key_arn=kms_key_arn)
    sessions_table = dynamodb.Table(sessions_table_name)

    scanned = 0
    eligible = 0
    migrated = 0
    skipped = 0
    failed = 0

    for item in _iter_session_items(sessions_table):
        scanned += 1

        transcription = item.get("transcription")
        if not isinstance(transcription, str) or not transcription.strip():
            skipped += 1
            continue

        if item.get("transcriptionS3Key"):
            skipped += 1
            continue

        org_id = item.get("orgId")
        patient_id = item.get("patientId")
        session_id = _extract_session_id(item)
        if not isinstance(org_id, str) or not isinstance(patient_id, str) or not session_id:
            failed += 1
            print(f"[WARN] Missing identifiers for item PK={item.get('PK')} SK={item.get('SK')}")
            continue

        eligible += 1
        key = _build_transcription_key(org_id, patient_id, session_id)

        if not args.apply:
            print(f"[DRY-RUN] Would migrate session={session_id} key={key}")
            continue

        try:
            encrypted = encryption_service.encrypt(org_id, transcription)
            s3.put_object(
                Bucket=transcriptions_bucket,
                Key=key,
                Body=encrypted.encode("utf-8"),
                ContentType="application/json; charset=utf-8",
                ServerSideEncryption="AES256",
            )

            sessions_table.update_item(
                Key={"PK": item["PK"], "SK": item["SK"]},
                UpdateExpression="SET transcriptionS3Key = :key, updatedAt = :updatedAt REMOVE transcription",
                ExpressionAttributeValues={
                    ":key": key,
                    ":updatedAt": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
                },
            )
            migrated += 1
            print(f"[OK] Migrated session={session_id}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"[ERROR] session={session_id}: {exc}")

    print("\nBackfill summary")
    print(f"scanned={scanned}")
    print(f"eligible={eligible}")
    print(f"migrated={migrated}")
    print(f"skipped={skipped}")
    print(f"failed={failed}")

    return 1 if failed > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
