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

    @app.errorhandler(Exception)
    def handle_unexpected_error(err):
        # Never leak internals to the client; log server-side instead.
        app.logger.exception("Unhandled exception")
        return jsonify({"error": "Internal server error"}), 500
