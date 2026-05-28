from __future__ import annotations


def setup_auth_context(app, *, extract_claims):
    @app.before_request
    def _populate_auth_context():
        try:
            extract_claims()
        except Exception:
            # Endpoints that require auth will fail when they read auth context.
            return None
