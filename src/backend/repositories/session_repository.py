from __future__ import annotations

from boto3.dynamodb.conditions import Key


class SessionRepository:
    def __init__(self, dynamodb_resource, *, table_name: str):
        self._table = dynamodb_resource.Table(table_name)

    @staticmethod
    def _patient_pk(org_id: str, patient_id: str) -> str:
        return f"ORG#{org_id}#PATIENT#{patient_id}"

    @staticmethod
    def _session_key(org_id: str, patient_id: str, session_id: str) -> dict:
        return {
            "PK": SessionRepository._patient_pk(org_id, patient_id),
            "SK": f"SESSION#{session_id}",
        }

    def list_by_patient(self, org_id: str, patient_id: str) -> list[dict]:
        response = self._table.query(
            KeyConditionExpression=Key("PK").eq(self._patient_pk(org_id, patient_id))
            & Key("SK").begins_with("SESSION#")
        )
        return response.get("Items", [])

    def get_by_id(self, org_id: str, patient_id: str, session_id: str) -> dict | None:
        response = self._table.get_item(Key=self._session_key(org_id, patient_id, session_id))
        return response.get("Item")

    def delete_by_id(self, org_id: str, patient_id: str, session_id: str) -> bool:
        response = self._table.delete_item(
            Key=self._session_key(org_id, patient_id, session_id),
            ReturnValues="ALL_OLD",
        )
        return response.get("Attributes") is not None

    def put(self, item: dict):
        self._table.put_item(Item=item)

    def update_fields(self, org_id: str, patient_id: str, session_id: str, fields: dict) -> dict:
        update_parts: list[str] = []
        values: dict = {}
        for key, value in fields.items():
            token = f":{key}"
            update_parts.append(f"{key} = {token}")
            values[token] = value

        if not update_parts:
            raise ValueError("at least one field must be provided")

        response = self._table.update_item(
            Key=self._session_key(org_id, patient_id, session_id),
            UpdateExpression=f"SET {', '.join(update_parts)}",
            ExpressionAttributeValues=values,
            ReturnValues="ALL_NEW",
        )
        return response.get("Attributes", {})

