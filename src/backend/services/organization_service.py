from __future__ import annotations

import re
import uuid

from core.exceptions import OrganizationConflictError
from core.exceptions import OrganizationNotFoundError


class OrganizationService:
    def __init__(self, organization_repository, *, now_iso):
        self._organization_repository = organization_repository
        self._now_iso = now_iso

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