/**
 * Canonical action labels (FD5).
 *
 * Every button/menu action in FlowDesk MUST reuse a label from here so the same
 * intent always reads the same way across the app ("Simpan" everywhere — never
 * "Simpan Perubahan" in one place and "Perbarui" in another).
 * Add a new entry here first if an intent is missing.
 */
export const ACTION = {
  add: "Tambah",
  save: "Simpan",
  saving: "Menyimpan...",
  edit: "Ubah",
  delete: "Hapus",
  cancel: "Batal",
  close: "Tutup",
  detail: "Detail",
  refresh: "Segarkan",
  reset: "Reset",
  export: "Ekspor",
  import: "Impor",
  upload: "Unggah",
  download: "Unduh",
  search: "Cari...",
  filter: "Filter",
  back: "Kembali",
  login: "Masuk",
  logout: "Keluar",
  send: "Kirim",
  copy: "Salin",
  print: "Cetak",
  restore: "Pulihkan",
  archive: "Arsipkan",
};
