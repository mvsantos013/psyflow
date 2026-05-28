from __future__ import annotations

from core.exceptions import DomainError


def register_error_handlers(app, *, json_error):
    @app.errorhandler(DomainError)
    def _handle_domain_error(error: DomainError):
        return json_error(error.status_code, error.error_code, error.message)

    @app.errorhandler(ValueError)
    def _handle_value_error(error: ValueError):
        return json_error(400, "BAD_REQUEST", str(error))
