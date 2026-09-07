from flask import jsonify


class ApiError(Exception):
    """Raised for expected, user-facing errors (bad input, not found, etc.)."""

    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(err):
        return jsonify({"error": err.message}), err.status_code

    @app.errorhandler(404)
    def handle_not_found(err):
        return jsonify({"error": "Not found"}), 404

    try:
        from postgrest.exceptions import APIError as PostgrestError

        @app.errorhandler(PostgrestError)
        def handle_postgrest_error(err):
            app.logger.warning(f"PostgREST error: {err}")
            code = str(getattr(err, "code", "") or "")
            msg = str(getattr(err, "message", "") or "")
            if not code and hasattr(err, "json"):
                try:
                    payload = err.json()
                    if isinstance(payload, dict):
                        code = str(payload.get("code", ""))
                        msg = str(payload.get("message", ""))
                except Exception:
                    pass
            if not msg and err.args:
                msg = str(err.args[0])
            if code == "42501":
                return jsonify({"error": "Database permission denied. Please log in again to refresh your credentials."}), 403
            if code == "PGRST205" or "schema cache" in msg or code == "42703":
                return jsonify({"error": f"Database schema mismatch: {msg}"}), 503
            return jsonify({"error": msg or "Database request failed."}), 500
    except ImportError:
        pass

    @app.errorhandler(Exception)
    def handle_unexpected_error(err):
        # Never leak internals to the client; log server-side instead.
        app.logger.exception("Unhandled exception")
        return jsonify({"error": "Internal server error"}), 500
