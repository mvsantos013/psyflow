from __future__ import annotations

from decimal import Decimal

from flask import jsonify


def json_ready(value):
    if isinstance(value, list):
        return [json_ready(item) for item in value]
    if isinstance(value, dict):
        return {key: json_ready(item) for key, item in value.items()}
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    return value


def json_error(status: int, code: str, message: str):
    return jsonify({"error": message, "code": code}), status
