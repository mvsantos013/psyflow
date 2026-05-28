from __future__ import annotations

from boto3.dynamodb.conditions import Key


class ChatRepository:
    def __init__(self, dynamodb_resource, *, table_name: str):
        self._table = dynamodb_resource.Table(table_name)

    @staticmethod
    def _patient_pk(org_id: str, patient_id: str) -> str:
        return f"ORG#{org_id}#PATIENT#{patient_id}"

    def list_by_patient(self, org_id: str, patient_id: str) -> list[dict]:
        response = self._table.query(
            KeyConditionExpression=Key("PK").eq(self._patient_pk(org_id, patient_id))
            & Key("SK").begins_with("MSG#")
        )
        return response.get("Items", [])
