from functools import lru_cache
from flask import has_app_context, g
from supabase import create_client, Client

from config import Config


@lru_cache(maxsize=1)
def _get_base_client() -> Client:
    """Returns a cached base Supabase client. Uses service role key if provided, else anon key."""
    Config.validate()
    url = Config.SUPABASE_URL.strip()
    key = (Config.SUPABASE_SERVICE_ROLE_KEY or Config.SUPABASE_KEY).strip()
    return create_client(url, key)


def get_supabase() -> Client:
    """Returns the Supabase client.
    If a request context is active and has a user token (from require_auth),
    and no service role key is configured, PostgREST is authenticated with
    the user's JWT so Postgres Row Level Security (RLS) sees auth.uid() == user_id.
    """
    client = _get_base_client()
    if not Config.SUPABASE_SERVICE_ROLE_KEY:
        if has_app_context() and getattr(g, "user_token", None):
            client.postgrest.auth(g.user_token)
        else:
            client.postgrest.auth(Config.SUPABASE_KEY)
    return client
