from __future__ import annotations

import re
import uuid
from typing import Any

from botocore.exceptions import ClientError

from core.exceptions import OrganizationConflictError
from core.exceptions import OrganizationNotFoundError
from core.exceptions import OrganizationUserConflictError
from core.exceptions import OrganizationUserNotFoundError
from core.exceptions import OrganizationUserRoleInvalidError
from core.exceptions import UserPoolConfigError


class OrganizationService:
    _MANAGEABLE_ROLES = {"admin", "therapist", "assistant"}

    def __init__(
        self,
        organization_repository,
        *,
        now_iso,
        cognito_client=None,
        user_pool_id: str | None = None,
        encryption_service=None,
    ):
        self._organization_repository = organization_repository
        self._now_iso = now_iso
        self._cognito_client = cognito_client
        self._user_pool_id = (user_pool_id or "").strip() or None
        self._encryption_service = encryption_service

    @staticmethod
    def _normalize_slug(slug: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "-", slug.strip().lower())
        normalized = normalized.strip("-")
        if not normalized:
            raise ValueError("slug must not be empty")
        return normalized

    @staticmethod
    def _to_api_organization(item: dict) -> dict:
        return {
            "id": str(item.get("id", "")),
            "name": str(item.get("name", "")),
            "slug": str(item.get("slug", "")),
            "status": str(item.get("status", "active")),
            "createdAt": str(item.get("createdAt", "")),
            "updatedAt": str(item.get("updatedAt", "")),
            "deletedAt": item.get("deletedAt"),
            "deletedBy": item.get("deletedBy"),
        }

    def list_organizations(self) -> list[dict]:
        items = self._organization_repository.list_all()
        items.sort(key=lambda item: (str(item.get("name", "")).lower(), str(item.get("slug", ""))))
        return [self._to_api_organization(item) for item in items]

    def get_organization(self, org_id: str) -> dict | None:
        item = self._organization_repository.get_by_id(org_id)
        if item is None:
            return None
        return self._to_api_organization(item)

    def create_organization(self, *, name: str, slug: str) -> dict:
        normalized_slug = self._normalize_slug(slug)
        if self._organization_repository.slug_exists(normalized_slug):
            raise OrganizationConflictError()

        now = self._now_iso()
        organization_id = str(uuid.uuid4())
        item = {
            "PK": f"ORG#{organization_id}",
            "SK": f"ORG#{organization_id}",
            "id": organization_id,
            "name": name,
            "slug": normalized_slug,
            "status": "active",
            "createdAt": now,
            "updatedAt": now,
            "deletedAt": None,
            "deletedBy": None,
        }
        if self._encryption_service is not None:
            item.update(self._encryption_service.provision_org_key(organization_id))
        self._organization_repository.save(item)
        return self._to_api_organization(item)

    def update_organization(self, org_id: str, *, name: str | None = None, slug: str | None = None) -> dict:
        existing = self._organization_repository.get_by_id(org_id)
        if existing is None:
            raise OrganizationNotFoundError()

        updated_item = dict(existing)
        if name is not None:
            updated_item["name"] = name
        if slug is not None:
            normalized_slug = self._normalize_slug(slug)
            if self._organization_repository.slug_exists(normalized_slug, exclude_org_id=org_id):
                raise OrganizationConflictError()
            updated_item["slug"] = normalized_slug

        updated_item["updatedAt"] = self._now_iso()
        self._organization_repository.save(updated_item)
        return self._to_api_organization(updated_item)

    def delete_organization(self, org_id: str, *, deleted_by: str | None = None) -> dict:
        existing = self._organization_repository.get_by_id(org_id)
        if existing is None:
            raise OrganizationNotFoundError()

        updated_item = dict(existing)
        now = self._now_iso()
        updated_item["status"] = "archived"
        updated_item["updatedAt"] = now
        updated_item["deletedAt"] = now
        updated_item["deletedBy"] = deleted_by
        self._organization_repository.save(updated_item)
        return self._to_api_organization(updated_item)

    def list_organization_users(self, org_id: str) -> list[dict]:
        self._ensure_org_exists(org_id)
        self._require_user_pool()

        users: list[dict] = []
        paginator = self._cognito_client.get_paginator("list_users")
        # Cognito ListUsers does not support filtering by custom attributes.
        pages = paginator.paginate(UserPoolId=self._user_pool_id)

        for page in pages:
            for user in page.get("Users", []):
                mapped = self._to_api_organization_user(user)
                if mapped.get("orgId") != org_id:
                    continue
                mapped["membershipStatus"] = "active"
                users.append(mapped)

        users.sort(key=lambda item: (item.get("email") or item.get("username") or "").lower())
        return users

    def assign_existing_user_to_organization(
        self,
        *,
        org_id: str,
        username: str,
        role: str,
        assigned_by: str | None = None,
    ) -> dict:
        self._ensure_org_exists(org_id)
        self._require_user_pool()
        normalized_role = self._normalize_user_role(role)
        normalized_username = username.strip()
        if not normalized_username:
            raise OrganizationUserConflictError()

        user = self._admin_get_user(normalized_username)
        current = self._to_api_organization_user(user)
        if current.get("orgId") == org_id and current.get("role") == normalized_role:
            raise OrganizationUserConflictError()

        attributes = [
            {"Name": "custom:org_id", "Value": org_id},
            {"Name": "custom:role", "Value": normalized_role},
        ]
        self._cognito_client.admin_update_user_attributes(
            UserPoolId=self._user_pool_id,
            Username=normalized_username,
            UserAttributes=attributes,
        )

        return self._to_api_organization_user(self._admin_get_user(normalized_username))

    def update_organization_user_role(
        self,
        *,
        org_id: str,
        username: str,
        role: str,
        updated_by: str | None = None,
    ) -> dict:
        self._ensure_org_exists(org_id)
        self._require_user_pool()
        normalized_role = self._normalize_user_role(role)
        normalized_username = username.strip()
        if not normalized_username:
            raise OrganizationUserNotFoundError()

        existing = self._to_api_organization_user(self._admin_get_user(normalized_username))
        if existing.get("orgId") != org_id:
            raise OrganizationUserNotFoundError()

        attributes = [{"Name": "custom:role", "Value": normalized_role}]
        self._cognito_client.admin_update_user_attributes(
            UserPoolId=self._user_pool_id,
            Username=normalized_username,
            UserAttributes=attributes,
        )

        return self._to_api_organization_user(self._admin_get_user(normalized_username))

    def remove_user_from_organization(
        self,
        *,
        org_id: str,
        username: str,
        removed_by: str | None = None,
    ) -> dict:
        self._ensure_org_exists(org_id)
        self._require_user_pool()
        normalized_username = username.strip()
        if not normalized_username:
            raise OrganizationUserNotFoundError()

        existing = self._to_api_organization_user(self._admin_get_user(normalized_username))
        if existing.get("orgId") != org_id:
            raise OrganizationUserNotFoundError()

        attributes = [{"Name": "custom:org_id", "Value": ""}]
        self._cognito_client.admin_update_user_attributes(
            UserPoolId=self._user_pool_id,
            Username=normalized_username,
            UserAttributes=attributes,
        )

        removed = self._to_api_organization_user(self._admin_get_user(normalized_username))
        removed["membershipStatus"] = "inactive"
        return removed

    def _ensure_org_exists(self, org_id: str):
        if self._organization_repository.get_by_id(org_id) is None:
            raise OrganizationNotFoundError()

    def _require_user_pool(self):
        if not self._cognito_client or not self._user_pool_id:
            raise UserPoolConfigError()

    def _normalize_user_role(self, role: str) -> str:
        normalized = role.strip()
        if normalized not in self._MANAGEABLE_ROLES:
            raise OrganizationUserRoleInvalidError()
        return normalized

    def _admin_get_user(self, username: str) -> dict[str, Any]:
        try:
            return self._cognito_client.admin_get_user(UserPoolId=self._user_pool_id, Username=username)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code == "UserNotFoundException":
                raise OrganizationUserNotFoundError() from exc
            raise

    @staticmethod
    def _to_api_organization_user(user: dict[str, Any]) -> dict[str, Any]:
        raw_attributes = user.get("UserAttributes") or user.get("Attributes") or []
        attributes = {attr.get("Name"): attr.get("Value") for attr in raw_attributes}
        status = "active" if user.get("Enabled", True) else "disabled"
        return {
            "username": str(user.get("Username", "")),
            "userId": str(attributes.get("sub", "")),
            "email": str(attributes.get("email", "")),
            "orgId": attributes.get("custom:org_id") or None,
            "role": str(attributes.get("custom:role", "assistant")),
            "status": status,
            "userStatus": str(user.get("UserStatus", "UNKNOWN")),
            "createdAt": str(user.get("UserCreateDate", "")),
            "updatedAt": str(user.get("UserLastModifiedDate", "")),
        }