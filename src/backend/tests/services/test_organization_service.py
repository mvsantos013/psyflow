from __future__ import annotations

from datetime import datetime, timezone

import pytest

from core.exceptions import OrganizationNotFoundError
from core.exceptions import UserPoolConfigError
from services.organization_service import OrganizationService


class FakeOrganizationRepository:
    def __init__(self, organizations: dict[str, dict] | None = None):
        self._organizations = organizations or {}

    def get_by_id(self, org_id: str):
        return self._organizations.get(org_id)

    def list_all(self):
        return list(self._organizations.values())

    def slug_exists(self, slug: str, exclude_org_id: str | None = None):
        for org_id, org in self._organizations.items():
            if exclude_org_id and org_id == exclude_org_id:
                continue
            if org.get("slug") == slug:
                return True
        return False

    def save(self, item: dict):
        self._organizations[item["id"]] = item


class FakePaginator:
    def __init__(self, pages: list[dict]):
        self._pages = pages

    def paginate(self, **kwargs):
        return self._pages


class FakeCognitoClient:
    def __init__(self, pages: list[dict]):
        self._pages = pages

    def get_paginator(self, operation_name: str):
        assert operation_name == "list_users"
        return FakePaginator(self._pages)


def _build_service(*, pages: list[dict], user_pool_id: str = "pool-id") -> OrganizationService:
    repo = FakeOrganizationRepository(
        organizations={
            "org-1": {
                "id": "org-1",
                "name": "Org 1",
                "slug": "org-1",
                "status": "active",
            }
        }
    )
    client = FakeCognitoClient(pages)
    return OrganizationService(
        repo,
        now_iso=lambda: "2026-01-01T00:00:00Z",
        cognito_client=client,
        user_pool_id=user_pool_id,
    )


def test_list_organization_users_filters_by_org_and_handles_list_users_shape():
    service = _build_service(
        pages=[
            {
                "Users": [
                    {
                        "Username": "user-a",
                        "Attributes": [
                            {"Name": "sub", "Value": "sub-a"},
                            {"Name": "email", "Value": "a@example.com"},
                            {"Name": "custom:org_id", "Value": "org-1"},
                            {"Name": "custom:role", "Value": "therapist"},
                        ],
                        "Enabled": True,
                        "UserStatus": "CONFIRMED",
                        "UserCreateDate": datetime(2026, 1, 1, tzinfo=timezone.utc),
                        "UserLastModifiedDate": datetime(2026, 1, 2, tzinfo=timezone.utc),
                    },
                    {
                        "Username": "user-b",
                        "Attributes": [
                            {"Name": "sub", "Value": "sub-b"},
                            {"Name": "email", "Value": "b@example.com"},
                            {"Name": "custom:org_id", "Value": "org-2"},
                            {"Name": "custom:role", "Value": "assistant"},
                        ],
                        "Enabled": True,
                        "UserStatus": "CONFIRMED",
                    },
                ]
            }
        ]
    )

    users = service.list_organization_users("org-1")

    assert len(users) == 1
    assert users[0]["username"] == "user-a"
    assert users[0]["orgId"] == "org-1"
    assert users[0]["role"] == "therapist"
    assert users[0]["membershipStatus"] == "active"


def test_list_organization_users_raises_when_org_does_not_exist():
    repo = FakeOrganizationRepository(organizations={})
    service = OrganizationService(
        repo,
        now_iso=lambda: "2026-01-01T00:00:00Z",
        cognito_client=FakeCognitoClient([]),
        user_pool_id="pool-id",
    )

    with pytest.raises(OrganizationNotFoundError):
        service.list_organization_users("missing-org")


def test_list_organization_users_raises_when_user_pool_missing():
    repo = FakeOrganizationRepository(
        organizations={
            "org-1": {
                "id": "org-1",
                "name": "Org 1",
                "slug": "org-1",
                "status": "active",
            }
        }
    )
    service = OrganizationService(repo, now_iso=lambda: "2026-01-01T00:00:00Z", cognito_client=None, user_pool_id=None)

    with pytest.raises(UserPoolConfigError):
        service.list_organization_users("org-1")
