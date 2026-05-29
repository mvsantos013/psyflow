from __future__ import annotations

from boto3.dynamodb.conditions import Key


class PatientRepository:
    def __init__(self, dynamodb_resource, *, table_name: str):
        self._table = dynamodb_resource.Table(table_name)

    @staticmethod
    def _org_pk(org_id: str) -> str:
        return f"ORG#{org_id}"

    @staticmethod
    def _patient_sk(patient_id: str) -> str:
        return f"PATIENT#{patient_id}"

    def list_by_org(self, org_id: str) -> list[dict]:
        response = self._table.query(
            KeyConditionExpression=Key("PK").eq(self._org_pk(org_id)),
        )
        return response.get("Items", [])

    def get_by_id(self, org_id: str, patient_id: str) -> dict | None:
        response = self._table.query(
            KeyConditionExpression=Key("PK").eq(self._org_pk(org_id))
            & Key("SK").eq(self._patient_sk(patient_id)),
            Limit=1,
        )
        items = response.get("Items", [])
        return items[0] if items else None

    def exists(self, org_id: str, patient_id: str) -> bool:
        response = self._table.get_item(
            Key={
                "PK": self._org_pk(org_id),
                "SK": self._patient_sk(patient_id),
            }
        )
        return response.get("Item") is not None

    def save(self, item: dict) -> None:
        self._table.put_item(Item=item)
