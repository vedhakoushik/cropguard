import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY        = os.getenv("SECRET_KEY", "cropguard-secret-key")
    SUPABASE_URL      = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY      = os.getenv("SUPABASE_KEY", "")
    GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "")
    SUPABASE_BUCKET   = os.getenv("SUPABASE_BUCKET", "crop-images")
    MAX_IMAGE_MB      = int(os.getenv("MAX_IMAGE_MB", "10"))
    DEBUG             = os.getenv("DEBUG", "true").lower() == "true"
