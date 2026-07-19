#!/usr/bin/env bash
# ============================================================
# FlowDesk — Reset & Seed Database (Docker Compose lokal)
# Menghapus SELURUH data dan menyisakan hanya 1 superadmin +
# peran default (admin/manager/member). Pengaturan sistem
# direset ke nilai default.
#
# Kredensial superadmin diambil dari deploy/local/.env
# (ADMIN_EMAIL / ADMIN_PASSWORD). Default: admin@flowdesk.com / admin123
#
# Cara pakai:
#   ./seed.sh          # minta konfirmasi ketik 'YA'
#   ./seed.sh -y       # tanpa konfirmasi (untuk skrip/CI)
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

# Muat konfigurasi lokal (COMPOSE_PROJECT_NAME/port) agar docker compose
# menyasar stack yang benar dan ringkasan port akurat.
[ -f .env ] && { set -a; . ./.env; set +a; }

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
SERVICE="backend"

command -v docker >/dev/null || { echo -e "${RED}docker tidak ditemukan. Install Docker terlebih dulu.${NC}"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo -e "${RED}docker compose v2 tidak tersedia.${NC}"; exit 1; }

# Pastikan container backend berjalan (start otomatis bila belum)
if ! docker compose ps --status running "$SERVICE" 2>/dev/null | grep -q "$SERVICE"; then
  echo -e "${YELLOW}[i] Container '$SERVICE' belum berjalan. Menjalankan stack...${NC}"
  docker compose up -d
  echo -e "${YELLOW}[i] Menunggu backend siap...${NC}"
  sleep 5
fi

# Konfirmasi (lewati bila -y / --force)
FORCE="false"
case "${1:-}" in
  -y|--yes|--force) FORCE="true" ;;
esac

if [ "$FORCE" != "true" ]; then
  echo -e "${RED}PERINGATAN:${NC} Ini akan MENGHAPUS SEMUA DATA (tugas, rapat, catatan,"
  echo    "            pengingat, lampiran, notifikasi, log) dan mereset sistem."
  read -r -p "Ketik 'YA' untuk melanjutkan: " ans
  if [ "$ans" != "YA" ]; then
    echo "Dibatalkan."
    exit 0
  fi
fi

echo -e "${YELLOW}[i] Menjalankan seeder di dalam container '$SERVICE'...${NC}"
docker compose exec -T "$SERVICE" python seed.py --force

echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN} Reset selesai. Database bersih siap dipakai.${NC}"
echo -e "   Login superadmin: ${ADMIN_EMAIL:-admin@flowdesk.com} / ${ADMIN_PASSWORD:-admin123}"
echo -e "${GREEN}=====================================================${NC}"
