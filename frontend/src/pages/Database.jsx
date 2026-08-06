import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Database,
  Download,
  DownloadCloud,
  FileSearch,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Save,
  Server,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/composite/PasswordInput";
import {
  DataTableCard,
  SortableHeader,
  fmtDate,
} from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";
import { autoBackupSchema, storageSchema } from "@/lib/validation/adminSchema";

const WEEKDAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const fmtSize = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

/** Configuration section with its actions in the Card footer (R51/FD5). */
const FormSection = ({ title, form, onSubmit, submitting, submitTestId, testid, extraAction, children }) => (
  <Card data-testid={testid}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="form-dense space-y-4">{children}</CardContent>
        <CardFooter className="justify-end gap-2">
          {extraAction}
          <Button type="submit" size="sm" disabled={submitting} data-testid={submitTestId}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {submitting ? ACTION.saving : ACTION.save}
          </Button>
        </CardFooter>
      </form>
    </Form>
  </Card>
);

/** Backup history columns (module scope — no component defined during render). */
const buildColumns = ({ busy, onInspect, onDownload, onRestore, onDelete }) => [
  {
    accessorKey: "filename",
    header: ({ column }) => <SortableHeader column={column}>Berkas</SortableHeader>,
    cell: ({ row }) => (
      <span className="block max-w-[20rem] truncate font-medium" title={row.original.filename}>
        {row.original.filename}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortableHeader column={column}>Dibuat</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{fmtDate(row.original.created_at)}</span>
    ),
  },
  {
    accessorKey: "size",
    header: ({ column }) => <SortableHeader column={column}>Ukuran</SortableHeader>,
    cell: ({ row }) => <span className="text-muted-foreground">{fmtSize(row.original.size)}</span>,
  },
  {
    accessorKey: "total_records",
    header: ({ column }) => <SortableHeader column={column}>Jumlah Data</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {Number(row.original.total_records || 0).toLocaleString("id-ID")}
      </span>
    ),
  },
  {
    accessorKey: "destination",
    header: ({ column }) => <SortableHeader column={column}>Lokasi</SortableHeader>,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {row.original.destination === "s3" ? "Object Storage" : "Server"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const backup = row.original;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Aksi baris"
                data-testid={`backup-actions-${backup.id}`}
              >
                {busy === `inspect-${backup.id}` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => onInspect(backup)}
                data-testid={`btn-inspect-${backup.id}`}
              >
                <FileSearch aria-hidden="true" /> Periksa
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDownload(backup)}
                data-testid={`btn-download-${backup.id}`}
              >
                <Download aria-hidden="true" /> {ACTION.download}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRestore(backup)}
                data-testid={`btn-restore-${backup.id}`}
              >
                <RotateCcw aria-hidden="true" /> Pulihkan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(backup)}
                className="text-destructive focus:text-destructive"
                data-testid={`btn-delete-backup-${backup.id}`}
              >
                <Trash2 aria-hidden="true" /> {ACTION.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

/**
 * Database — object storage config, backup/restore and backup history.
 * Configuration sections follow R51/FD5; history uses DataTableCard (R47).
 */
export default function DatabasePage() {
  const [ready, setReady] = useState(false);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [busy, setBusy] = useState("");
  const [testing, setTesting] = useState(false);
  const [inspectResult, setInspectResult] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadConfirm, setUploadConfirm] = useState(false);
  const uploadRef = useRef(null);

  const storageForm = useForm({
    resolver: zodResolver(storageSchema),
    defaultValues: {
      endpoint: "",
      bucket: "",
      access_key: "",
      secret_key: "",
      region: "",
      path: "",
      max_file_mb: 50,
      allowed_types: "",
    },
    mode: "onSubmit",
  });

  const backupForm = useForm({
    resolver: zodResolver(autoBackupSchema),
    defaultValues: {
      auto_enabled: false,
      frequency: "daily",
      time: "02:00",
      weekday: 1,
      destination: "s3",
    },
    mode: "onSubmit",
  });

  const [lastRun, setLastRun] = useState(null);

  const loadBackups = useCallback(async () => {
    setLoadingBackups(true);
    try {
      const { data } = await api.get("/database/backups");
      setBackups(data || []);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoadingBackups(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/settings")
      .then(({ data }) => {
        if (!active) return;
        const s = data.storage || {};
        const b = data.backup || {};
        storageForm.reset({
          endpoint: s.endpoint || "",
          bucket: s.bucket || "",
          access_key: s.access_key || "",
          secret_key: s.secret_key || "",
          region: s.region || "",
          path: s.path || "",
          max_file_mb: s.max_file_mb || 50,
          allowed_types: s.allowed_types || "",
        });
        backupForm.reset({
          auto_enabled: Boolean(b.auto_enabled),
          frequency: b.frequency || "daily",
          time: b.time || "02:00",
          weekday: b.weekday || 1,
          destination: b.destination || "s3",
        });
        setLastRun(b.last_run || null);
        setReady(true);
      })
      .catch((err) => notify.error(apiError(err)));
    return () => {
      active = false;
    };
  }, [storageForm, backupForm]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const saveStorage = async (values) => {
    try {
      await api.put("/settings", { storage: values });
      notify.success("Konfigurasi penyimpanan berhasil disimpan.");
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const saveSchedule = async (values) => {
    try {
      await api.put("/settings", { backup: values });
      notify.success("Jadwal backup otomatis berhasil disimpan.");
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/database/storage/test", storageForm.getValues());
      if (data.ok) notify.success(data.message);
      else notify.error(data.message);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setTesting(false);
    }
  };

  const downloadBlob = useCallback(async (backup) => {
    try {
      const res = await api.get(`/database/backups/${backup.id}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = backup.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify.error(apiError(err));
    }
  }, []);

  const createBackup = async (destination) => {
    setBusy(destination);
    try {
      const { data } = await api.post(`/database/backup?destination=${destination}`);
      notify.success(`Backup berhasil dibuat (${data.total_records} data).`);
      if (destination === "local") await downloadBlob(data);
      loadBackups();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setBusy("");
    }
  };

  const inspect = useCallback(async (backup) => {
    setBusy(`inspect-${backup.id}`);
    try {
      const { data } = await api.get(`/database/backups/${backup.id}/inspect`);
      setInspectResult({ ...data, filename: backup.filename });
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setBusy("");
    }
  }, []);

  const doRestore = async () => {
    setBusy("restore");
    try {
      await api.post(`/database/backups/${restoreTarget.id}/restore`);
      notify.success("Database berhasil dipulihkan.");
      setRestoreTarget(null);
      loadBackups();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setBusy("");
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/database/backups/${deleteTarget.id}`);
      notify.success("Backup berhasil dihapus.");
      setDeleteTarget(null);
      loadBackups();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const doUploadRestore = async () => {
    if (!uploadFile) return;
    setBusy("upload-restore");
    try {
      const body = new FormData();
      body.append("file", uploadFile);
      const { data } = await api.post("/database/restore-upload", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const count = Object.values(data.restored || {}).reduce((a, b) => a + b, 0);
      notify.success(`Database dipulihkan dari unggahan (${count} data).`);
      setUploadFile(null);
      setUploadConfirm(false);
      loadBackups();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setBusy("");
    }
  };

  const columns = useMemo(
    () =>
      buildColumns({
        busy,
        onInspect: inspect,
        onDownload: downloadBlob,
        onRestore: setRestoreTarget,
        onDelete: setDeleteTarget,
      }),
    [busy, inspect, downloadBlob]
  );

  if (!ready) {
    return (
      <div className="space-y-6" data-testid="database-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isWeekly = backupForm.watch("frequency") === "weekly";

  return (
    <div className="space-y-6" data-testid="database-page">
      <FormSection
        title="Penyimpanan (S3)"
        form={storageForm}
        onSubmit={saveStorage}
        submitting={storageForm.formState.isSubmitting}
        submitTestId="btn-save-storage"
        testid="storage-config-card"
        extraAction={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={testing}
            data-testid="btn-test-storage"
          >
            {testing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Server className="size-4" aria-hidden="true" />
            )}
            Uji Koneksi
          </Button>
        }
      >
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormField
            control={storageForm.control}
            name="endpoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endpoint</FormLabel>
                <FormControl>
                  <Input placeholder="https://s3.amazonaws.com" data-testid="s3-endpoint" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={storageForm.control}
            name="bucket"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bucket</FormLabel>
                <FormControl>
                  <Input data-testid="s3-bucket" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={storageForm.control}
            name="access_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Key</FormLabel>
                <FormControl>
                  <Input data-testid="s3-access-key" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={storageForm.control}
            name="secret_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secret Key</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="off" data-testid="s3-secret-key" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={storageForm.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region</FormLabel>
                <FormControl>
                  <Input placeholder="us-east-1" data-testid="s3-region" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={storageForm.control}
            name="path"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Path / Prefix</FormLabel>
                <FormControl>
                  <Input placeholder="flowdesk" data-testid="s3-path" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={storageForm.control}
            name="max_file_mb"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ukuran File Maks (MB)</FormLabel>
                <FormControl>
                  <Input type="number" data-testid="s3-max-file" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={storageForm.control}
            name="allowed_types"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipe Diizinkan</FormLabel>
                <FormControl>
                  <Input placeholder="pdf,png,jpg" data-testid="s3-allowed-types" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <Card data-testid="backup-actions-card">
        <CardHeader>
          <CardTitle className="text-base">Backup Database</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Buat cadangan penuh seluruh data aplikasi. Unduh langsung ke perangkat Anda, atau
            simpan ke object storage (S3).
          </p>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => createBackup("s3")}
            disabled={Boolean(busy)}
            data-testid="btn-backup-s3"
          >
            {busy === "s3" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="size-4" aria-hidden="true" />
            )}
            Backup ke Object Storage
          </Button>
          <Button
            size="sm"
            onClick={() => createBackup("local")}
            disabled={Boolean(busy)}
            data-testid="btn-backup-download"
          >
            {busy === "local" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <DownloadCloud className="size-4" aria-hidden="true" />
            )}
            Backup &amp; Unduh
          </Button>
        </CardFooter>
      </Card>

      <FormSection
        title="Backup Otomatis"
        form={backupForm}
        onSubmit={saveSchedule}
        submitting={backupForm.formState.isSubmitting}
        submitTestId="btn-save-auto-backup"
        testid="auto-backup-card"
      >
        <FormField
          control={backupForm.control}
          name="auto_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0 rounded-lg border bg-muted/40 p-3">
              <div>
                <FormLabel>Aktifkan Backup Otomatis</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Backup terakhir: {lastRun ? fmtDate(lastRun) : "belum pernah"}
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="auto-backup-switch"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormField
            control={backupForm.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frekuensi</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="auto-backup-frequency">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={backupForm.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jam</FormLabel>
                <FormControl>
                  <Input type="time" data-testid="auto-backup-time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {isWeekly ? (
            <FormField
              control={backupForm.control}
              name="weekday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hari</FormLabel>
                  <Select value={String(field.value)} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="auto-backup-weekday">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WEEKDAYS.map((day, index) => (
                        <SelectItem key={day} value={String(index + 1)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={backupForm.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tujuan</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="auto-backup-destination">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="s3">Object Storage (S3)</SelectItem>
                    <SelectItem value="local">Server</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <Card data-testid="restore-upload-card">
        <CardHeader>
          <CardTitle className="text-base">Restore dari Unggahan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Seluruh data saat ini akan diganti dengan isi berkas backup. Pastikan Anda sudah
              membuat backup terbaru sebelum melanjutkan.
            </AlertDescription>
          </Alert>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 transition-colors hover:border-primary"
            data-testid="restore-upload-dropzone"
          >
            <UploadCloud className="size-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">
              {uploadFile ? uploadFile.name : "Pilih berkas backup (.json.gz)"}
            </span>
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept=".gz,.json"
            className="hidden"
            onChange={(e) => {
              setUploadFile(e.target.files?.[0] || null);
              e.target.value = "";
            }}
            data-testid="restore-upload-input"
          />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setUploadConfirm(true)}
            disabled={!uploadFile || busy === "upload-restore"}
            data-testid="btn-restore-upload"
          >
            {busy === "upload-restore" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="size-4" aria-hidden="true" />
            )}
            Pulihkan
          </Button>
        </CardFooter>
      </Card>

      <DataTableCard
        title="Riwayat Backup"
        onRefresh={loadBackups}
        refreshTestId="backup-refresh"
        columns={columns}
        data={backups}
        loading={loadingBackups}
        testid="backup"
        emptyIcon={Database}
        emptyTitle="Belum ada backup"
        emptyDescription="Buat backup pertama Anda menggunakan tombol di kartu Backup Database."
      />

      {/* Inspect result */}
      <Dialog open={Boolean(inspectResult)} onOpenChange={(open) => !open && setInspectResult(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hasil Pemeriksaan Backup</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="break-all text-sm font-medium">{inspectResult?.filename}</p>
            <div className="divide-y rounded-md border text-sm">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Status</span>
                <span className="flex items-center gap-1.5 font-medium">
                  {inspectResult?.valid ? (
                    <>
                      <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> Valid
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-destructive" aria-hidden="true" /> Rusak
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Total data</span>
                <span className="font-medium">
                  {Number(inspectResult?.total_records || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Jumlah koleksi</span>
                <span className="font-medium">
                  {Object.keys(inspectResult?.collections || {}).length}
                </span>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInspectResult(null)}>
              <X className="size-4" /> {ACTION.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="Pulihkan database?"
        description="Seluruh data saat ini akan DIGANTI dengan isi backup ini dan tidak dapat dibatalkan."
        confirmLabel="Ya, Pulihkan"
        icon={RotateCcw}
        onConfirm={doRestore}
        testid="db-restore-confirm"
      />

      <ConfirmDeleteDialog
        open={uploadConfirm}
        onOpenChange={setUploadConfirm}
        title="Pulihkan dari berkas unggahan?"
        description="Seluruh data saat ini akan DIGANTI dengan isi berkas yang Anda unggah."
        confirmLabel="Ya, Pulihkan"
        icon={RotateCcw}
        onConfirm={doUploadRestore}
        testid="db-upload-restore-confirm"
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus backup?"
        description={`Berkas "${deleteTarget?.filename || ""}" akan dihapus permanen.`}
        onConfirm={doDelete}
        testid="db-delete-confirm"
      />
    </div>
  );
}
