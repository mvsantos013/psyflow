from __future__ import annotations

from boto3.dynamodb.conditions import Key


class ExerciseRepository:
    def __init__(self, dynamodb_resource, *, table_name: str):
        self._table = dynamodb_resource.Table(table_name)

    @staticmethod
    def _org_pk(org_id: str) -> str:
        return f"ORG#{org_id}"

    def list_by_org(self, org_id: str) -> list[dict]:
        response = self._table.query(
            KeyConditionExpression=Key("PK").eq(self._org_pk(org_id))
            & Key("SK").begins_with("EXERCISE#")
        )
        return response.get("Items", [])

    def put(self, item: dict):
        self._table.put_item(Item=item)
