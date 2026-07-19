#!/usr/bin/env bash
# Menghentikan seluruh stack development (data MongoDB tetap tersimpan di volume)
set -euo pipefail
cd "$(dirname "$0")"

# Muat konfigurasi (COMPOSE_PROJECT_NAME dipakai docker compose untuk memilih stack yang benar)
[ -f .env ] && { set -a; . ./.env; set +a; }
PROJ="${COMPOSE_PROJECT_NAME:-flowdesk}"

docker compose down
echo "[OK] Stack '${PROJ}' dihentikan. Data MongoDB aman di volume '${PROJ}_mongo_data'."
echo "     Hapus data total (HATI-HATI): docker compose down -v"
