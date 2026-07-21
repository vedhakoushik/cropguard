from supabase import create_client, Client
from config import Config

_client: Client = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
    return _client
