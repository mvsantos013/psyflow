from __future__ import annotations

from boto3.dynamodb.conditions import Key


class AgendaEventRepository:
    GSI_BY_START = "GSI1ByStartTime"
    GSI_BY_RECURRENCE = "GSI3ByRecurrenceGroup"

    def __init__(self, dynamodb_resource, *, table_name: str):
        self._table = dynamodb_resource.Table(table_name)

    @staticmethod
    def _therapist_pk(org_id: str, therapist_id: str) -> str:
        return f"ORG#{org_id}#THERAPIST#{therapist_id}"

    @staticmethod
    def _event_sk(event_id: str) -> str:
        return f"EVENT#{event_id}"

    def put(self, item: dict):
        self._table.put_item(Item=item)

    def get_by_id(self, org_id: str, therapist_id: str, event_id: str) -> dict | None:
        response = self._table.get_item(
            Key={
                "PK": self._therapist_pk(org_id, therapist_id),
                "SK": self._event_sk(event_id),
            }
        )
        return response.get("Item")

    def list_by_therapist_range(
        self,
        org_id: str,
        therapist_id: str,
        *,
        start_at_iso: str,
        end_at_iso: str,
    ) -> list[dict]:
        gsi_pk = self._therapist_pk(org_id, therapist_id)
        response = self._table.query(
            IndexName=self.GSI_BY_START,
            KeyConditionExpression=Key("GSI1PK").eq(gsi_pk)
            & Key("GSI1SK").between(
                f"START#{start_at_iso}",
                f"START#{end_at_iso}#~",
            ),
        )
        return response.get("Items", [])

    def list_by_recurrence_rule(self, org_id: str, therapist_id: str, recurrence_rule_id: str) -> list[dict]:
        gsi_pk = f"{self._therapist_pk(org_id, therapist_id)}#RULE#{recurrence_rule_id}"
        response = self._table.query(
            IndexName=self.GSI_BY_RECURRENCE,
            KeyConditionExpression=Key("GSI3PK").eq(gsi_pk),
        )
        return response.get("Items", [])

    def update_fields(self, org_id: str, therapist_id: str, event_id: str, fields: dict) -> dict:
        update_parts: list[str] = []
        values: dict = {}
        names: dict = {}
        for key, value in fields.items():
            name_token = f"#n{len(names)}"
            value_token = f":v{len(values)}"
            update_parts.append(f"{name_token} = {value_token}")
            names[name_token] = key
            values[value_token] = value

        if not update_parts:
            raise ValueError("at least one field must be provided")

        response = self._table.update_item(
            Key={
                "PK": self._therapist_pk(org_id, therapist_id),
                "SK": self._event_sk(event_id),
            },
            UpdateExpression=f"SET {', '.join(update_parts)}",
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ReturnValues="ALL_NEW",
        )
        return response.get("Attributes", {})

    def delete_by_id(self, org_id: str, therapist_id: str, event_id: str) -> bool:
        response = self._table.delete_item(
            Key={
                "PK": self._therapist_pk(org_id, therapist_id),
                "SK": self._event_sk(event_id),
            },
            ReturnValues="ALL_OLD",
        )
        return response.get("Attributes") is not None
