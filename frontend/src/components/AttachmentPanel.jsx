import React, { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";

import { api, apiError, fileDownloadUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";

function humanSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

/** Dense attachment list; parent can trigger the file picker via ref.open(). */
export default React.forwardRef(function AttachmentPanel({ module, parentId, hideHeader = false }, ref) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    if (!parentId) return;
    try {
      const { data } = await api.get("/attachments", { params: { parent_id: parentId } });
      setFiles(data);
    } catch {
      /* daftar lampiran dibiarkan kosong bila gagal dimuat */
    }
  }, [parentId]);

  useEffect(() => {
    load();
  }, [load]);

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
      notify.success("Lampiran berhasil diunggah.");
      load();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/attachments/${id}`);
      notify.success("Lampiran dihapus.");
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        data-testid="attachment-input"
      />
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-medium">
            <Paperclip className="size-3.5" aria-hidden="true" /> Lampiran ({files.length})
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            data-testid="btn-upload-attachment"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {ACTION.upload}
          </Button>
        </div>
      ) : null}
      {files.length === 0 ? (
        <p className="rounded-md border border-dashed py-2.5 text-center text-xs text-muted-foreground">
          Belum ada lampiran
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 p-2" data-testid={`attachment-${f.id}`}>
              <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{f.original_filename}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {humanSize(f.size)} · {f.uploaded_by_name}
                </p>
              </div>
              <a href={fileDownloadUrl(f.id)} target="_blank" rel="noreferrer" download>
                <Button size="icon" variant="ghost" className="size-7" aria-label="Unduh">
                  <Download className="size-3.5" />
                </Button>
              </a>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive"
                aria-label={ACTION.delete}
                onClick={() => handleDelete(f.id)}
                data-testid={`btn-delete-attachment-${f.id}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
