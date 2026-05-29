from __future__ import annotations

from unittest.mock import Mock

from flask import Flask

from controllers.organization_controller import OrganizationController
from controllers.organization_controller import create_organization_blueprint
from core.exceptions import RoleForbiddenError
from core.serialization import json_error
from core.serialization import json_ready
from middleware.error_handlers import register_error_handlers


class StubDeps:
    def __init__(self):
        self.role = "super_admin"
        self.org_id = "org-1"
        self.auth_role = "admin"
        self.user_sub = "user-sub"

    def extract_role(self):
        return self.role

    def extract_auth_context(self):
        return self.org_id, self.auth_role

    def require_super_admin(self, role: str):
        if role != "super_admin":
            raise RoleForbiddenError()

    def extract_user_sub(self):
        return self.user_sub

    def validate_json_schema(self, *_args, **_kwargs):
        raise NotImplementedError("not used in these tests")

    def require_string(self, *_args, **_kwargs):
        raise NotImplementedError("not used in these tests")

    def optional_string(self, *_args, **_kwargs):
        raise NotImplementedError("not used in these tests")


def _build_test_client():
    service = Mock()
    controller = OrganizationController(service, json_ready=json_ready, json_error=json_error)
    deps = StubDeps()

    app = Flask(__name__)
    register_error_handlers(app, json_error=json_error)
    app.register_blueprint(create_organization_blueprint(organization_controller=controller, deps=deps))

    return app.test_client(), service, deps


def test_list_organizations_requires_super_admin():
    client, _service, deps = _build_test_client()
    deps.role = "admin"

    response = client.get("/api/admin/organizations")

    assert response.status_code == 403
    assert response.get_json() == {"code": "ROLE_FORBIDDEN", "error": "forbidden"}


def test_list_organization_users_allows_admin_from_same_org():
    client, service, deps = _build_test_client()
    deps.role = "admin"
    deps.auth_role = "admin"
    deps.org_id = "org-1"
    service.list_organization_users.return_value = [{"username": "alice"}]

    response = client.get("/api/admin/organizations/org-1/users")

    assert response.status_code == 200
    assert response.get_json() == [{"username": "alice"}]
    service.list_organization_users.assert_called_once_with("org-1")


def test_list_organization_users_blocks_admin_from_other_org():
    client, service, deps = _build_test_client()
    deps.role = "admin"
    deps.auth_role = "admin"
    deps.org_id = "org-2"

    response = client.get("/api/admin/organizations/org-1/users")

    assert response.status_code == 403
    assert response.get_json() == {"code": "ROLE_FORBIDDEN", "error": "forbidden"}
    service.list_organization_users.assert_not_called()


def test_list_organization_users_allows_super_admin():
    client, service, deps = _build_test_client()
    deps.role = "super_admin"
    service.list_organization_users.return_value = [{"username": "root"}]

    response = client.get("/api/admin/organizations/org-99/users")

    assert response.status_code == 200
    assert response.get_json() == [{"username": "root"}]
    service.list_organization_users.assert_called_once_with("org-99")
