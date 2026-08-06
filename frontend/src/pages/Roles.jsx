import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  Info,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";
import { roleSchema } from "@/lib/validation/adminSchema";

const NO_PARENT = "__none__";

/** Izin bawaan yang disarankan per level — Laporan & Ekspor hanya untuk Kabag ke atas. */
const BASE = ["calendar", "task", "meeting", "time_schedule", "note", "reminder", "help_ticket"];
const RECOMMENDED_LEVEL_PERMS = {
  Komisaris: [...BASE, "report"],
  Dirut: [...BASE, "report"],
  Direksi: [...BASE, "report"],
  Kabag: [...BASE, "report"],
  Kasi: BASE,
  Staff: BASE,
};

const slugOf = (label) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/**
 * Roles — hierarki jabatan (peran) + izin per level.
 * Card 1: pohon jabatan (indentasi, atasan langsung, level, urutan) + impor/ekspor.
 * Card 2: izin bawaan per level — diwarisi jabatan yang izinnya belum ditimpa.
 */
export default function Roles() {
  const fileRef = useRef(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [levels, setLevels] = useState([]);
  const [levelPerms, setLevelPerms] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingLevels, setSavingLevels] = useState(false);
  const [importing, setImporting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(null);

  const form = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: { label: "" },
    mode: "onSubmit",
  });
  const [meta, setMeta] = useState({ parent_id: NO_PARENT, level: "Staff" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleRes, permRes, lvlRes] = await Promise.all([
        api.get("/roles"),
        api.get("/permissions"),
        api.get("/role-levels"),
      ]);
      setRoles(roleRes.data || []);
      setPermissions(permRes.data || []);
      setLevels(lvlRes.data?.levels || []);
      setLevelPerms(lvlRes.data?.permissions || {});
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setSelected([]);
    setMeta({ parent_id: NO_PARENT, level: "Staff" });
    form.reset({ label: "" });
    setFormOpen(true);
  };

  const openEdit = (role) => {
    setEditing(role);
    setSelected(role.permissions || []);
    setMeta({ parent_id: role.parent_id || NO_PARENT, level: role.level || "Staff" });
    form.reset({ label: role.label || "" });
    setFormOpen(true);
  };

  const togglePermission = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const submit = async (values) => {
    const payload = {
      name: editing ? editing.name : slugOf(values.label),
      label: values.label,
      permissions: editing?.permissions?.includes("*") ? ["*"] : selected,
      parent_id: meta.parent_id === NO_PARENT ? null : meta.parent_id,
      level: meta.level,
    };
    try {
      if (editing) await api.put(`/roles/${editing.id}`, payload);
      else await api.post("/roles", payload);
      notify.success(`Jabatan ${values.label} berhasil disimpan.`);
      setFormOpen(false);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/roles/${deleting.id}`);
      notify.success(`Jabatan ${deleting.label} berhasil dihapus.`);
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const onImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/roles/import", fd);
      notify.success(
        `Impor selesai: ${data.created} jabatan baru, ${data.updated} diperbarui, ${data.linked} tertaut ke atasan.`
      );
      load();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setImporting(false);
    }
  };

  const onExport = () => {
    const head = ["ID", "Name", "Parent", "Parent ID", "Level"];
    const body = roles.map((r) =>
      [r.id, r.label, r.parent_label || "", r.parent_id || "", r.level || ""].map(csvCell).join(",")
    );
    const blob = new Blob([[head.map(csvCell).join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jabatan.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleLevelPerm = (level, key) =>
    setLevelPerms((prev) => {
      const cur = prev[level] || [];
      return { ...prev, [level]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });

  const applyRecommended = () => {
    setLevelPerms((prev) => {
      const next = { ...prev };
      levels.forEach((lv) => {
        next[lv] = RECOMMENDED_LEVEL_PERMS[lv] || [];
      });
      return next;
    });
    notify.info("Izin bawaan diterapkan. Tekan Simpan untuk menyimpan.");
  };

  const saveLevels = async () => {
    setSavingLevels(true);
    try {
      await api.put("/role-levels", { permissions: levelPerms });
      notify.success("Izin per level berhasil disimpan.");
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setSavingLevels(false);
    }
  };

  const permCount = useMemo(
    () => (role) => (role.permissions?.includes("*") ? permissions.length : (role.permissions || []).length),
    [permissions.length]
  );

  return (
    <div className="space-y-6" data-testid="roles-page">
      <Card data-testid="roles-list-card">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            Hierarki Jabatan
            <Badge variant="secondary" className="font-normal tabular-nums">
              {roles.length}
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={onImport}
              className="hidden"
              data-testid="role-import-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              data-testid="btn-import-roles"
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              Impor
            </Button>
            <Button variant="outline" size="sm" onClick={onExport} data-testid="btn-export-roles">
              <Download className="size-4" /> Ekspor
            </Button>
            <Button size="sm" onClick={openNew} data-testid="btn-add-role">
              <Plus className="size-4" /> {ACTION.add}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Penugasan &amp; pemantauan mengikuti garis komando: pemberi tugas hanya dapat memilih
              PIC dari jabatan di bawahnya, dan hanya melihat data dirinya beserta seluruh
              bawahannya. Impor menerima kolom <code>Name</code>, <code>Parent</code>,{" "}
              <code>Parent ID</code>, dan <code>Level</code>.
            </AlertDescription>
          </Alert>
          <div className="mt-4 rounded-md border">
            {loading ? (
              <div className="space-y-2 p-4" data-testid="roles-loading">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <div className="thin-scroll max-h-[34rem] overflow-auto">
                <Table className="tbl-density [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Atasan Langsung</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Izin</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id} data-testid={`role-row-${role.name}`}>
                        <TableCell className="font-medium">
                          <span
                            className="flex items-center gap-1.5"
                            style={{ paddingLeft: `${(role.depth || 0) * 16}px` }}
                          >
                            {role.is_system ? (
                              <Lock className="size-3 text-muted-foreground" aria-label="Bawaan" />
                            ) : null}
                            {role.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.parent_label || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {role.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={role.permissions?.includes("*") ? "default" : "secondary"}
                            className="font-normal"
                          >
                            {role.permissions?.includes("*")
                              ? "Semua izin"
                              : permCount(role) === 0
                                ? `Warisan ${role.level}`
                                : `${permCount(role)} izin`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  aria-label="Aksi baris"
                                  data-testid={`role-actions-${role.name}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => openEdit(role)}
                                  data-testid={`btn-edit-role-${role.name}`}
                                >
                                  <Pencil aria-hidden="true" /> {ACTION.edit}
                                </DropdownMenuItem>
                                {role.is_system ? null : (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeleting(role)}
                                      className="text-destructive focus:text-destructive"
                                      data-testid={`btn-delete-role-${role.name}`}
                                    >
                                      <Trash2 aria-hidden="true" /> {ACTION.delete}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="role-levels-card">
        <CardHeader>
          <CardTitle className="text-base">Izin per Level Jabatan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Jabatan yang izinnya masih kosong otomatis mewarisi izin level di bawah ini. Isi izin
              pada jabatan tertentu bila ingin menimpanya.
            </AlertDescription>
          </Alert>
          <div className="rounded-md border">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <Table
                className="tbl-density [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
                data-testid="level-matrix"
              >
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Izin</TableHead>
                    {levels.map((lv) => (
                      <TableHead key={lv} className="text-center">
                        {lv}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((perm) => (
                    <TableRow key={perm.key} data-testid={`level-row-${perm.key}`}>
                      <TableCell className="font-medium">{perm.label}</TableCell>
                      {levels.map((lv) => (
                        <TableCell key={lv} className="text-center">
                          <Switch
                            checked={(levelPerms[lv] || []).includes(perm.key)}
                            onCheckedChange={() => toggleLevelPerm(lv, perm.key)}
                            data-testid={`level-switch-${lv}-${perm.key}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={applyRecommended}
            data-testid="btn-recommended-levels"
          >
            <Wand2 className="size-4" /> Terapkan Bawaan
          </Button>
          <Button size="sm" onClick={saveLevels} disabled={savingLevels} data-testid="btn-save-levels">
            {savingLevels ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {savingLevels ? ACTION.saving : ACTION.save}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} noValidate>
              <DialogHeader>
                <DialogTitle>{editing ? "Ubah Jabatan" : "Jabatan Baru"}</DialogTitle>
                <DialogDescription>
                  Tentukan nama jabatan, atasan langsungnya, level, dan izin bila ingin menimpa
                  warisan level.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="form-dense">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Jabatan</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="mis. Kasi Kredit"
                          data-testid="role-label-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5">
                  <div className="space-y-1.5">
                    <FormLabel>Atasan Langsung</FormLabel>
                    <Select
                      value={meta.parent_id}
                      onValueChange={(v) => setMeta((m) => ({ ...m, parent_id: v }))}
                    >
                      <SelectTrigger data-testid="role-parent-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PARENT}>— Tanpa atasan (puncak) —</SelectItem>
                        {roles
                          .filter((r) => r.id !== editing?.id)
                          .map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FormLabel>Level</FormLabel>
                  <Select
                    value={meta.level}
                    onValueChange={(v) => setMeta((m) => ({ ...m, level: v }))}
                  >
                    <SelectTrigger data-testid="role-level-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((lv) => (
                        <SelectItem key={lv} value={lv}>
                          {lv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Menentukan izin warisan bila izin jabatan dibiarkan kosong.
                  </FormDescription>
                </div>

                {editing?.permissions?.includes("*") ? (
                  <Alert>
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>
                      Jabatan ini memegang seluruh izin secara permanen dan tidak dapat diubah.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-1.5">
                    <p className="font-medium">
                      Izin Khusus{" "}
                      <span className="font-normal text-muted-foreground">
                        ({selected.length}/{permissions.length} dipilih — kosong = warisi level)
                      </span>
                    </p>
                    <div className="thin-scroll max-h-56 divide-y overflow-y-auto rounded-md border">
                      {permissions.map((perm) => (
                        <div
                          key={perm.key}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                          data-testid={`perm-row-${perm.key}`}
                        >
                          <span>{perm.label}</span>
                          <Switch
                            checked={selected.includes(perm.key)}
                            onCheckedChange={() => togglePermission(perm.key)}
                            data-testid={`perm-switch-${perm.key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>
                  <X className="size-4" /> {ACTION.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={form.formState.isSubmitting}
                  data-testid="btn-save-role"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="size-4" aria-hidden="true" />
                  )}
                  {form.formState.isSubmitting ? ACTION.saving : ACTION.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus jabatan?"
        description={`Jabatan "${deleting?.label || ""}" akan dihapus.`}
        onConfirm={remove}
        testid="role-delete-confirm"
      />
    </div>
  );
}
