from __future__ import annotations

import jwt
from flask import g, request

from core.exceptions import AuthClaimsInvalidError
from core.exceptions import AuthTokenRequiredError
from core.exceptions import OrgRequiredError
from core.exceptions import RoleForbiddenError
from core.exceptions import RoleRequiredError

_KNOWN_ROLES = {"admin", "therapist", "assistant", "super_admin"}
_WRITE_ROLES = {"admin", "therapist", "super_admin"}


def extract_claims() -> dict:
    cached = getattr(g, "auth_claims", None)
    if isinstance(cached, dict):
        return cached

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise AuthTokenRequiredError()

    token = auth_header[7:]
    payload = jwt.decode(
        token,
        options={
            "verify_signature": False,
            "verify_exp": False,
            "verify_aud": False,
        },
    )

    if not isinstance(payload, dict):
        raise AuthClaimsInvalidError()

    g.auth_claims = payload
    return payload


def extract_user_sub() -> str | None:
    claims = extract_claims()
    sub = claims.get("sub")
    return str(sub) if isinstance(sub, str) and sub else None


def extract_org_id() -> str:
    auth_context = getattr(g, "auth_context", None)
    if isinstance(auth_context, dict):
        org_id = auth_context.get("org_id")
        if isinstance(org_id, str) and org_id:
            return org_id

    payload = extract_claims()
    org_id = payload.get("custom:org_id")
    if not org_id:
        raise OrgRequiredError()
    return str(org_id)


def extract_auth_context() -> tuple[str, str]:
    cached = getattr(g, "auth_context", None)
    if isinstance(cached, dict):
        org_id = cached.get("org_id")
        role = cached.get("role")
        if isinstance(org_id, str) and org_id and isinstance(role, str) and role in _KNOWN_ROLES:
            return org_id, role

    payload = extract_claims()

    org_id = payload.get("custom:org_id")
    if not org_id:
        raise OrgRequiredError()

    role = payload.get("custom:role")
    if not role:
        raise RoleRequiredError()
    role = str(role)
    if role not in _KNOWN_ROLES:
        raise RoleForbiddenError()

    g.auth_context = {"org_id": str(org_id), "role": role}

    return str(org_id), role


def extract_role() -> str:
    cached = getattr(g, "auth_role", None)
    if isinstance(cached, str) and cached in _KNOWN_ROLES:
        return cached

    payload = extract_claims()

    role = payload.get("custom:role")
    if not role:
        raise RoleRequiredError()
    role = str(role)
    if role not in _KNOWN_ROLES:
        raise RoleForbiddenError()

    g.auth_role = role
    return role


def require_write_role(role: str):
    if role not in _WRITE_ROLES:
        raise RoleForbiddenError()


def require_super_admin(role: str):
    if role != "super_admin":
        raise RoleForbiddenError()
