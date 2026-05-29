from __future__ import annotations

from flask import Blueprint
from flask import jsonify

from core.validation import JsonField
from core.validation import JsonSchema


class OrganizationController:
    def __init__(self, organization_service, *, json_ready, json_error):
        self._organization_service = organization_service
        self._json_ready = json_ready
        self._json_error = json_error

    def list_organizations(self):
        organizations = self._organization_service.list_organizations()
        return jsonify(self._json_ready(organizations))

    def get_organization(self, org_id: str):
        organization = self._organization_service.get_organization(org_id)
        if organization is None:
            return self._json_error(404, "ORGANIZATION_NOT_FOUND", "organization not found")
        return jsonify(self._json_ready(organization))

    def create_organization(self, *, name: str, slug: str):
        organization = self._organization_service.create_organization(name=name, slug=slug)
        return jsonify(self._json_ready(organization)), 201

    def update_organization(self, org_id: str, *, name: str | None = None, slug: str | None = None):
        organization = self._organization_service.update_organization(org_id, name=name, slug=slug)
        return jsonify(self._json_ready(organization))

    def delete_organization(self, org_id: str, *, deleted_by: str | None = None):
        organization = self._organization_service.delete_organization(org_id, deleted_by=deleted_by)
        return jsonify(self._json_ready(organization))


def create_organization_blueprint(*, organization_controller: OrganizationController, deps):
    bp = Blueprint("organizations", __name__)
    d = deps

    @bp.get("/api/admin/organizations")
    def list_organizations():
        role = d.extract_role()
        d.require_super_admin(role)
        return organization_controller.list_organizations()

    @bp.get("/api/admin/organizations/<org_id>")
    def get_organization(org_id: str):
        role = d.extract_role()
        d.require_super_admin(role)
        return organization_controller.get_organization(org_id)

    @bp.post("/api/admin/organizations")
    def create_organization():
        role = d.extract_role()
        d.require_super_admin(role)
        payload = d.validate_json_schema(
            JsonSchema(
                fields={
                    "name": JsonField(required=True),
                    "slug": JsonField(required=True),
                }
            )
        )
        name = d.require_string(payload, "name", max_length=120)
        slug = d.require_string(payload, "slug", max_length=80)
        return organization_controller.create_organization(name=name, slug=slug)

    @bp.patch("/api/admin/organizations/<org_id>")
    def update_organization(org_id: str):
        role = d.extract_role()
        d.require_super_admin(role)
        payload = d.validate_json_schema(
            JsonSchema(
                fields={
                    "name": JsonField(required=False),
                    "slug": JsonField(required=False),
                }
            )
        )
        name = d.optional_string(payload, "name", max_length=120)
        slug = d.optional_string(payload, "slug", max_length=80)
        if name is None and slug is None:
            raise ValueError("at least one field must be provided")
        return organization_controller.update_organization(org_id, name=name, slug=slug)

    @bp.delete("/api/admin/organizations/<org_id>")
    def delete_organization(org_id: str):
        role = d.extract_role()
        d.require_super_admin(role)
        deleted_by = d.extract_user_sub()
        return organization_controller.delete_organization(org_id, deleted_by=deleted_by)

    return bp