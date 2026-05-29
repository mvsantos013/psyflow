from __future__ import annotations


class OrganizationRepository:
    def __init__(self, dynamodb_resource, *, table_name: str):
        self._table = dynamodb_resource.Table(table_name)

    @staticmethod
    def _org_pk(org_id: str) -> str:
        return f"ORG#{org_id}"

    @classmethod
    def _key(cls, org_id: str) -> dict[str, str]:
        pk = cls._org_pk(org_id)
        return {"PK": pk, "SK": pk}

    def list_all(self) -> list[dict]:
        items: list[dict] = []
        start_key = None

        while True:
            kwargs = {}
            if start_key is not None:
                kwargs["ExclusiveStartKey"] = start_key
            response = self._table.scan(**kwargs)
            items.extend(response.get("Items", []))

            start_key = response.get("LastEvaluatedKey")
            if not start_key:
                break

        return items

    def get_by_id(self, org_id: str) -> dict | None:
        response = self._table.get_item(Key=self._key(org_id))
        return response.get("Item")

    def slug_exists(self, slug: str, *, exclude_org_id: str | None = None) -> bool:
        for item in self.list_all():
            if exclude_org_id and str(item.get("id", "")) == exclude_org_id:
                continue
            if str(item.get("slug", "")) == slug:
                return True
        return False

    def save(self, item: dict):
        self._table.put_item(Item=item)