import json
from db import db

_keys = None


async def get_keys():
    global _keys
    if _keys:
        return _keys
    doc = await db.push_config.find_one({"key": "vapid"}, {"_id": 0})
    if not doc:
        from py_vapid import Vapid01
        from cryptography.hazmat.primitives import serialization
        from py_vapid.jwt import b64urlencode
        v = Vapid01()
        v.generate_keys()
        priv = v.private_key.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
        ).decode()
        raw = v.public_key.public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
        )
        pub = b64urlencode(raw)
        doc = {"key": "vapid", "private_pem": priv, "public_key": pub}
        await db.push_config.insert_one(dict(doc))
        doc.pop("_id", None)
    _keys = {"private_pem": doc["private_pem"], "public_key": doc["public_key"]}
    return _keys


async def send_push(user_id, title, message, link="/"):
    try:
        from pywebpush import webpush, WebPushException
    except Exception:
        return
    keys = await get_keys()
    q = {} if user_id is None else {"user_id": user_id}
    subs = await db.push_subscriptions.find(q, {"_id": 0}).to_list(2000)
    payload = json.dumps({"title": title, "body": message, "url": link})
    for s in subs:
        try:
            webpush(subscription_info=s["subscription"], data=payload,
                    vapid_private_key=keys["private_pem"],
                    vapid_claims={"sub": "mailto:admin@flowdesk.com"})
        except WebPushException as e:
            code = getattr(getattr(e, "response", None), "status_code", None)
            if code in (404, 410):
                await db.push_subscriptions.delete_one({"endpoint": s.get("endpoint")})
        except Exception:
            pass
