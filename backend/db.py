import os

from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ.get("MONGO_URL")
if not mongo_url:
    raise RuntimeError(
        "MONGO_URL belum diset. Isi variabel MONGO_URL di backend/.env atau di panel "
        "deploy Anda, mis. mongodb://localhost:27017 (atau nama service Mongo pada Docker)."
    )

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "flowdesk")]
