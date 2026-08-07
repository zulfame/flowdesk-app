import base64
import hashlib
import logging
import os

from cryptography.fernet import Fernet, InvalidToken

PREFIX = "enc:v1:"
logger = logging.getLogger(__name__)


def _build_fernet():
    """Terima kunci Fernet apa adanya; kunci bebas (mis. hex) diturunkan, tidak membuat app crash."""
    key = os.environ.get("APP_ENCRYPTION_KEY")
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except ValueError:
        derived = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
        logger.warning(
            "APP_ENCRYPTION_KEY bukan kunci Fernet (32 byte base64 url-safe); "
            "kunci diturunkan otomatis via SHA-256. Untuk kunci baku jalankan: "
            "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
        return Fernet(derived)


_fernet = _build_fernet()


def encrypt(value):
    """Enkripsi idempoten — nilai yang sudah berawalan PREFIX dibiarkan."""
    if _fernet is None or not isinstance(value, str) or not value or value.startswith(PREFIX):
        return value
    return PREFIX + _fernet.encrypt(value.encode()).decode()


def decrypt(value):
    if not isinstance(value, str) or not value.startswith(PREFIX):
        return value
    if _fernet is None:
        return ""
    try:
        return _fernet.decrypt(value[len(PREFIX):].encode()).decode()
    except InvalidToken:
        return ""


def mask(value: str, keep: int = 4) -> str:
    value = value or ""
    if not value:
        return ""
    if len(value) <= keep:
        return "•" * len(value)
    return "•" * min(12, len(value) - keep) + value[-keep:]
