from __future__ import annotations

from boto3.dynamodb.conditions import Key


class AgendaRecurrenceRuleRepository:
    def __init__(self, dynamodb_resource, *, table_name: str):
        self._table = dynamodb_resource.Table(table_name)

    @staticmethod
    def _rule_pk(org_id: str, therapist_id: str) -> str:
        return f"ORG#{org_id}#THERAPIST#{therapist_id}"

    @staticmethod
    def _rule_sk(recurrence_rule_id: str) -> str:
        return f"RULE#{recurrence_rule_id}"

    def put(self, item: dict):
        self._table.put_item(Item=item)

    def list_by_therapist(self, org_id: str, therapist_id: str) -> list[dict]:
        response = self._table.query(
            KeyConditionExpression=Key("PK").eq(self._rule_pk(org_id, therapist_id))
            & Key("SK").begins_with("RULE#")
        )
        return response.get("Items", [])

    def get_by_id(self, org_id: str, therapist_id: str, recurrence_rule_id: str) -> dict | None:
        response = self._table.get_item(
            Key={
                "PK": self._rule_pk(org_id, therapist_id),
                "SK": self._rule_sk(recurrence_rule_id),
            }
        )
        return response.get("Item")

    def update_fields(self, org_id: str, therapist_id: str, recurrence_rule_id: str, fields: dict) -> dict:
        update_parts: list[str] = []
        values: dict = {}
        for key, value in fields.items():
            token = f":{key}"
            update_parts.append(f"{key} = {token}")
            values[token] = value

        if not update_parts:
            raise ValueError("at least one field must be provided")

        response = self._table.update_item(
            Key={
                "PK": self._rule_pk(org_id, therapist_id),
                "SK": self._rule_sk(recurrence_rule_id),
            },
            UpdateExpression=f"SET {', '.join(update_parts)}",
            ExpressionAttributeValues=values,
            ReturnValues="ALL_NEW",
        )
        return response.get("Attributes", {})

    def delete_by_id(self, org_id: str, therapist_id: str, recurrence_rule_id: str) -> bool:
        response = self._table.delete_item(
            Key={
                "PK": self._rule_pk(org_id, therapist_id),
                "SK": self._rule_sk(recurrence_rule_id),
            },
            ReturnValues="ALL_OLD",
        )
        return response.get("Attributes") is not None
