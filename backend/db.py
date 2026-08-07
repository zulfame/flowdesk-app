import logging
import os

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

mongo_url = (os.environ.get("MONGO_URL") or "").strip().strip('"').strip("'")
if not mongo_url:
    mongo_url = "mongodb://localhost:27017"
    logger.warning(
        "MONGO_URL belum diset — memakai default %s. Isi MONGO_URL di backend/.env "
        "atau di panel deploy Anda (mis. mongodb://mongodb:27017 pada Docker).",
        mongo_url,
    )

client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=int(os.environ.get("MONGO_TIMEOUT_MS", "5000")),
)
db = client[os.environ.get("DB_NAME", "flowdesk")]
