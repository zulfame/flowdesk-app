"""External S3-compatible object storage using boto3, configured at runtime from settings."""
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError


def _client(cfg: dict):
    return boto3.client(
        "s3",
        endpoint_url=cfg.get("endpoint") or None,
        aws_access_key_id=cfg.get("access_key"),
        aws_secret_access_key=cfg.get("secret_key"),
        region_name=cfg.get("region") or "us-east-1",
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def _full_key(cfg: dict, name: str) -> str:
    prefix = (cfg.get("path") or "").strip("/")
    return f"{prefix}/{name}" if prefix else name


def is_configured(cfg: dict) -> bool:
    return bool(cfg and cfg.get("endpoint") and cfg.get("bucket")
               and cfg.get("access_key") and cfg.get("secret_key"))


def test_connection(cfg: dict) -> dict:
    if not is_configured(cfg):
        return {"ok": False, "message": "Konfigurasi S3 belum lengkap"}
    try:
        client = _client(cfg)
        client.head_bucket(Bucket=cfg["bucket"])
        return {"ok": True, "message": "Koneksi S3 berhasil"}
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchBucket"):
            return {"ok": False, "message": "Bucket tidak ditemukan"}
        if code in ("403", "AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"):
            return {"ok": False, "message": "Kredensial S3 ditolak"}
        return {"ok": False, "message": f"Gagal terhubung: {code or str(e)}"}
    except Exception as e:
        return {"ok": False, "message": f"Gagal terhubung: {e}"}


def put_bytes(cfg: dict, name: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    client = _client(cfg)
    key = _full_key(cfg, name)
    client.put_object(Bucket=cfg["bucket"], Key=key, Body=data, ContentType=content_type)
    return key


def get_bytes(cfg: dict, key: str) -> bytes:
    client = _client(cfg)
    resp = client.get_object(Bucket=cfg["bucket"], Key=key)
    return resp["Body"].read()


def delete_key(cfg: dict, key: str):
    client = _client(cfg)
    client.delete_object(Bucket=cfg["bucket"], Key=key)
