import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Shield,
  ShieldOff,
  Trash2,
  Upload,
  Users2,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  DataTableCard,
  SortableHeader,
} from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { PasswordInput } from "@/components/composite/PasswordInput";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { useAuth } from "@/context/AuthContext";
import { ACTION } from "@/constants/labels";
import { userDefaultValues, userSchema } from "@/lib/validation/adminSchema";

const initialsOf = (name) => ((name || "U").trim().slice(0, 1) || "U").toUpperCase();

/**
 * Column factory (module scope so no component is defined during render).
 */
const buildColumns = ({ roleLabel, isAdmin, currentUserId, onEdit, onToggle, onDelete }) => {
  const columns = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column}>Nama</SortableHeader>,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="size-7 rounded-md">
              {u.avatar ? <AvatarImage src={u.avatar} alt="" className="object-cover" /> : null}
              <AvatarFallback className="rounded-md text-xs">{initialsOf(u.name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{u.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: "role",
      header: ({ column }) => <SortableHeader column={column}>Peran</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal">
          {roleLabel(row.original.role)}
        </Badge>
      ),
    },
    {
      accessorKey: "department",
      header: ({ column }) => <SortableHeader column={column}>Departemen</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.department || "\u2014"}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "outline" : "secondary"} className="font-normal">
          {row.original.is_active ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
  ];

  if (!isAdmin) return columns;

  columns.push({
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const u = row.original;
      if (u.id === currentUserId) {
        return <span className="text-xs text-muted-foreground">Akun Anda</span>;
      }
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Aksi baris"
                data-testid={`user-actions-${u.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(u)} data-testid={`btn-edit-user-${u.id}`}>
                <Pencil aria-hidden="true" /> {ACTION.edit}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggle(u)}
                data-testid={`btn-toggle-active-${u.id}`}
              >
                {u.is_active ? <ShieldOff aria-hidden="true" /> : <Shield aria-hidden="true" />}
                {u.is_active ? "Nonaktifkan" : "Aktifkan"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(u)}
                className="text-destructive focus:text-destructive"
                data-testid={`btn-delete-user-${u.id}`}
              >
                <Trash2 aria-hidden="true" /> {ACTION.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  });

  return columns;
};

const CSV_TEMPLATE =
  "name,email,role,phone,department\nBudi Santoso,budi@contoh.com,member,081234567890,Operasional\n";

/**
 * Users — user administration (R47 list/CRUD pattern):
 * DataTableCard (server mode) + Dialog form + destructive AlertDialog.
 */
export default function Users() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: userDefaultValues,
    mode: "onSubmit",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users", {
        params: {
          page: pageIndex + 1,
          page_size: pageSize,
          q: search || undefined,
          role: roleFilter,
        },
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, search, roleFilter]);

  useEffect(() => {
    api
      .get("/roles")
      .then(({ data }) => setRoles(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPageIndex(0);
  }, [search, roleFilter, pageSize]);

  const roleLabel = useCallback(
    (name) => roles.find((r) => r.name === name)?.label || name,
    [roles]
  );

  const openNew = () => {
    setEditing(null);
    form.reset(userDefaultValues);
    setFormOpen(true);
  };

  const openEdit = useCallback(
    (u) => {
      setEditing(u);
      form.reset({
        name: u.name || "",
        email: u.email || "",
        password: "",
        role: u.role || "member",
        phone: u.phone || "",
        department: u.department || "",
      });
      setFormOpen(true);
    },
    [form]
  );

  const toggleActive = useCallback(
    async (u) => {
      try {
        await api.put(`/users/${u.id}`, { is_active: !u.is_active });
        notify.success(
          `${u.name} berhasil ${u.is_active ? "dinonaktifkan" : "diaktifkan"}.`
        );
        load();
      } catch (err) {
        notify.error(apiError(err));
      }
    },
    [load]
  );

  const submit = async (values) => {
    try {
      if (editing) {
        const payload = {
          name: values.name,
          role: values.role,
          phone: values.phone,
          department: values.department,
        };
        if (values.password) payload.password = values.password;
        await api.put(`/users/${editing.id}`, payload);
      } else {
        if (!values.password || values.password.length < 6) {
          form.setError("password", {
            message: "Kata sandi wajib diisi, minimal 6 karakter.",
          });
          return;
        }
        await api.post("/users", values);
      }
      notify.success(`Pengguna ${values.name} berhasil disimpan.`);
      setFormOpen(false);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/users/${deleting.id}`);
      notify.success(`Pengguna ${deleting.name} berhasil dihapus.`);
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const doImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.post("/users/import", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(data);
      notify.success(`Impor selesai: ${data.created} baru, ${data.updated} diperbarui.`);
      load();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-pengguna.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () =>
      buildColumns({
        roleLabel,
        isAdmin,
        currentUserId: user?.id,
        onEdit: openEdit,
        onToggle: toggleActive,
        onDelete: setDeleting,
      }),
    [roleLabel, isAdmin, user?.id, openEdit, toggleActive]
  );

  const filters = (
    <Select value={roleFilter} onValueChange={setRoleFilter}>
      <SelectTrigger
        className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-40"
        data-testid="user-role-filter"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Peran</SelectItem>
        {roles.map((r) => (
          <SelectItem key={r.name} value={r.name}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const headerAction = isAdmin ? (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setImportResult(null);
          setImportOpen(true);
        }}
        data-testid="btn-import-users"
      >
        <Upload className="size-4" /> {ACTION.import}
      </Button>
      <Button size="sm" onClick={openNew} data-testid="btn-add-user">
        <Plus className="size-4" /> {ACTION.add}
      </Button>
    </>
  ) : null;

  return (
    <div className="space-y-6" data-testid="users-page">
      <DataTableCard
        title="Kelola Pengguna"
        onRefresh={load}
        refreshTestId="user-refresh"
        headerAction={headerAction}
        filters={filters}
        columns={columns}
        data={rows}
        loading={loading}
        search={{ value: search, onChange: setSearch }}
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(total / pageSize) || 1,
          totalRows: total,
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
        }}
        testid="user"
        emptyIcon={Users2}
        emptyTitle="Tidak ada pengguna"
        emptyDescription="Sesuaikan pencarian atau tambahkan pengguna baru."
      />

      {/* Create / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} noValidate>
              <DialogHeader>
                <DialogTitle>{editing ? "Ubah Pengguna" : "Pengguna Baru"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Email tidak dapat diubah. Kosongkan kata sandi bila tidak ingin menggantinya."
                    : "Isi data akun pengguna baru."}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="form-dense">
                <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama</FormLabel>
                        <FormControl>
                          <Input data-testid="user-name-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            disabled={Boolean(editing)}
                            data-testid="user-email-input"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kata Sandi</FormLabel>
                        <FormControl>
                          <PasswordInput
                            autoComplete="new-password"
                            placeholder={editing ? "Biarkan kosong" : "Minimal 6 karakter"}
                            data-testid="user-password-input"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peran</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="user-role-select">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.name} value={r.name}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telepon</FormLabel>
                        <FormControl>
                          <Input placeholder="08xxxxxxxxxx" data-testid="user-phone-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departemen</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="mis. Operasional"
                            data-testid="user-department-input"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormOpen(false)}
                >
                  <X className="size-4" /> {ACTION.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={form.formState.isSubmitting}
                  data-testid="btn-save-user"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="size-4" aria-hidden="true" />
                  )}
                  {ACTION.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Impor Pengguna</DialogTitle>
            <DialogDescription>
              Unggah berkas CSV atau Excel (.xlsx).
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Alert>
              <Info className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Kolom yang dibaca: name, email, role, phone, department. Email yang sudah
                terdaftar akan diperbarui otomatis.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={downloadTemplate}
              data-testid="btn-download-template"
            >
              <Download className="size-4" /> Unduh Template CSV
            </Button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 transition-colors hover:border-primary"
              data-testid="import-dropzone"
            >
              {importing ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : (
                <FileSpreadsheet className="size-6 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="text-sm font-medium">
                {importing ? "Mengimpor..." : "Pilih berkas CSV / XLSX"}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={doImport}
              data-testid="import-file-input"
            />
            {importResult ? (
              <Alert data-testid="import-result">
                <Info className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  <span className="font-medium">{importResult.created}</span> pengguna baru
                  dibuat, <span className="font-medium">{importResult.updated}</span> diperbarui.
                  Kata sandi default: <span className="font-medium">{importResult.default_password}</span>
                  {importResult.errors?.length ? (
                    <span className="mt-1 block text-destructive">
                      {importResult.errors.slice(0, 5).join(" \u00b7 ")}
                      {importResult.errors.length > 5
                        ? ` \u00b7 +${importResult.errors.length - 5} lainnya`
                        : ""}
                    </span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(false)}>
              <X className="size-4" /> {ACTION.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus pengguna?"
        description={`Pengguna "${deleting?.name || ""}" akan dihapus permanen.`}
        onConfirm={remove}
        testid="user-delete-confirm"
      />
    </div>
  );
}
