import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatusBadge, PriorityBadge, ProgressBar, EmptyState, DeadlineBadge } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Modal } from "@/components/Modal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, CheckSquare, Video, Search, LayoutList, Columns3, LayoutTemplate, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

const personName = (p) => (typeof p === "string" ? p : p?.name);
const STATUS_TABS = [
  { key: "all", label: "Semua" },
  { key: "mine", label: "Tugas Saya" },
  { key: "Pending", label: "Menunggu" },
  { key: "On Progress", label: "Berjalan" },
  { key: "Completed", label: "Selesai" },
  { key: "Overdue", label: "Terlambat" },
  { key: "archived", label: "Arsip" },
];
const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
const KANBAN_COLS = ["Pending", "On Progress", "Overdue", "Completed"];
const KANBAN_LABEL = { Pending: "Menunggu", "On Progress": "Berjalan", Overdue: "Terlambat", Completed: "Selesai" };

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [view, setView] = useState(() => localStorage.getItem("flowdesk_task_view") || "list");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [fPriority, setFPriority] = useState("all");
  const [fPic, setFPic] = useState("all");
  const [tplOpen, setTplOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([api.get("/tasks"), api.get("/users?all=true")]);
      setTasks(t.data); setUsers(u.data.items);
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, []);
  const loadTemplates = useCallback(() => api.get("/tasks/templates/list").then(({ data }) => setTemplates(data)).catch(() => {}), []);

  useEffect(() => { load(); loadTemplates(); }, [load, loadTemplates]);
  useEffect(() => { localStorage.setItem("flowdesk_task_view", view); }, [view]);

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (tab === "mine") list = list.filter((t) => t.pic?.user_id === user?.id);
    else if (tab === "archived") list = list.filter((t) => ["Archived", "Cancelled", "Draft"].includes(t.status));
    else if (tab !== "all") list = list.filter((t) => t.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title?.toLowerCase().includes(q) || personName(t.requester)?.toLowerCase().includes(q) || personName(t.pic)?.toLowerCase().includes(q));
    }
    if (fPriority !== "all") list = list.filter((t) => t.priority === fPriority);
    if (fPic !== "all") list = list.filter((t) => t.pic?.user_id === fPic);
    list.sort((a, b) => {
      if (sortBy === "newest") return (b.created_at || "").localeCompare(a.created_at || "");
      if (sortBy === "oldest") return (a.created_at || "").localeCompare(b.created_at || "");
      if (sortBy === "priority") return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      if (sortBy === "deadline") return (a.deadline || "9999").localeCompare(b.deadline || "9999");
      return 0;
    });
    return list;
  }, [tasks, tab, search, fPriority, fPic, sortBy, user]);

  const changeStatus = async (taskId, status) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}`, { status });
      setTasks((prev) => prev.map((t) => t.id === taskId ? data : t));
      if (data.status !== status) toast.info("Status dihitung otomatis dari item tugas");
    } catch (e) { toast.error(apiError(e)); }
  };

  const useTemplate = async (id) => {
    try {
      const { data } = await api.post(`/tasks/templates/${id}/instantiate`);
      toast.success("Tugas dibuat dari template");
      setTplOpen(false);
      navigate(`/tasks/${data.id}`);
    } catch (e) { toast.error(apiError(e)); }
  };
  const deleteTemplate = async (id) => { try { await api.delete(`/tasks/templates/${id}`); loadTemplates(); } catch (e) { toast.error(apiError(e)); } };

  const TaskCard = ({ t, draggable }) => (
    <Card
      draggable={draggable}
      onDragStart={draggable ? (e) => e.dataTransfer.setData("text/task", t.id) : undefined}
      onClick={() => navigate(`/tasks/${t.id}`)}
      className="rounded-lg shadow-soft cursor-pointer hover:shadow-soft-lg hover:-translate-y-0.5 transition-all overflow-hidden"
      data-testid={`task-card-${t.id}`}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm truncate">{t.title}</h3>
        <PriorityBadge priority={t.priority} />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {!draggable && <StatusBadge status={t.status} />}
          {t.deadline && <DeadlineBadge deadline={t.deadline} done={t.status === "Completed"} />}
          {t.meeting_id && <span className="inline-flex items-center gap-1 text-xs text-primary"><Video className="h-3 w-3" /> Rapat</span>}
          {personName(t.pic) && <span className="text-xs text-muted-foreground truncate">PIC: {personName(t.pic)}</span>}
        </div>
        <div className="flex items-center gap-2">
          <ProgressBar value={t.progress} className="flex-1" />
          <span className="text-xs text-muted-foreground font-medium w-9 text-right">{t.progress}%</span>
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      <PageHeader title="Kelola Tugas" subtitle="Setiap tugas mewakili satu permintaan pekerjaan.">
        <Button variant="secondary" onClick={() => setTplOpen(true)} className="rounded-xl" data-testid="btn-templates"><LayoutTemplate className="h-4 w-4 mr-1.5" /> Template</Button>
        <Button onClick={() => navigate("/tasks/new")} className="rounded-xl" data-testid="btn-tambah-tugas"><Plus className="h-4 w-4 mr-1.5" /> Tugas Baru</Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="rounded-xl flex-wrap h-auto">
          {STATUS_TABS.map((f) => <TabsTrigger key={f.key} value={f.key} className="rounded-lg" data-testid={`filter-${f.key}`}>{f.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul, pemberi, PIC..." className="pl-9 rounded-xl" data-testid="task-search" />
        </div>
        <Select value={fPriority} onValueChange={setFPriority}>
          <SelectTrigger className="w-full sm:w-40 rounded-xl" data-testid="filter-priority"><SelectValue placeholder="Prioritas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Prioritas</SelectItem>
            <SelectItem value="Urgent">Mendesak</SelectItem><SelectItem value="High">Tinggi</SelectItem><SelectItem value="Medium">Sedang</SelectItem><SelectItem value="Low">Rendah</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fPic} onValueChange={setFPic}>
          <SelectTrigger className="w-full sm:w-44 rounded-xl" data-testid="filter-pic"><SelectValue placeholder="PIC" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua PIC</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40 rounded-xl" data-testid="sort-by"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Terbaru</SelectItem><SelectItem value="oldest">Terlama</SelectItem>
            <SelectItem value="priority">Prioritas</SelectItem><SelectItem value="deadline">Tenggat</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button onClick={() => setView("list")} className={`px-3 flex items-center ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card"}`} data-testid="view-list"><LayoutList className="h-4 w-4" /></button>
          <button onClick={() => setView("kanban")} className={`px-3 flex items-center ${view === "kanban" ? "bg-primary text-primary-foreground" : "bg-card"}`} data-testid="view-kanban"><Columns3 className="h-4 w-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-secondary/50 animate-pulse" />)}</div>
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col);
            return (
              <div key={col} className="bg-secondary/40 rounded-lg p-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/task"); if (id) changeStatus(id, col); }} data-testid={`kanban-col-${col}`}>
                <div className="flex items-center justify-between px-1 mb-3">
                  <span className="text-sm font-semibold">{KANBAN_LABEL[col]}</span>
                  <span className="text-xs text-muted-foreground bg-card rounded-full px-2 py-0.5">{colTasks.length}</span>
                </div>
                <div className="space-y-3 min-h-[100px]">
                  {colTasks.map((t) => <TaskCard key={t.id} t={t} draggable />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-lg shadow-soft"><EmptyState icon={CheckSquare} title="Tidak ada tugas" description="Sesuaikan filter atau buat tugas baru." action={<Button onClick={() => navigate("/tasks/new")}><Plus className="h-4 w-4 mr-1.5" /> Tugas Baru</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((t) => <TaskCard key={t.id} t={t} />)}
        </div>
      )}

      <TemplateDialog open={tplOpen} onOpenChange={setTplOpen} templates={templates} onUse={useTemplate} onDelete={deleteTemplate} onReload={loadTemplates} />
    </div>
  );
}

function TemplateDialog({ open, onOpenChange, templates, onUse, onDelete, onReload }) {
  const [name, setName] = useState("");
  const [items, setItems] = useState("");
  const create = async () => {
    if (!name.trim()) { toast.error("Nama template wajib diisi"); return; }
    try {
      await api.post("/tasks/templates", { name, title: name, items: items.split("\n").map((s) => s.trim()).filter(Boolean) });
      toast.success("Template disimpan");
      setName(""); setItems(""); onReload();
    } catch (e) { toast.error(apiError(e)); }
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Template Tugas"
      description="Gunakan template yang tersimpan atau buat template baru."
      size="lg"
      footer={(
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={create} data-testid="btn-save-template">Simpan Template</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {templates.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Belum ada template.</p>}
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex items-center gap-2 p-3 rounded-xl border border-border" data-testid={`template-${tpl.id}`}>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{tpl.name}</p><p className="text-xs text-muted-foreground">{(tpl.items || []).length} item · {tpl.priority}</p></div>
              <Button size="sm" onClick={() => onUse(tpl.id)} data-testid={`use-template-${tpl.id}`}>Gunakan</Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(tpl.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm font-semibold">Buat Template Baru</p>
          <div className="space-y-1.5"><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Onboarding Klien" data-testid="template-name-input" /></div>
          <div className="space-y-1.5"><Label>Item (satu per baris)</Label><textarea value={items} onChange={(e) => setItems(e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder={"Kirim kontrak\nJadwalkan kickoff"} data-testid="template-items-input" /></div>
        </div>
      </div>
    </Modal>
  );
}
