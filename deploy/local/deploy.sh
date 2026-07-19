#!/usr/bin/env bash
# ============================================================
# deploy.sh — Auto pull + rebuild lokal (mirror alur production)
#
# Menyinkronkan container lokal ke commit terbaru tanpa menghafal
# urutan perintah docker compose.
#
# Fitur:
#   • Auto detect branch aktif (git rev-parse --abbrev-ref)
#   • git pull --ff-only (aman, tidak overwrite commit lokal)
#   • Rebuild image KONDISIONAL: hanya bila Dockerfile / requirements /
#     lockfile berubah. Kode biasa (.py/.jsx/.css) LANGSUNG hot-reload
#     lewat volume mount — tanpa rebuild.
#   • Health check pasca restart (backend /api/settings/public + frontend)
#   • Log deploy per baris dengan timestamp & git commit
#
# Flag:
#   SKIP_PULL=1     → lewati git pull (rebuild lokal saja)
#   FORCE_REBUILD=1 → paksa rebuild kedua image
#   NO_RESTART=1    → hanya pull + rebuild, tanpa restart container
# ============================================================
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[STEP]${NC} $1"; }
ok()   { echo -e "${GREEN}[ OK ]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
trap 'fail "Deploy gagal pada baris $LINENO. Rollback manual: docker compose down && git reset --hard @{u}"' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Muat konfigurasi lokal (COMPOSE_PROJECT_NAME + port) bila ada
[ -f "$SCRIPT_DIR/.env" ] && { set -a; . "$SCRIPT_DIR/.env"; set +a; }
FE_PORT="${FRONTEND_PORT:-3000}"
BE_PORT="${BACKEND_PORT:-8001}"
MEP_PORT="${MONGO_EXPRESS_PORT:-8081}"

DEPLOY_LOG="${DEPLOY_LOG:-$APP_DIR/deploy.local.log}"
SKIP_PULL="${SKIP_PULL:-0}"
FORCE_REBUILD="${FORCE_REBUILD:-0}"
NO_RESTART="${NO_RESTART:-0}"

# ---------- Pre-check ----------
command -v docker >/dev/null || fail "docker tidak ditemukan. Install Docker terlebih dulu."
docker compose version >/dev/null 2>&1 || fail "docker compose v2 tidak tersedia. Update Docker."
[ -f "$SCRIPT_DIR/docker-compose.yml" ] || fail "docker-compose.yml tidak ditemukan di $SCRIPT_DIR"
[ -f "$SCRIPT_DIR/.env" ] || warn ".env lokal belum ada — jalankan ./start.sh minimal sekali untuk generate default"

cd "$APP_DIR"

# ---------- 1. Git pull ----------
if [ ! -d ".git" ]; then
  warn "Folder ini bukan git repository — lewati git pull"
  BEFORE=""; AFTER=""; CHANGED_FILES=""
elif [ "$SKIP_PULL" = "1" ]; then
  warn "SKIP_PULL=1 — lewati git pull"
  BEFORE=$(git rev-parse HEAD); AFTER="$BEFORE"; CHANGED_FILES=""
else
  log "Git fetch & pull"
  BEFORE=$(git rev-parse HEAD)
  git fetch --tags origin
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  git pull --ff-only origin "$CURRENT_BRANCH" || fail "git pull gagal (ada commit lokal yang belum di-push?). Selesaikan manual lalu ulangi."
  AFTER=$(git rev-parse HEAD)
  if [ "$BEFORE" = "$AFTER" ]; then
    warn "Tidak ada commit baru pada branch '$CURRENT_BRANCH'"; CHANGED_FILES=""
  else
    ok "Kode: ${BEFORE:0:7} → ${AFTER:0:7} ($(git log --oneline "$BEFORE".."$AFTER" | wc -l | tr -d ' ') commit)"
    CHANGED_FILES=$(git diff --name-only "$BEFORE" "$AFTER")
  fi
fi

# ---------- 2. Deteksi kebutuhan rebuild image ----------
REBUILD_BACKEND=0; REBUILD_FRONTEND=0
if [ "$FORCE_REBUILD" = "1" ]; then
  REBUILD_BACKEND=1; REBUILD_FRONTEND=1
  warn "FORCE_REBUILD=1 — kedua image akan di-rebuild"
elif [ -n "$CHANGED_FILES" ]; then
  if echo "$CHANGED_FILES" | grep -qE "^deploy/(local/flowdesk\.backend|requirements\.runtime\.txt)$"; then
    REBUILD_BACKEND=1; log "Perubahan: Dockerfile / requirements backend → rebuild backend"
  fi
  if echo "$CHANGED_FILES" | grep -qE "^deploy/local/flowdesk\.frontend$"; then
    REBUILD_FRONTEND=1; log "Perubahan: Dockerfile frontend → rebuild frontend"
  fi
  if echo "$CHANGED_FILES" | grep -qE "^frontend/(package\.json|yarn\.lock)$"; then
    REBUILD_FRONTEND=1; log "Perubahan: dependency frontend → rebuild frontend"
  fi
fi
[ "$REBUILD_BACKEND$REBUILD_FRONTEND" = "00" ] && ok "Tidak ada perubahan yang memerlukan rebuild (kode source auto hot-reload via volume mount)"

# ---------- 3. Rebuild image (bila perlu) ----------
cd "$SCRIPT_DIR"
[ "$REBUILD_BACKEND" = "1" ]  && { log "Rebuild image backend"; docker compose build backend; ok "Image backend siap"; }
[ "$REBUILD_FRONTEND" = "1" ] && { log "Rebuild image frontend"; docker compose build frontend; ok "Image frontend siap"; }

# ---------- 4. Restart / start container ----------
if [ "$NO_RESTART" = "1" ]; then
  warn "NO_RESTART=1 — melewati docker compose up"
else
  UP_FLAGS="-d"
  if [ "$REBUILD_FRONTEND" = "1" ] || [ "$REBUILD_BACKEND" = "1" ]; then
    # Segarkan anonymous volume (node_modules) agar dependency baru tidak tertutup volume lama.
    # Named volume (mongo_data) TIDAK terpengaruh → data aman.
    UP_FLAGS="-d --force-recreate --renew-anon-volumes"
    log "docker compose up $UP_FLAGS (segarkan node_modules dari image baru)"
  else
    log "docker compose up -d"
  fi
  # shellcheck disable=SC2086
  docker compose up $UP_FLAGS
  ok "Container aktif"
fi

# ---------- 5. Health check ----------
if [ "$NO_RESTART" != "1" ]; then
  log "Menunggu backend siap (max 40 detik)"
  BACKEND_OK=0
  for i in $(seq 1 40); do
    curl -fsS "http://localhost:${BE_PORT}/api/settings/public" >/dev/null 2>&1 && { BACKEND_OK=1; break; }
    sleep 1
  done
  [ "$BACKEND_OK" = "1" ] && ok "Backend responding: http://localhost:${BE_PORT}/api/settings/public" || warn "Backend belum merespons — cek: docker compose logs backend"

  log "Menunggu frontend siap (max 60 detik — compile awal CRA agak lama)"
  FRONT_OK=0
  for i in $(seq 1 60); do
    curl -fsS "http://localhost:${FE_PORT}" >/dev/null 2>&1 && { FRONT_OK=1; break; }
    sleep 1
  done
  [ "$FRONT_OK" = "1" ] && ok "Frontend responding: http://localhost:${FE_PORT}" || warn "Frontend belum merespons — cek: docker compose logs frontend"
fi

# ---------- 6. Log deploy ----------
{
  TS="$(date -Iseconds)"; MSG="local deploy"
  if [ -n "${BEFORE:-}" ] && [ -n "${AFTER:-}" ] && [ "$BEFORE" != "$AFTER" ]; then
    MSG="${BEFORE:0:7} → ${AFTER:0:7} | $(git log -1 --pretty=format:'%s' "$AFTER" 2>/dev/null || echo '-')"
  fi
  echo "$TS | rebuild=b:$REBUILD_BACKEND f:$REBUILD_FRONTEND | $MSG"
} >> "$DEPLOY_LOG"

echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN} DEPLOY LOKAL SELESAI${NC}"
echo -e "   Frontend      : http://localhost:${FE_PORT}"
echo -e "   Backend API   : http://localhost:${BE_PORT}/api/"
echo -e "   Mongo Express : http://localhost:${MEP_PORT}"
echo -e "   Log deploy    : $DEPLOY_LOG"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${YELLOW}Rollback bila bermasalah:${NC}"
echo -e "   git log --oneline -n 10        # cari commit target"
echo -e "   git reset --hard <commit-sha>  # kembali ke commit"
echo -e "   FORCE_REBUILD=1 ./deploy.sh    # rebuild ulang"
