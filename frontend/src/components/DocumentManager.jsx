import React, { useRef, useState } from "react";
import { api, fileDownloadUrl, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Link2, Upload, Trash2, Download, CornerDownRight, Plus, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLE = {
  revisi: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  final: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function DocLink({ doc }) {
  if (doc.kind === "url") {
    return (
      <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-medium truncate hover:underline flex items-center gap-1.5 min-w-0" title={doc.url}>
        <Link2 className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{doc.label || doc.url}</span>
      </a>
    );
  }
  return (
    <a href={fileDownloadUrl(doc.file_id)} target="_blank" rel="noreferrer" download className="text-sm font-medium truncate hover:underline flex items-center gap-1.5 min-w-0" title={doc.filename}>
      <FileText className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{doc.filename}</span>
    </a>
  );
}

export default function DocumentManager({ taskId, documents = [], onChange, label = "Dokumen Sumber", idPrefix = "task" }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlForm, setUrlForm] = useState({ url: "", label: "" });
  const [respOpen, setRespOpen] = useState(false);
  const [respForm, setRespForm] = useState({ docId: null, kind: "url", status: "revisi", url: "", label: "", note: "" });
  const respFileRef = useRef(null);
  const [respUploading, setRespUploading] = useState(false);

  const uploadFile = async (file) => {
    const form = new FormData();
    form.append("module", idPrefix);
    form.append("parent_id", taskId);
    form.append("file", file);
    const { data } = await api.post("/attachments", form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  };

  const addFileDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const rec = await uploadFile(file);
      onChange([...(documents || []), { kind: "file", file_id: rec.id, filename: rec.original_filename, responses: [] }]);
      toast.success("Dokumen sumber diunggah");
    } catch (err) { toast.error(apiError(err)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const addUrlDoc = () => {
    if (!urlForm.url.trim()) { toast.error("URL wajib diisi"); return; }
    onChange([...(documents || []), { kind: "url", url: urlForm.url.trim(), label: urlForm.label.trim(), responses: [] }]);
    setUrlForm({ url: "", label: "" });
    setUrlOpen(false);
  };

  const removeDoc = (docId) => onChange(documents.filter((d) => d.id !== docId));

  const openResp = (docId) => { setRespForm({ docId, kind: "url", status: "revisi", url: "", label: "", note: "" }); setRespOpen(true); };

  const saveResp = async () => {
    let resp = { kind: respForm.kind, status: respForm.status, note: respForm.note };
    if (respForm.kind === "url") {
      if (!respForm.url.trim()) { toast.error("URL wajib diisi"); return; }
      resp = { ...resp, url: respForm.url.trim(), label: respForm.label.trim() };
    } else {
      const file = respFileRef.current?.files?.[0];
      if (!file) { toast.error("Pilih file balasan"); return; }
      setRespUploading(true);
      try {
        const rec = await uploadFile(file);
        resp = { ...resp, file_id: rec.id, filename: rec.original_filename };
      } catch (err) { toast.error(apiError(err)); setRespUploading(false); return; }
      setRespUploading(false);
    }
    const newDocs = documents.map((d) => d.id === respForm.docId ? { ...d, responses: [...(d.responses || []), resp] } : d);
    onChange(newDocs);
    setRespOpen(false);
  };

  const removeResp = (docId, respId) => {
    onChange(documents.map((d) => d.id === docId ? { ...d, responses: (d.responses || []).filter((r) => r.id !== respId) } : d));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> {label} ({(documents || []).length})</h3>
        <div className="flex gap-1.5">
          <input ref={fileRef} type="file" className="hidden" onChange={addFileDoc} data-testid={`${idPrefix}-doc-file-input`} />
          <Button size="sm" variant="secondary" onClick={() => setUrlOpen(true)} data-testid={`${idPrefix}-doc-add-url`}><Link2 className="h-4 w-4 mr-1" /> URL</Button>
          <Button size="sm" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()} data-testid={`${idPrefix}-doc-add-file`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}<span className="ml-1">Unggah</span>
          </Button>
        </div>
      </div>

      {(documents || []).length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-xl">Belum ada dokumen sumber</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc, didx) => (
            <div key={doc.id || `${idPrefix}-d-${didx}`} className="rounded-xl border border-border bg-card p-3" data-testid={`${idPrefix}-doc-${doc.id}`}>
              <div className="flex items-center gap-2">
                <DocLink doc={doc} />
                <div className="flex-1" />
                {doc.kind === "url"
                  ? <a href={doc.url} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button></a>
                  : <a href={fileDownloadUrl(doc.file_id)} target="_blank" rel="noreferrer" download><Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button></a>}
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeDoc(doc.id)} data-testid={`${idPrefix}-doc-del-${doc.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>

              {/* responses */}
              {(doc.responses || []).length > 0 && (
                <div className="mt-2 pl-4 border-l-2 border-border space-y-1.5">
                  {doc.responses.map((r, ridx) => (
                    <div key={r.id || `${doc.id}-r-${ridx}`} className="flex items-center gap-2 text-xs" data-testid={`${idPrefix}-resp-${r.id}`}>
                      <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status] || ""}`}>{r.status === "final" ? "Final" : "Revisi"}</span>
                      {r.kind === "url"
                        ? <a href={r.url} target="_blank" rel="noreferrer" className="truncate hover:underline min-w-0">{r.label || r.url}</a>
                        : <a href={fileDownloadUrl(r.file_id)} target="_blank" rel="noreferrer" download className="truncate hover:underline min-w-0">{r.filename}</a>}
                      {r.note && <span className="text-muted-foreground truncate">· {r.note}</span>}
                      <div className="flex-1" />
                      <button onClick={() => removeResp(doc.id, r.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              <Button size="sm" variant="ghost" className="h-7 mt-2 text-xs text-primary" onClick={() => openResp(doc.id)} data-testid={`${idPrefix}-doc-add-resp-${doc.id}`}>
                <Plus className="h-3 w-3 mr-1" /> Dokumen Balasan
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add URL dialog */}
      <Dialog open={urlOpen} onOpenChange={setUrlOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Dokumen URL</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>URL Referensi</Label><Input value={urlForm.url} onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })} placeholder="https://..." data-testid={`${idPrefix}-url-input`} /></div>
            <div className="space-y-1.5"><Label>Label (opsional)</Label><Input value={urlForm.label} onChange={(e) => setUrlForm({ ...urlForm, label: e.target.value })} placeholder="Nama dokumen" data-testid={`${idPrefix}-url-label-input`} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setUrlOpen(false)}>Batal</Button><Button onClick={addUrlDoc} data-testid={`${idPrefix}-url-save`}>Tambah</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add response dialog */}
      <Dialog open={respOpen} onOpenChange={setRespOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dokumen Balasan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jenis</Label>
                <Select value={respForm.kind} onValueChange={(v) => setRespForm({ ...respForm, kind: v })}>
                  <SelectTrigger data-testid={`${idPrefix}-resp-kind`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="url">URL</SelectItem><SelectItem value="file">Unggah File</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={respForm.status} onValueChange={(v) => setRespForm({ ...respForm, status: v })}>
                  <SelectTrigger data-testid={`${idPrefix}-resp-status`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="revisi">Revisi</SelectItem><SelectItem value="final">Final</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {respForm.kind === "url" ? (
              <>
                <div className="space-y-1.5"><Label>URL</Label><Input value={respForm.url} onChange={(e) => setRespForm({ ...respForm, url: e.target.value })} placeholder="https://..." data-testid={`${idPrefix}-resp-url`} /></div>
                <div className="space-y-1.5"><Label>Label</Label><Input value={respForm.label} onChange={(e) => setRespForm({ ...respForm, label: e.target.value })} data-testid={`${idPrefix}-resp-label`} /></div>
              </>
            ) : (
              <div className="space-y-1.5"><Label>File</Label><input ref={respFileRef} type="file" className="text-sm" data-testid={`${idPrefix}-resp-file`} /></div>
            )}
            <div className="space-y-1.5"><Label>Catatan (opsional)</Label><Textarea value={respForm.note} onChange={(e) => setRespForm({ ...respForm, note: e.target.value })} rows={2} data-testid={`${idPrefix}-resp-note`} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setRespOpen(false)}>Batal</Button><Button onClick={saveResp} disabled={respUploading} data-testid={`${idPrefix}-resp-save`}>{respUploading ? "Mengunggah..." : "Simpan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
