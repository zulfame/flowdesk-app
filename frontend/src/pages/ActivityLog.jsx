import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Plus, Pencil, Trash2, RotateCcw, LogIn, LogOut, Upload, Download, MessageSquare } from "lucide-react";

const ACTION_ICONS = { create: Plus, update: Pencil, delete: Trash2, restore: RotateCcw, login: LogIn, logout: LogOut, upload: Upload, download: Download, comment: MessageSquare };
const ACTION_COLORS = { create: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30", update: "text-blue-600 bg-blue-50 dark:bg-blue-900/30", delete: "text-rose-600 bg-rose-50 dark:bg-rose-900/30", login: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30", logout: "text-slate-600 bg-slate-100 dark:bg-slate-800", upload: "text-purple-600 bg-purple-50 dark:bg-purple-900/30", comment: "text-amber-600 bg-amber-50 dark:bg-amber-900/30" };

function fmt(iso) { return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }); }

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = () => {
    const params = filter === "all" ? {} : { entity_type: filter };
    api.get("/activity-logs", { params }).then(({ data }) => setLogs(data)).catch(() => {});
  };
  useEffect(() => { load(); }, [filter]);

  return (
    <div>
      <PageHeader title="Log Aktivitas" subtitle="Jejak audit lengkap dari semua aktivitas sistem.">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44 rounded-xl" data-testid="activity-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Entitas</SelectItem>
            <SelectItem value="task">Tugas</SelectItem>
            <SelectItem value="meeting">Rapat</SelectItem>
            <SelectItem value="reminder">Pengingat</SelectItem>
            <SelectItem value="note">Catatan</SelectItem>
            <SelectItem value="user">Pengguna</SelectItem>
            <SelectItem value="auth">Autentikasi</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {logs.length === 0 ? (
        <Card className="rounded-2xl shadow-soft"><EmptyState icon={ScrollText} title="Belum ada aktivitas" description="Aktivitas sistem akan tercatat di sini." /></Card>
      ) : (
        <Card className="rounded-2xl shadow-soft divide-y divide-border overflow-hidden">
          {logs.map((log) => {
            const Icon = ACTION_ICONS[log.action] || ScrollText;
            return (
              <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors" data-testid={`log-${log.id}`}>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${ACTION_COLORS[log.action] || "text-slate-600 bg-slate-100 dark:bg-slate-800"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{log.description}</p>
                  <p className="text-xs text-muted-foreground">{log.user_name} · {log.entity_type}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{fmt(log.created_at)}</span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
