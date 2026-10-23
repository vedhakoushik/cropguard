import json
import os

from dotenv import load_dotenv

load_dotenv()


def _load_secret() -> dict:
    secret_id = os.getenv("SECRET_ID")
    if not secret_id:
        return {}
    import boto3
    client = boto3.client("secretsmanager", region_name=os.getenv("AWS_REGION", "us-east-1"))
    return json.loads(client.get_secret_value(SecretId=secret_id)["SecretString"])


_secret = _load_secret()


def _get(name: str, default: str = "") -> str:
    return _secret.get(name) or os.getenv(name, default)


class Config:
    SECRET_KEY        = _get("SECRET_KEY")
    GEMINI_API_KEY    = _get("GEMINI_API_KEY")
    AWS_REGION        = os.getenv("AWS_REGION", "us-east-1")

    DB_HOST           = _get("DB_HOST", "localhost")
    DB_PORT           = int(_get("DB_PORT", "5432"))
    DB_NAME           = _get("DB_NAME", "cropguard")
    DB_USER           = _get("DB_USER", "postgres")
    DB_PASSWORD       = _get("DB_PASSWORD")
    DB_SSLMODE        = _get("DB_SSLMODE", "prefer")
    DB_POOL_MAX       = int(_get("DB_POOL_MAX", "5"))

    S3_BUCKET         = _get("S3_BUCKET")
    COGNITO_CLIENT_ID = _get("COGNITO_CLIENT_ID")

    MAX_IMAGE_MB      = int(os.getenv("MAX_IMAGE_MB", "10"))
    DEBUG             = os.getenv("DEBUG", "false").lower() == "true"

    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not set (env var or Secrets Manager)")
