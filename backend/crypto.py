import os

from cryptography.fernet import Fernet, InvalidToken

PREFIX = "enc:v1:"
_key = os.environ.get("APP_ENCRYPTION_KEY")
_fernet = Fernet(_key.encode()) if _key else None


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
