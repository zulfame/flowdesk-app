import React, { useEffect, useState, useCallback, useRef } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, HardDrive, Save, Loader2, DownloadCloud, UploadCloud, Search, RotateCcw, Trash2, Download, Server, CalendarClock, FileUp } from "lucide-react";
import { toast } from "sonner";

function Field({ label, children, hint }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}
function fmtSize(b) { if (!b) return "0 B"; const u = ["B", "KB", "MB", "GB"]; const i = Math.floor(Math.log(b) / Math.log(1024)); return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`; }
function fmtDate(iso) { return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }); }

export default function DatabasePage() {
  const [storage, setStorage] = useState(null);
  const [backupCfg, setBackupCfg] = useState(null);
  const [savingBackupCfg, setSavingBackupCfg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [backups, setBackups] = useState([]);
  const [busy, setBusy] = useState("");
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [inspectResult, setInspectResult] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadRestoring, setUploadRestoring] = useState(false);
  const uploadRef = useRef(null);

  const loadSettings = useCallback(async () => {
    try { const { data } = await api.get("/settings"); setStorage(data.storage); setBackupCfg(data.backup); } catch (e) { toast.error(apiError(e)); }
  }, []);
  const loadBackups = useCallback(async () => {
    try { const { data } = await api.get("/database/backups"); setBackups(data); } catch (e) { toast.error(apiError(e)); }
  }, []);
  useEffect(() => { loadSettings(); loadBackups(); }, [loadSettings, loadBackups]);

  const up = (k, v) => setStorage((s) => ({ ...s, [k]: v }));

  const saveStorage = async () => {
    setSaving(true);
    try { await api.put("/settings", { storage }); toast.success("Konfigurasi penyimpanan disimpan"); }
    catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const testConn = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/database/storage/test", storage);
      data.ok ? toast.success(data.message) : toast.error(data.message);
    } catch (e) { toast.error(apiError(e)); }
    finally { setTesting(false); }
  };

  const downloadBlob = async (id, filename) => {
    const res = await api.get(`/database/backups/${id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const backup = async (destination) => {
    setBusy(destination);
    try {
      const { data } = await api.post(`/database/backup?destination=${destination}`);
      toast.success(`Backup dibuat (${data.total_records} data)`);
      if (destination === "local") await downloadBlob(data.id, data.filename);
      loadBackups();
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(""); }
  };

  const inspect = async (b) => {
    setBusy(`inspect-${b.id}`);
    try { const { data } = await api.get(`/database/backups/${b.id}/inspect`); setInspectResult({ ...data, filename: b.filename }); }
    catch (e) { toast.error(apiError(e)); }
    finally { setBusy(""); }
  };

  const doRestore = async () => {
    if (restoreTarget?.upload) { await uploadRestore(); setRestoreTarget(null); return; }
    setBusy(`restore-${restoreTarget.id}`);
    try { await api.post(`/database/backups/${restoreTarget.id}/restore`); toast.success("Database berhasil dipulihkan"); setRestoreTarget(null); loadBackups(); }
    catch (e) { toast.error(apiError(e)); }
    finally { setBusy(""); }
  };

  const doDelete = async () => {
    try { await api.delete(`/database/backups/${delTarget.id}`); toast.success("Backup dihapus"); setDelTarget(null); loadBackups(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const saveBackupCfg = async () => {
    setSavingBackupCfg(true);
    try { await api.put("/settings", { backup: backupCfg }); toast.success("Pengaturan backup otomatis disimpan"); }
    catch (e) { toast.error(apiError(e)); }
    finally { setSavingBackupCfg(false); }
  };

  const uploadRestore = async () => {
    if (!uploadFile) return;
    setUploadRestoring(true);
    try {
      const fd = new FormData(); fd.append("file", uploadFile);
      const { data } = await api.post("/database/restore-upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const n = Object.values(data.restored || {}).reduce((a, b) => a + b, 0);
      toast.success(`Database dipulihkan dari unggahan (${n} data)`);
      setUploadFile(null); loadBackups();
    } catch (e) { toast.error(apiError(e)); }
    finally { setUploadRestoring(false); }
  };

  const bcUp = (k, v) => setBackupCfg((c) => ({ ...c, [k]: v }));

  if (!storage) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Kelola Database" subtitle="Konfigurasi penyimpanan S3 serta backup & restore database." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 rounded-2xl shadow-soft" data-testid="storage-config-card">
          <div className="flex items-center gap-2 mb-5"><HardDrive className="h-5 w-5 text-primary" /><h2 className="font-semibold">Penyimpanan (S3)</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Endpoint" hint="mis. https://s3.amazonaws.com"><Input value={storage.endpoint} onChange={(e) => up("endpoint", e.target.value)} placeholder="https://..." data-testid="s3-endpoint" /></Field>
            <Field label="Bucket"><Input value={storage.bucket} onChange={(e) => up("bucket", e.target.value)} data-testid="s3-bucket" /></Field>
            <Field label="Access Key"><Input value={storage.access_key} onChange={(e) => up("access_key", e.target.value)} data-testid="s3-access-key" /></Field>
            <Field label="Secret Key"><Input type="password" value={storage.secret_key} onChange={(e) => up("secret_key", e.target.value)} placeholder="••••••••" data-testid="s3-secret-key" /></Field>
            <Field label="Region"><Input value={storage.region} onChange={(e) => up("region", e.target.value)} placeholder="us-east-1" data-testid="s3-region" /></Field>
            <Field label="Path / Prefix"><Input value={storage.path} onChange={(e) => up("path", e.target.value)} placeholder="flowdesk" data-testid="s3-path" /></Field>
            <Field label="Ukuran File Maks (MB)"><Input type="number" value={storage.max_file_mb} onChange={(e) => up("max_file_mb", parseInt(e.target.value) || 50)} data-testid="s3-max-file" /></Field>
            <Field label="Tipe Diizinkan"><Input value={storage.allowed_types} onChange={(e) => up("allowed_types", e.target.value)} data-testid="s3-allowed-types" /></Field>
          </div>
          <div className="flex gap-2 mt-5">
            <Button onClick={saveStorage} disabled={saving} className="rounded-xl" data-testid="btn-save-storage">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan</Button>
            <Button variant="secondary" onClick={testConn} disabled={testing} className="rounded-xl" data-testid="btn-test-storage">{testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Server className="h-4 w-4 mr-2" />} Uji Koneksi</Button>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl shadow-soft" data-testid="backup-actions-card">
          <div className="flex items-center gap-2 mb-5"><Database className="h-5 w-5 text-primary" /><h2 className="font-semibold">Backup Database</h2></div>
          <p className="text-sm text-muted-foreground mb-5">Buat cadangan penuh seluruh data aplikasi. Unduh langsung ke perangkat Anda, atau simpan ke object storage (S3).</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => backup("local")} disabled={!!busy} className="rounded-xl h-auto py-4 flex-col gap-1.5" data-testid="btn-backup-download">
              {busy === "local" ? <Loader2 className="h-5 w-5 animate-spin" /> : <DownloadCloud className="h-5 w-5" />}
              <span>Backup & Unduh</span>
            </Button>
            <Button onClick={() => backup("s3")} disabled={!!busy} variant="secondary" className="rounded-xl h-auto py-4 flex-col gap-1.5" data-testid="btn-backup-s3">
              {busy === "s3" ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
              <span>Backup ke Object Storage</span>
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card className="p-6 rounded-2xl shadow-soft" data-testid="auto-backup-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /><h2 className="font-semibold">Backup Otomatis</h2></div>
            {backupCfg && <Switch checked={!!backupCfg.auto_enabled} onCheckedChange={(v) => bcUp("auto_enabled", v)} data-testid="auto-backup-switch" />}
          </div>
          {backupCfg && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Frekuensi</Label>
                  <Select value={backupCfg.frequency} onValueChange={(v) => bcUp("frequency", v)}>
                    <SelectTrigger data-testid="auto-backup-frequency"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Jam</Label><Input type="time" value={backupCfg.time} onChange={(e) => bcUp("time", e.target.value)} data-testid="auto-backup-time" /></div>
                {backupCfg.frequency === "weekly" && (
                  <div className="space-y-1.5"><Label>Hari</Label>
                    <Select value={String(backupCfg.weekday)} onValueChange={(v) => bcUp("weekday", parseInt(v))}>
                      <SelectTrigger data-testid="auto-backup-weekday"><SelectValue /></SelectTrigger>
                      <SelectContent>{["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((d, i) => <SelectItem key={i} value={String(i + 1)}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5"><Label>Tujuan</Label>
                  <Select value={backupCfg.destination} onValueChange={(v) => bcUp("destination", v)}>
                    <SelectTrigger data-testid="auto-backup-destination"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="s3">Object Storage (S3)</SelectItem><SelectItem value="local">Server</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Backup terakhir otomatis: {backupCfg.last_run ? fmtDate(backupCfg.last_run) : "belum pernah"}</p>
              <div className="mt-4"><Button onClick={saveBackupCfg} disabled={savingBackupCfg} className="rounded-xl" data-testid="btn-save-auto-backup">{savingBackupCfg ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan Jadwal</Button></div>
            </>
          )}
        </Card>

        <Card className="p-6 rounded-2xl shadow-soft" data-testid="restore-upload-card">
          <div className="flex items-center gap-2 mb-5"><FileUp className="h-5 w-5 text-primary" /><h2 className="font-semibold">Restore dari Unggahan</h2></div>
          <p className="text-sm text-muted-foreground mb-4">Punya berkas backup (.json.gz) hasil unduhan? Unggah untuk memulihkan database. Semua data saat ini akan diganti.</p>
          <button onClick={() => uploadRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-primary transition-colors" data-testid="restore-upload-dropzone">
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
            <span className="text-sm font-medium">{uploadFile ? uploadFile.name : "Pilih berkas backup (.json.gz)"}</span>
          </button>
          <input ref={uploadRef} type="file" accept=".gz,.json" className="hidden" onChange={(e) => { setUploadFile(e.target.files?.[0] || null); e.target.value = ""; }} data-testid="restore-upload-input" />
          {uploadFile && <Button variant="secondary" className="w-full rounded-xl mt-3 text-destructive" onClick={() => setRestoreTarget({ upload: true })} data-testid="btn-restore-upload">Pulihkan dari Berkas Ini</Button>}
        </Card>
      </div>

      <Card className="p-6 rounded-2xl shadow-soft mt-6" data-testid="backup-list-card">
        <h2 className="font-semibold mb-5">Riwayat Backup</h2>
        {backups.length === 0 ? (
          <EmptyState icon={Database} title="Belum ada backup" description="Buat backup pertama Anda menggunakan tombol di atas." />
        ) : (
          <div className="divide-y divide-border">
            {backups.map((b) => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3" data-testid={`backup-row-${b.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{b.filename}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(b.created_at)} · {fmtSize(b.size)} · {b.total_records} data · {b.destination === "s3" ? "Object Storage" : "Server"}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => inspect(b)} disabled={busy === `inspect-${b.id}`} data-testid={`btn-inspect-${b.id}`}>{busy === `inspect-${b.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}<span className="hidden sm:inline ml-1">Periksa</span></Button>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => downloadBlob(b.id, b.filename)} data-testid={`btn-download-${b.id}`}><Download className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setRestoreTarget(b)} data-testid={`btn-restore-${b.id}`}><RotateCcw className="h-4 w-4" /><span className="hidden sm:inline ml-1">Restore</span></Button>
                  <Button variant="outline" size="sm" className="rounded-lg text-destructive" onClick={() => setDelTarget(b)} data-testid={`btn-delete-backup-${b.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog open={!!inspectResult} onOpenChange={(v) => !v && setInspectResult(null)} title="Hasil Pemeriksaan Backup" destructive={false} confirmText="Tutup" cancelText="Batal"
        description={inspectResult ? `${inspectResult.filename}\n${inspectResult.valid ? "✓ Valid" : "✗ Rusak"} · ${inspectResult.total_records} total data · ${Object.keys(inspectResult.collections || {}).length} koleksi.` : ""}
        onConfirm={() => setInspectResult(null)} />

      <ConfirmDialog open={!!restoreTarget} onOpenChange={(v) => !v && setRestoreTarget(null)} title="Pulihkan database?" destructive
        confirmText="Ya, Pulihkan" description="Semua data saat ini akan DIGANTI dengan isi backup ini. Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah membuat backup terbaru."
        onConfirm={doRestore} loading={busy.startsWith("restore")} />

      <ConfirmDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)} title="Hapus backup?" description="Berkas backup ini akan dihapus permanen." onConfirm={doDelete} />
    </div>
  );
}
