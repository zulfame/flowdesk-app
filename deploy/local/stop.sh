#!/usr/bin/env bash
# Menghentikan seluruh stack development (data MongoDB tetap tersimpan di volume)
set -euo pipefail
cd "$(dirname "$0")"
docker compose down
echo "[OK] Semua container dihentikan. Data MongoDB aman di volume 'mongo_data'."
echo "     Hapus data total (HATI-HATI): docker compose down -v"
