import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Loader2,
  Lock,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

/** Built-in roles that cannot be deleted. */
const CORE_ROLES = ["admin", "manager", "member"];

const hasAll = (role) => Boolean(role?.permissions?.includes("*"));
const grants = (role, key) => hasAll(role) || Boolean(role?.permissions?.includes(key));

/**
 * Roles — role & permission administration.
 * Card 1: role list (table, R47) · Card 2: read-at-a-glance permission matrix.
 */
export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(null);

  const form = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: { label: "" },
    mode: "onSubmit",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleRes, permRes] = await Promise.all([
        api.get("/roles"),
        api.get("/permissions"),
      ]);
      setRoles(roleRes.data || []);
      setPermissions(permRes.data || []);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const permLabel = useCallback(
    (key) => (key === "*" ? "Semua izin" : permissions.find((p) => p.key === key)?.label || key),
    [permissions]
  );

  const openNew = () => {
    setEditing(null);
    setSelected([]);
    form.reset({ label: "" });
    setFormOpen(true);
  };

  const openEdit = (role) => {
    setEditing(role);
    setSelected(hasAll(role) ? permissions.map((p) => p.key) : role.permissions || []);
    form.reset({ label: role.label || "" });
    setFormOpen(true);
  };

  const togglePermission = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const submit = async (values) => {
    const isAdminRole = editing?.name === "admin";
    const permissionList = isAdminRole ? ["*"] : selected;
    try {
      if (editing) {
        await api.put(`/roles/${editing.id}`, {
          name: editing.name,
          label: values.label,
          permissions: permissionList,
        });
      } else {
        const name = values.label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        await api.post("/roles", { name, label: values.label, permissions: permissionList });
      }
      notify.success(`Peran ${values.label} berhasil disimpan.`);
      setFormOpen(false);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/roles/${deleting.id}`);
      notify.success(`Peran ${deleting.label} berhasil dihapus.`);
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const permissionCount = useMemo(
    () => (role) => (hasAll(role) ? permissions.length : (role.permissions || []).length),
    [permissions.length]
  );

  return (
    <div className="space-y-6" data-testid="roles-page">
      <Card data-testid="roles-list-card">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Kelola Peranan</CardTitle>
          <Button size="sm" onClick={openNew} data-testid="btn-add-role">
            <Plus className="size-4" /> {ACTION.add}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {loading ? (
              <div className="space-y-2 p-4" data-testid="roles-loading">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <Table className="tbl-density [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Peran</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Jumlah Izin</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => {
                    const isCore = CORE_ROLES.includes(role.name);
                    return (
                      <TableRow key={role.id} data-testid={`role-row-${role.name}`}>
                        <TableCell className="font-medium">{role.label}</TableCell>
                        <TableCell className="text-muted-foreground">{role.name}</TableCell>
                        <TableCell>
                          <Badge variant={hasAll(role) ? "default" : "secondary"} className="font-normal">
                            {hasAll(role) ? "Semua izin" : `${permissionCount(role)} izin`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 font-normal">
                            {isCore ? <Lock className="size-3" aria-hidden="true" /> : null}
                            {isCore ? "Bawaan" : "Kustom"}
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
                                {isCore ? null : (
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
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="roles-matrix-card">
        <CardHeader>
          <CardTitle className="text-base">Matriks Hak Akses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Tanda centang berarti peran tersebut memiliki izin pada baris itu. Administrator
              selalu memegang seluruh izin.
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
                data-testid="permission-matrix"
              >
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Izin</TableHead>
                    {roles.map((role) => (
                      <TableHead key={role.id} className="text-center">
                        {role.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((perm) => (
                    <TableRow key={perm.key} data-testid={`matrix-row-${perm.key}`}>
                      <TableCell className="font-medium">{perm.label}</TableCell>
                      {roles.map((role) => (
                        <TableCell key={role.id} className="text-center">
                          {grants(role, perm.key) ? (
                            <Check
                              className="mx-auto size-4 text-success"
                              aria-label="Diizinkan"
                            />
                          ) : (
                            <Minus
                              className="mx-auto size-4 text-muted-foreground/50"
                              aria-label="Tidak diizinkan"
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} noValidate>
              <DialogHeader>
                <DialogTitle>{editing ? "Ubah Peran" : "Peran Baru"}</DialogTitle>
                <DialogDescription>
                  Tentukan nama peran dan izin yang dimilikinya.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="form-dense">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Peran</FormLabel>
                      <FormControl>
                        <Input placeholder="mis. Supervisor" data-testid="role-label-input" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editing?.name === "admin" ? (
                  <Alert>
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>
                      Administrator memiliki seluruh izin secara permanen dan tidak dapat diubah.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">
                      Hak Akses{" "}
                      <span className="font-normal text-muted-foreground">
                        ({selected.length}/{permissions.length} dipilih)
                      </span>
                    </p>
                    <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                      {permissions.map((perm) => (
                        <div
                          key={perm.key}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                          data-testid={`perm-row-${perm.key}`}
                        >
                          <span className="text-sm">{perm.label}</span>
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
                  {ACTION.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus peran?"
        description={`Peran "${deleting?.label || ""}" akan dihapus.`}
        onConfirm={remove}
        testid="role-delete-confirm"
      />
    </div>
  );
}
