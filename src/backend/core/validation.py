from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from flask import request


@dataclass(frozen=True)
class JsonField:
    required: bool = False


@dataclass(frozen=True)
class JsonSchema:
    fields: dict[str, JsonField]


def validate_json_schema(schema: JsonSchema):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("invalid JSON body")

    unknown = sorted([key for key in payload.keys() if key not in schema.fields])
    if unknown:
        raise ValueError(f"unknown fields: {', '.join(unknown)}")

    required_fields = [name for name, field in schema.fields.items() if field.required]
    missing = [field for field in required_fields if payload.get(field) in (None, "")]
    if missing:
        raise ValueError(f"missing required fields: {', '.join(missing)}")

    return payload


def require_string(payload: dict, field: str, *, min_length: int = 1, max_length: int = 5000) -> str:
    value = payload.get(field)
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    value = value.strip()
    if len(value) < min_length:
        raise ValueError(f"{field} must not be empty")
    if len(value) > max_length:
        raise ValueError(f"{field} exceeds maximum length")
    return value


def optional_string(payload: dict, field: str, *, max_length: int = 5000) -> str | None:
    value = payload.get(field)
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    value = value.strip()
    if len(value) > max_length:
        raise ValueError(f"{field} exceeds maximum length")
    return value


def require_int(payload: dict, field: str, *, min_value: int | None = None, max_value: int | None = None) -> int:
    value = payload.get(field)
    if isinstance(value, bool):
        raise ValueError(f"{field} must be an integer")
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be an integer") from None

    if min_value is not None and parsed < min_value:
        raise ValueError(f"{field} must be >= {min_value}")
    if max_value is not None and parsed > max_value:
        raise ValueError(f"{field} must be <= {max_value}")
    return parsed


def optional_int(payload: dict, field: str, *, min_value: int | None = None, max_value: int | None = None) -> int | None:
    if payload.get(field) is None:
        return None
    return require_int(payload, field, min_value=min_value, max_value=max_value)


def optional_bool(payload: dict, field: str, *, default: bool = False) -> bool:
    value = payload.get(field)
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    raise ValueError(f"{field} must be a boolean")


def optional_string_list(payload: dict, field: str) -> list[str]:
    value = payload.get(field)
    if value is None:
        return []
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValueError(f"{field} must be a list of strings")
    return value


def require_date_yyyy_mm_dd(payload: dict, field: str) -> str:
    value = require_string(payload, field, max_length=10)
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"{field} must be YYYY-MM-DD") from None
    return value
