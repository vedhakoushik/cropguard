import boto3

from config import Config

_s3 = None


def _client():
    global _s3
    if _s3 is None:
        _s3 = boto3.client("s3", region_name=Config.AWS_REGION)
    return _s3


def upload_image(key: str, data: bytes, content_type: str) -> None:
    _client().put_object(
        Bucket=Config.S3_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


def presigned_url(key: str, expires: int = 3600) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": Config.S3_BUCKET, "Key": key},
        ExpiresIn=expires,
    )
