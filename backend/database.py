"""Supabase database connection."""

import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env from current dir or parent dir
env_path = Path(__file__).resolve().parent.parent / '.env'
if not env_path.exists():
    env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(env_path)

# Supabase configuration (support both SUPABASE_KEY and SUPABASE_ANON_KEY)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")

# Supabase client (lazy initialization)
_supabase_client: Client = None


def get_supabase() -> Client:
    """Get or create the Supabase client."""
    global _supabase_client

    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables. "
                "Add them to your .env file."
            )
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

    return _supabase_client


def is_supabase_configured() -> bool:
    """Check if Supabase is configured."""
    return bool(SUPABASE_URL and SUPABASE_KEY)
