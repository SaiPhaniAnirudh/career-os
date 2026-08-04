from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from services.errors import register_error_handlers
from routes.applications import applications_bp
from routes.matching import matching_bp
from routes.interview import interview_bp


def create_app():
    app = Flask(__name__)
    CORS(app, origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ], supports_credentials=True)

    register_error_handlers(app)

    app.register_blueprint(applications_bp)
    app.register_blueprint(matching_bp)
    app.register_blueprint(interview_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


app = create_app()

if __name__ == "__main__":
    Config.validate()
    app.run(debug=Config.FLASK_ENV == "development", port=5000)
