import os
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import Config
from services.errors import register_error_handlers
from services.supabase_client import get_supabase
from routes.applications import applications_bp
from routes.matching import matching_bp
from routes.interview import interview_bp
from routes.skill_gaps import skill_gaps_bp
from routes.peers import peers_bp


def create_app():
    app = Flask(__name__)
    default_origins = "http://localhost:5173,http://127.0.0.1:5173,https://career-os-two-woad.vercel.app"
    origins = [
        o.strip()
        for o in os.environ.get("ALLOWED_ORIGINS", default_origins).split(",")
        if o.strip()
    ]
    CORS(app, origins=origins, supports_credentials=True)

    register_error_handlers(app)

    app.register_blueprint(applications_bp)
    app.register_blueprint(matching_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(skill_gaps_bp)
    app.register_blueprint(peers_bp)

    @app.get("/api/health")
    def health():
        ping_db = request.args.get("ping_db", "").lower() in ("true", "1", "yes")
        db_status = "skipped"
        if ping_db:
            try:
                sb = get_supabase()
                # Run lightweight query to touch Supabase and keep the project active
                sb.table("applications").select("id").limit(1).execute()
                db_status = "active"
            except Exception as e:
                db_status = f"error: {e}"

        return jsonify({
            "status": "ok",
            "render": "awake",
            "supabase": db_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return app


app = create_app()

if __name__ == "__main__":
    Config.validate()
    app.run(debug=Config.FLASK_ENV == "development", port=5000)
