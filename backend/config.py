import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")

    @classmethod
    def validate(cls):
        """Checks only the vars every request needs (Supabase). GROQ_API_KEY
        is intentionally not required here — the applications tracker and
        matcher work with zero AI configured; only interview routes need it,
        and llm_client.generate() checks for it at call time instead, so a
        missing key degrades to a clean 503 on just those routes rather than
        blocking the whole app from starting.
        """
        missing = [
            name
            for name in ("SUPABASE_URL", "SUPABASE_KEY")
            if not getattr(cls, name)
        ]
        if missing:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing)}. "
                "Copy .env.example to .env and fill them in."
            )
