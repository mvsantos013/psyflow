from __future__ import annotations


class DomainError(Exception):
    def __init__(self, *, status_code: int, error_code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.message = message


class OrgRequiredError(DomainError):
    def __init__(self):
        super().__init__(status_code=403, error_code="ORG_REQUIRED", message="forbidden")


class RoleRequiredError(DomainError):
    def __init__(self):
        super().__init__(status_code=403, error_code="ROLE_REQUIRED", message="forbidden")


class RoleForbiddenError(DomainError):
    def __init__(self):
        super().__init__(status_code=403, error_code="ROLE_FORBIDDEN", message="forbidden")


class AuthTokenRequiredError(DomainError):
    def __init__(self):
        super().__init__(status_code=403, error_code="AUTH_REQUIRED", message="forbidden")


class AuthClaimsInvalidError(DomainError):
    def __init__(self):
        super().__init__(status_code=403, error_code="AUTH_INVALID", message="forbidden")


class RateLimitedError(DomainError):
    def __init__(self):
        super().__init__(status_code=429, error_code="RATE_LIMITED", message="too many requests")


class RateLimitPolicyError(DomainError):
    def __init__(self):
        super().__init__(status_code=403, error_code="RATE_LIMIT_POLICY_INVALID", message="forbidden")


class OrganizationNotFoundError(DomainError):
    def __init__(self):
        super().__init__(status_code=404, error_code="ORGANIZATION_NOT_FOUND", message="organization not found")


class OrganizationConflictError(DomainError):
    def __init__(self):
        super().__init__(status_code=409, error_code="ORGANIZATION_CONFLICT", message="organization already exists")
