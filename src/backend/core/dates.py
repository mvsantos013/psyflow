from __future__ import annotations

from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_yyyy_mm_dd() -> str:
    return datetime.now(timezone.utc).date().isoformat()
