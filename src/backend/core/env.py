from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


def _load_env_files() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    for filename in (".env.local", ".env"):
        env_path = backend_root / filename
        if env_path.exists():
            load_dotenv(env_path, override=False)


_load_env_files()


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
