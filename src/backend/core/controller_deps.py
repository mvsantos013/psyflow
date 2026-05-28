from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class ControllerDeps:
    json_ready: Callable[..., Any]
    json_error: Callable[..., Any]
    extract_org_id: Callable[..., Any]
    extract_auth_context: Callable[..., Any]
    extract_user_sub: Callable[..., Any]
    require_write_role: Callable[..., Any]
    enforce_sensitive_rate_limit: Callable[..., Any]
    validate_json_schema: Callable[..., Any]
    require_string: Callable[..., Any]
    require_int: Callable[..., Any]
    require_date_yyyy_mm_dd: Callable[..., Any]
    optional_string: Callable[..., Any]
    optional_int: Callable[..., Any]
    optional_string_list: Callable[..., Any]
    optional_bool: Callable[..., Any]
    today_yyyy_mm_dd: Callable[..., Any]
    patient_exists: Callable[..., Any]
    session_exists: Callable[..., Any]
