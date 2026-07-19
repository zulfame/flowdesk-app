#!/usr/bin/env bash
# Menjalankan seluruh stack development lokal di background (Docker Compose)
set -euo pipefail
cd "$(dirname "$0")"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

command -v docker >/dev/null || { echo "docker tidak ditemukan. Install Docker terlebih dulu."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose v2 tidak tersedia."; exit 1; }

# Buat .env dari template; bila template tidak ada, generate default
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${YELLOW}[i] .env dibuat dari .env.example — sesuaikan bila perlu.${NC}"
  else
    cat > .env <<'ENV'
DB_NAME=flowdesk
CORS_ORIGINS=*
JWT_SECRET=local-dev-secret
REACT_APP_BACKEND_URL=http://localhost:8001
ADMIN_EMAIL=admin@flowdesk.com
ADMIN_PASSWORD=admin123
ME_USER=admin
ME_PASS=admin
ENV
    echo -e "${YELLOW}[i] .env.example tidak ditemukan — .env default dibuat otomatis.${NC}"
  fi
fi

docker compose up -d --build

echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN} Stack development FlowDesk berjalan:${NC}"
echo -e "   Frontend      : http://localhost:3000"
echo -e "   Backend API   : http://localhost:8001/api/"
echo -e "   Mongo Express : http://localhost:8081"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${YELLOW}Login superadmin awal:${NC} admin@flowdesk.com / admin123 (ganti setelah login)"
