from functools import wraps

from flask import request, g

from services.supabase_client import get_supabase
from services.errors import ApiError


def require_auth(view_func):
    """Verifies the Supabase-issued JWT in the Authorization header and
    attaches the authenticated user's id to `g.user_id`. Every module route
    other than health checks should be wrapped with this.
    """

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise ApiError("Missing or malformed Authorization header.", status_code=401)

        token = auth_header.removeprefix("Bearer ").strip()
        sb = get_supabase()
        try:
            user_res = sb.auth.get_user(token)
        except Exception as exc:
            raise ApiError("Invalid or expired session.", status_code=401) from exc

        if not user_res or not user_res.user:
            raise ApiError("Invalid or expired session.", status_code=401)

        g.user_id = user_res.user.id
        return view_func(*args, **kwargs)

    return wrapper
