from __future__ import annotations

import time


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter.

    This implementation is process-local and is intentionally kept behind an
    interface-like class so we can swap to Redis or another distributed store
    without changing route handlers.
    """

    def __init__(self):
        self._state: dict[str, list[float]] = {}

    def _key(self, scope: str, org_id: str | None, user_id: str | None) -> str:
        return f"{scope}|org:{org_id or '-'}|user:{user_id or '-'}"

    def allow(
        self,
        *,
        scope: str,
        org_id: str | None,
        user_id: str | None,
        limit: int,
        window_seconds: int,
    ) -> bool:
        now = time.time()
        window_start = now - window_seconds
        key = self._key(scope, org_id, user_id)
        hits = [ts for ts in self._state.get(key, []) if ts >= window_start]
        if len(hits) >= limit:
            self._state[key] = hits
            return False

        hits.append(now)
        self._state[key] = hits
        return True
