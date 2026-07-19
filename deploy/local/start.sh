#!/usr/bin/env bash
# ============================================================
# FlowDesk — Start stack development lokal (Docker Compose)
#
# Saat SETUP AWAL (belum ada .env) akan muncul WIZARD untuk memilih:
#   • Nama project (prefiks unik container/volume/network)
#   • Port Frontend / Backend / MongoDB / Mongo Express
# Ini mencegah bentrok bila menjalankan >1 project Emergent di 1 mesin.
#
# Flag:
#   ./start.sh                 # pakai .env yang ada, atau wizard bila belum ada
#   ./start.sh --reconfigure   # jalankan wizard lagi (timpa .env)
#   ./start.sh -y | --yes      # non-interaktif: pakai nilai default
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'

command -v docker >/dev/null || { echo -e "${RED}docker tidak ditemukan. Install Docker terlebih dulu.${NC}"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo -e "${RED}docker compose v2 tidak tersedia.${NC}"; exit 1; }

RECONFIGURE="false"; NONINTERACTIVE="false"
case "${1:-}" in
  --reconfigure) RECONFIGURE="true" ;;
  -y|--yes)      NONINTERACTIVE="true" ;;
esac

# Cek apakah sebuah port TCP sedang dipakai di host (best-effort, lintas OS)
port_in_use() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 && return 0 || return 1
  fi
  # Fallback: coba buka koneksi TCP via bash
  (exec 3<>"/dev/tcp/127.0.0.1/$p") >/dev/null 2>&1 && { exec 3>&- 3<&-; return 0; } || return 1
}

# Tanya port dengan default; peringatkan bila sudah dipakai
ask_port() {
  local label="$1" default="$2" val
  while true; do
    read -r -p "  $label [$default]: " val
    val="${val:-$default}"
    if ! [[ "$val" =~ ^[0-9]+$ ]] || [ "$val" -lt 1 ] || [ "$val" -gt 65535 ]; then
      echo -e "    ${RED}Port tidak valid. Masukkan angka 1-65535.${NC}"; continue
    fi
    if port_in_use "$val"; then
      echo -e "    ${YELLOW}Port $val sepertinya sedang dipakai. Pilih port lain bila stack lain aktif.${NC}"
      read -r -p "    Tetap pakai $val? [y/N]: " keep
      [[ "${keep:-N}" =~ ^[Yy]$ ]] || continue
    fi
    echo "$val"; return
  done
}

write_env() {
  local proj="$1" fe="$2" be="$3" mo="$4" me="$5"
  cat > .env <<ENV
# Dibuat oleh start.sh — aman diedit manual.
COMPOSE_PROJECT_NAME=$proj

FRONTEND_PORT=$fe
BACKEND_PORT=$be
MONGO_PORT=$mo
MONGO_EXPRESS_PORT=$me

DB_NAME=flowdesk
CORS_ORIGINS=*
JWT_SECRET=local-dev-secret
REACT_APP_BACKEND_URL=http://localhost:$be

ADMIN_EMAIL=admin@flowdesk.com
ADMIN_PASSWORD=admin123
ME_USER=admin
ME_PASS=admin
ENV
}

run_wizard() {
  echo -e "${BLUE}=====================================================${NC}"
  echo -e "${BLUE} FlowDesk — Wizard Setup Lokal${NC}"
  echo -e "${BLUE}=====================================================${NC}"
  echo -e "${YELLOW}Tekan Enter untuk memakai nilai default di dalam [ ].${NC}\n"

  local proj fe be mo me
  read -r -p "  Nama project (prefiks container/volume) [flowdesk]: " proj
  proj="${proj:-flowdesk}"
  # sanitasi: hanya huruf kecil, angka, underscore/strip
  proj="$(echo "$proj" | tr '[:upper:] ' '[:lower:]_' | tr -cd 'a-z0-9_-')"
  [ -z "$proj" ] && proj="flowdesk"

  fe="$(ask_port 'Port Frontend   ' 3000)"
  be="$(ask_port 'Port Backend API' 8001)"
  mo="$(ask_port 'Port MongoDB     ' 27017)"
  me="$(ask_port 'Port MongoExpress' 8081)"

  write_env "$proj" "$fe" "$be" "$mo" "$me"
  echo -e "\n${GREEN}[OK] .env dibuat untuk project '${proj}'.${NC}\n"
}

# ---------- Tentukan sumber konfigurasi ----------
if [ "$RECONFIGURE" = "true" ]; then
  run_wizard
elif [ ! -f .env ]; then
  if [ "$NONINTERACTIVE" = "true" ] || [ ! -t 0 ]; then
    write_env "flowdesk" 3000 8001 27017 8081
    echo -e "${YELLOW}[i] Mode non-interaktif — .env default dibuat.${NC}"
  else
    run_wizard
  fi
else
  echo -e "${YELLOW}[i] Memakai .env yang sudah ada. Jalankan './start.sh --reconfigure' untuk mengganti port/nama.${NC}"
fi

# Muat konfigurasi untuk ringkasan
set -a; . ./.env; set +a
PROJ="${COMPOSE_PROJECT_NAME:-flowdesk}"
FE="${FRONTEND_PORT:-3000}"; BE="${BACKEND_PORT:-8001}"; MEP="${MONGO_EXPRESS_PORT:-8081}"

docker compose up -d --build

echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN} Stack '${PROJ}' berjalan:${NC}"
echo -e "   Frontend      : http://localhost:${FE}"
echo -e "   Backend API   : http://localhost:${BE}/api/"
echo -e "   Mongo Express : http://localhost:${MEP}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${YELLOW}Login superadmin awal:${NC} ${ADMIN_EMAIL:-admin@flowdesk.com} / ${ADMIN_PASSWORD:-admin123} (ganti setelah login)"
