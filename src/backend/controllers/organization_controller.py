from __future__ import annotations

from flask import Blueprint
from flask import jsonify

from core.exceptions import RoleForbiddenError
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

    def list_organization_users(self, org_id: str):
        users = self._organization_service.list_organization_users(org_id)
        return jsonify(self._json_ready(users))

    def assign_organization_user(self, *, org_id: str, username: str, role: str, assigned_by: str | None = None):
        user = self._organization_service.assign_existing_user_to_organization(
            org_id=org_id,
            username=username,
            role=role,
            assigned_by=assigned_by,
        )
        return jsonify(self._json_ready(user)), 201

    def update_organization_user_role(
        self,
        *,
        org_id: str,
        username: str,
        role: str,
        updated_by: str | None = None,
    ):
        user = self._organization_service.update_organization_user_role(
            org_id=org_id,
            username=username,
            role=role,
            updated_by=updated_by,
        )
        return jsonify(self._json_ready(user))

    def remove_organization_user(self, *, org_id: str, username: str, removed_by: str | None = None):
        user = self._organization_service.remove_user_from_organization(
            org_id=org_id,
            username=username,
            removed_by=removed_by,
        )
        return jsonify(self._json_ready(user))

    def update_organization(self, org_id: str, *, name: str | None = None, slug: str | None = None):
        organization = self._organization_service.update_organization(org_id, name=name, slug=slug)
        return jsonify(self._json_ready(organization))

    def delete_organization(self, org_id: str, *, deleted_by: str | None = None):
        organization = self._organization_service.delete_organization(org_id, deleted_by=deleted_by)
        return jsonify(self._json_ready(organization))


def create_organization_blueprint(*, organization_controller: OrganizationController, deps):
    bp = Blueprint("organizations", __name__)
    d = deps

    def require_org_manage_access(target_org_id: str):
        role = d.extract_role()
        if role == "super_admin":
            return

        org_id, auth_role = d.extract_auth_context()
        if auth_role == "admin" and org_id == target_org_id:
            return

        raise RoleForbiddenError()

    @bp.get("/api/admin/organizations")
    def list_organizations():
        role = d.extract_role()
        d.require_super_admin(role)
        return organization_controller.list_organizations()

    @bp.get("/api/admin/organizations/<org_id>")
    def get_organization(org_id: str):
        require_org_manage_access(org_id)
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

    @bp.get("/api/admin/organizations/<org_id>/users")
    def list_organization_users(org_id: str):
        require_org_manage_access(org_id)
        return organization_controller.list_organization_users(org_id)

    @bp.post("/api/admin/organizations/<org_id>/users")
    def assign_organization_user(org_id: str):
        require_org_manage_access(org_id)
        payload = d.validate_json_schema(
            JsonSchema(
                fields={
                    "username": JsonField(required=True),
                    "role": JsonField(required=True),
                }
            )
        )
        username = d.require_string(payload, "username", max_length=256)
        role = d.require_string(payload, "role", max_length=32)
        assigned_by = d.extract_user_sub()
        return organization_controller.assign_organization_user(
            org_id=org_id,
            username=username,
            role=role,
            assigned_by=assigned_by,
        )

    @bp.patch("/api/admin/organizations/<org_id>/users/<username>/role")
    def update_organization_user_role(org_id: str, username: str):
        require_org_manage_access(org_id)
        payload = d.validate_json_schema(
            JsonSchema(
                fields={
                    "role": JsonField(required=True),
                }
            )
        )
        role = d.require_string(payload, "role", max_length=32)
        updated_by = d.extract_user_sub()
        return organization_controller.update_organization_user_role(
            org_id=org_id,
            username=username,
            role=role,
            updated_by=updated_by,
        )

    @bp.delete("/api/admin/organizations/<org_id>/users/<username>")
    def remove_organization_user(org_id: str, username: str):
        require_org_manage_access(org_id)
        removed_by = d.extract_user_sub()
        return organization_controller.remove_organization_user(
            org_id=org_id,
            username=username,
            removed_by=removed_by,
        )

    return bp