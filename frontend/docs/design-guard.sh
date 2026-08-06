#!/usr/bin/env bash
# design-guard.sh — heuristic compact/token guard for the FlowDesk UI.
# Scans AUTHORED feature code (pages, composite, layout, auth) for anti-patterns
# (R05/R06/R09/R39/R41/R42/R43/R44/R45, 2B.8, 2C.14). Exit 0 = clean, Exit 1 = violations.
#
# Scope notes (FlowDesk):
#   - src/components/ui/*  = official shadcn primitives (protected)        → EXCLUDED.
#   - LEGACY list below    = modules NOT yet migrated to the design system → EXCLUDED.
#     The LEGACY list must shrink every migration phase until it is empty
#     (see docs/FLOWDESK_EXCEPTIONS.md · E5).
#   Use inline "// guard-allow" to whitelist a deliberate, documented exception.
#
# Usage:  bash frontend/docs/design-guard.sh
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR/../src"

# Directories of authored feature code (exclude ui/ primitives).
DIRS="$SRC/pages $SRC/components/composite $SRC/components/layout $SRC/components/auth"

# Not-yet-migrated modules + old shared components (phase-scoped exclusions).
LEGACY='/(Dashboard|HelpTickets|Notifications|Settings)\.jsx'
EXCLUDE="$LEGACY"

scan() { grep -rnE "$1" $DIRS --include=*.jsx 2>/dev/null | grep -vE "$EXCLUDE" | grep -vE '//\s*guard-allow'; }

fail=0
report() {
  if [ -n "$2" ]; then
    fail=1
    echo ""
    echo "✗ $1"
    echo "$2" | sed 's/^/    /'
  fi
}

# 1) space-y-6+ inside Card sections → must be space-y-4 / space-y-3.
report "space-y-6+ di dalam Card section (harus space-y-4/space-y-3) — 2B.8 / R39" \
  "$(scan 'Card(Header|Content|Footer)[^>]*className=\"[^\"]*space-y-(6|7|8)')"

# 2) Hardcoded Tailwind colors → use semantic tokens (R05/R06).
report "Warna hardcode Tailwind (pakai token: bg-background/text-foreground/…) — R05/R06" \
  "$(scan '\b(bg|text|border|ring|fill|stroke)-(white|black|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3})\b')"

# 3) Hex color literals.
report "Hex color literal (pakai HSL token di index.css) — R05" \
  "$(scan '#[0-9a-fA-F]{3,6}\b')"

# 4) Emoji used as icons → lucide-react only (R09).
m=$(grep -rnP '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}]' $DIRS --include=*.jsx 2>/dev/null | grep -vE "$EXCLUDE")
report "Emoji terdeteksi (ikon wajib lucide-react) — R09" "$m"

# 5) Oversized profile avatar (density) → h-12 w-12.
report "Avatar terlalu besar (pakai h-12 w-12) — R39 density" \
  "$(scan 'Avatar[^>]*className=\"[^\"]*(h-1[6-9]|h-2[0-9]|w-1[6-9]|w-2[0-9])')"

# 6) Off-scale gap-5 (use gap-4 or gap-6).
report "gap-5 off-scale (pakai gap-4/gap-6) — 2B.4 / R39" \
  "$(scan 'className=\"[^\"]*\bgap-5\b')"

# 7) Leftover console.log/debug/info in authored feature code.
report "console.log/debug/info tersisa (bersihkan sebelum finish; console.error diizinkan) — logging hygiene" \
  "$(scan '\bconsole\.(log|debug|info)\s*\(')"

# 8) Form field alignment: mixing FormItem layout modes misaligns grid rows (R41).
report "FormItem 'flex flex-col' (pakai <FormItem> polos agar field grid sejajar) — R41" \
  "$(scan 'FormItem className=\"[^\"]*flex flex-col')"

# 9) Verbose '(Optional)/(Opsional)' inside FormLabel (R41).
report "Label form verbose '(Optional)/(Opsional)' (pakai placeholder; label ringkas 1 baris) — R41" \
  "$(scan 'FormLabel>[^<]*\((Optional|Opsional)\)')"

# 10) Responsive (R42): fixed pixel width >=120px WITHOUT a mobile `w-full` fallback,
#     scoped to feature pages where toolbars/filters live (auth screens exempt).
PAGES_DIR="$SRC/pages"
scan_pages() { grep -rnE "$1" "$PAGES_DIR" --include=*.jsx 2>/dev/null | grep -vE "$EXCLUDE" | grep -vE '//\s*guard-allow'; }
report "Lebar fiks >=120px tanpa fallback 'w-full' (mobile) di pages — R42 responsif; pakai 'w-full sm:w-[Npx]'" \
  "$(scan_pages 'className=\"[^\"]*\bw-\[(1[2-9][0-9]|[2-9][0-9]{2}|[0-9]{4,})px\]' | grep -vE 'w-full')"

# 11) Responsive tables (R43): must use the shadcn <Table> primitive.
report "Raw <table> di kode fitur (wajib primitive shadcn <Table> agar tabel scroll-x & responsif) — R43" \
  "$(scan '<table[ />>]')"

# 12) Responsive tabs (R44): TabsList must scroll horizontally on mobile.
report "TabsList tanpa 'overflow-x-auto' (wajib scroll-x di mobile; dilarang wrap) — R44" \
  "$(scan '<TabsList\b' | grep -vE 'overflow-x-auto')"

# 13) Typography scale (R45): feature pages stay dense — no oversized headings.
#     Exempt: auth screens (2A hero scale) and the shared PageHeader H1 (2A).
report "Teks oversized (text-xl/2xl/3xl/4xl...) di halaman fitur — R45; judul cukup 'text-base'" \
  "$(scan_pages 'text-(xl|[2-9]xl)' | grep -vE 'Login\.jsx')"

# 21) FD9 — Search placeholder must come from ACTION.search ("Pencarian...").
report "Placeholder pencarian khusus (FD9: WAJIB ACTION.search / 'Pencarian...' dari src/constants/labels.js)" \
  "$(scan 'placeholder=\"(Cari|Search)[^\"]*\"|searchPlaceholder=')"

# 20) FD8 — Label→control gap comes from --item-gap only.
report "space-y/mt manual pada FormItem/FormLabel (FD8: jarak label ke kontrol hanya dari --item-gap; 'space-y-0' untuk baris checkbox diizinkan)" \
  "$(scan '(FormItem|FormLabel)[^>]*className=\"[^\"]*(space-y-[1-9]|mt-[1-9]|mb-[1-9])')"

# 17) FD6 — Card header/footer padding is fixed (compact); no per-page override.
report "Override padding CardHeader/CardFooter (FD6: tinggi Card dikunci px-6 py-3 di primitive)" \
  "$(scan 'Card(Header|Footer)[^>]*className=\"[^\"]*(px-|py-)[0-9]')"

# 18) FD7 — Toasts must go through lib/notify.js (fixed titles + semantic colour).
m=$(grep -rnE 'from "sonner"' $DIRS --include=*.jsx 2>/dev/null | grep -vE "$EXCLUDE" | grep -vE '//\s*guard-allow')
report "Import toast langsung dari 'sonner' (FD7: WAJIB lewat notify dari @/lib/notify)" "$m"

# 19) FD7 — No hand-written toast titles.
report "Judul toast dikarang (FD7: judul baku Sukses/Gagal/Peringatan/Info dari lib/notify.js; pemanggil hanya mengisi deskripsi)" \
  "$(scan 'toast\.(success|error|warning|info)\s*\(')"

# 15) FD5 — Card actions belong in <CardFooter>, not a hand-rolled save bar.
report "Save bar manual 'flex justify-end border-t pt-4' (FD5: tombol aksi Card WAJIB di <CardFooter className=\"justify-end gap-2\">)" \
  "$(scan 'justify-end border-t pt-4')"

# 16) FD5 — Inconsistent button copy for the `save` intent.
report "Teks tombol tidak konsisten (FD5: pakai ACTION dari src/constants/labels.js \u2014 mis. 'Simpan', bukan 'Simpan Perubahan')" \
  "$(scan 'Simpan (Perubahan|Data)|Perbarui Kata Sandi|Tambah Baru|Hapus Data')"

# 14) FD1 — Compact is the ONLY density: no toggle/provider/data-density anywhere.
m=$(grep -rnE 'DensityToggle|density-provider|density-toggle|data-density' "$SRC" --include=*.jsx --include=*.js --include=*.css 2>/dev/null | grep -vE '//\s*guard-allow')
report "Mekanisme density ditemukan (FD1: compact WAJIB & satu-satunya \u2014 tanpa toggle/provider/data-density)" "$m"

echo ""
if [ "$fail" -eq 0 ]; then
  echo "✓ design-guard: clean — tidak ada anti-pattern terdeteksi."
else
  echo "✗ design-guard: DITEMUKAN pelanggaran di atas. Perbaiki sebelum finish (R39/2C.14)."
  echo "  (Jika sebuah baris memang disengaja & terdokumentasi, tambahkan '// guard-allow' & catat di Changelog.)"
fi
exit $fail
