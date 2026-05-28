from __future__ import annotations

import time
import uuid

from flask import g, request


def setup_request_logging(app, *, logger, mask_id):
    @app.before_request
    def _before_request_log_context():
        g.request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        g.request_started_at = time.perf_counter()

    @app.after_request
    def _after_request_log(response):
        started = getattr(g, "request_started_at", None)
        duration_ms = 0
        if isinstance(started, float):
            duration_ms = int((time.perf_counter() - started) * 1000)

        request_id = getattr(g, "request_id", str(uuid.uuid4()))
        org_id = None
        user_id = None
        try:
            claims = getattr(g, "auth_claims", None)
            if isinstance(claims, dict):
                raw_org = claims.get("custom:org_id")
                raw_sub = claims.get("sub")
                org_id = str(raw_org) if isinstance(raw_org, str) else None
                user_id = str(raw_sub) if isinstance(raw_sub, str) else None
        except Exception:
            org_id = None
            user_id = None

        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "org": mask_id(org_id),
                "user": mask_id(user_id),
            },
        )

        response.headers["x-request-id"] = request_id
        return response
