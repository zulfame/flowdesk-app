import React, { useEffect, useState, useRef } from "react";
import { api, fileDownloadUrl, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Paperclip, Download, Trash2, FileText, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

function humanSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export default React.forwardRef(function AttachmentPanel({ module, parentId, hideHeader = false }, ref) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const load = async () => {
    if (!parentId) return;
    try {
      const { data } = await api.get("/attachments", { params: { parent_id: parentId } });
      setFiles(data);
    } catch {}
  };

  useEffect(() => { load(); }, [parentId]);

  React.useImperativeHandle(ref, () => ({ open: () => inputRef.current?.click(), uploading }), [uploading]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("module", module);
    form.append("parent_id", parentId);
    form.append("file", file);
    setUploading(true);
    try {
      await api.post("/attachments", form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("File berhasil diunggah");
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/attachments/${id}`);
      toast.success("File dihapus");
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} data-testid="attachment-input" />
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Lampiran ({files.length})
          </h3>
          <Button size="sm" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()} data-testid="btn-upload-attachment">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span className="ml-1.5">Unggah</span>
          </Button>
        </div>
      )}
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-xl">Belum ada lampiran</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors" data-testid={`attachment-${f.id}`}>
              <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{f.original_filename}</p>
                <p className="text-xs text-muted-foreground">{humanSize(f.size)} · {f.uploaded_by_name}</p>
              </div>
              <a href={fileDownloadUrl(f.id)} target="_blank" rel="noreferrer" download>
                <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
              </a>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(f.id)} data-testid={`btn-delete-attachment-${f.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
