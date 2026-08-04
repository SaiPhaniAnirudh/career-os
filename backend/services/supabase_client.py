from functools import lru_cache

from supabase import create_client, Client

from config import Config


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Returns a cached Supabase client. Raises clearly if config is missing."""
    Config.validate()
    return create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
