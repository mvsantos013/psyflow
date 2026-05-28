from __future__ import annotations

import os


def env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def optional_env(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def uploads_bucket_name() -> str | None:
    return optional_env("AUDIO_UPLOADS_BUCKET_NAME") or optional_env("TRANSCRIPTIONS_BUCKET_NAME")
