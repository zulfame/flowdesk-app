import React, { useRef, useState } from "react";
import {
  CornerDownRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { api, apiError, fileDownloadUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";

const EXT_IMG = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];

function previewType(name) {
  if (!name) return null;
  const ext = name.split("?")[0].split(".").pop().toLowerCase();
  if (EXT_IMG.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return null;
}

function docPreview(doc) {
  const name = doc.kind === "url" ? doc.url : doc.filename;
  const type = previewType(name);
  if (!type) return null;
  const src = doc.kind === "url" ? doc.url : fileDownloadUrl(doc.file_id);
  return { type, src, title: doc.kind === "url" ? doc.label || doc.url : doc.filename };
}

function DocLink({ doc }) {
  const isUrl = doc.kind === "url";
  const href = isUrl ? doc.url : fileDownloadUrl(doc.file_id);
  const text = isUrl ? doc.label || doc.url : doc.filename;
  const Icon = isUrl ? Link2 : FileText;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={!isUrl}
      className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-medium hover:underline"
      title={text}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate">{text}</span>
    </a>
  );
}

/** Dense document list with URL/file entries and threaded responses. */
const DocumentManager = React.forwardRef(function DocumentManager({
  taskId,
  documents = [],
  onChange,
  label = "Dokumen Sumber",
  idPrefix = "task",
  canManage = true,
  canRespond = true,
  currentUserId = null,
  canAddDoc = null,
  emptyText = "Belum ada dokumen sumber",
  hideHeaderTitle = false,
  hideActions = false,
}, ref) {
  const allowAdd = canAddDoc == null ? canManage : canAddDoc;
  const fileRef = useRef(null);
  const respFileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlForm, setUrlForm] = useState({ url: "", label: "" });
  const [respOpen, setRespOpen] = useState(false);
  const [respForm, setRespForm] = useState({
    docId: null,
    kind: "url",
    status: "revisi",
    url: "",
    label: "",
    note: "",
  });
  const [respUploading, setRespUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const uploadFile = async (file) => {
    const form = new FormData();
    form.append("module", idPrefix);
    form.append("parent_id", taskId);
    form.append("file", file);
    const { data } = await api.post("/attachments", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

  const addFileDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const rec = await uploadFile(file);
      onChange([
        ...(documents || []),
        { kind: "file", file_id: rec.id, filename: rec.original_filename, responses: [] },
      ]);
      notify.success("Dokumen berhasil diunggah.");
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addUrlDoc = () => {
    if (!urlForm.url.trim()) {
      notify.error("URL wajib diisi.");
      return;
    }
    onChange([
      ...(documents || []),
      { kind: "url", url: urlForm.url.trim(), label: urlForm.label.trim(), responses: [] },
    ]);
    setUrlForm({ url: "", label: "" });
    setUrlOpen(false);
  };

  const removeDoc = (docId) => onChange(documents.filter((d) => d.id !== docId));

  React.useImperativeHandle(
    ref,
    () => ({
      addUrl: () => setUrlOpen(true),
      pickFile: () => fileRef.current?.click(),
      uploading,
    }),
    [uploading]
  );

  const openResp = (docId) => {
    setRespForm({ docId, kind: "url", status: "revisi", url: "", label: "", note: "" });
    setRespOpen(true);
  };

  const saveResp = async () => {
    let resp = { kind: respForm.kind, status: respForm.status, note: respForm.note };
    if (respForm.kind === "url") {
      if (!respForm.url.trim()) {
        notify.error("URL wajib diisi.");
        return;
      }
      resp = { ...resp, url: respForm.url.trim(), label: respForm.label.trim() };
    } else {
      const file = respFileRef.current?.files?.[0];
      if (!file) {
        notify.error("Pilih file balasan terlebih dahulu.");
        return;
      }
      setRespUploading(true);
      try {
        const rec = await uploadFile(file);
        resp = { ...resp, file_id: rec.id, filename: rec.original_filename };
      } catch (err) {
        notify.error(apiError(err));
        setRespUploading(false);
        return;
      }
      setRespUploading(false);
    }
    onChange(
      documents.map((d) =>
        d.id === respForm.docId ? { ...d, responses: [...(d.responses || []), resp] } : d
      )
    );
    setRespOpen(false);
  };

  const removeResp = (docId, respId) => {
    onChange(
      documents.map((d) =>
        d.id === docId ? { ...d, responses: (d.responses || []).filter((r) => r.id !== respId) } : d
      )
    );
  };

  return (
    <div className="space-y-2">
      {!hideHeaderTitle || (allowAdd && !hideActions) ? (
        <div className={`flex items-center gap-2 ${hideHeaderTitle ? "justify-end" : "justify-between"}`}>
          {!hideHeaderTitle ? (
            <p className="text-[13px] font-medium">
              {label} ({(documents || []).length})
            </p>
          ) : null}
          {allowAdd && !hideActions ? (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setUrlOpen(true)}
                data-testid={`${idPrefix}-doc-add-url`}
              >
                <Link2 className="size-3.5" /> URL
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                data-testid={`${idPrefix}-doc-add-file`}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {ACTION.upload}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {(documents || []).length === 0 ? (
        <p className="rounded-md border border-dashed py-2.5 text-center text-xs text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {documents.map((doc, didx) => (
            <div
              key={doc.id || `${idPrefix}-d-${didx}`}
              className="p-2"
              data-testid={`${idPrefix}-doc-${doc.id}`}
            >
              <div className="flex items-center gap-1">
                <DocLink doc={doc} />
                <div className="flex-1" />
                {docPreview(doc) ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label="Pratinjau"
                    onClick={() => setPreview(docPreview(doc))}
                    data-testid={`${idPrefix}-doc-preview-${doc.id}`}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                ) : null}
                <a
                  href={doc.kind === "url" ? doc.url : fileDownloadUrl(doc.file_id)}
                  target="_blank"
                  rel="noreferrer"
                  download={doc.kind !== "url"}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={doc.kind === "url" ? "Buka tautan" : "Unduh"}
                  >
                    {doc.kind === "url" ? (
                      <ExternalLink className="size-3.5" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                  </Button>
                </a>
                {canManage || (currentUserId && doc.created_by === currentUserId) ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive"
                    aria-label={ACTION.delete}
                    onClick={() => removeDoc(doc.id)}
                    data-testid={`${idPrefix}-doc-del-${doc.id}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>

              {(doc.responses || []).length > 0 ? (
                <div className="mt-1.5 space-y-1 border-l pl-3">
                  {doc.responses.map((r, ridx) => (
                    <div
                      key={r.id || `${doc.id}-r-${ridx}`}
                      className="flex items-center gap-1.5 text-xs"
                      data-testid={`${idPrefix}-resp-${r.id}`}
                    >
                      <CornerDownRight className="size-3 shrink-0 text-muted-foreground" />
                      <Badge
                        variant={r.status === "final" ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {r.status === "final" ? "Final" : "Revisi"}
                      </Badge>
                      <a
                        href={r.kind === "url" ? r.url : fileDownloadUrl(r.file_id)}
                        target="_blank"
                        rel="noreferrer"
                        download={r.kind !== "url"}
                        className="min-w-0 truncate hover:underline"
                      >
                        {r.kind === "url" ? r.label || r.url : r.filename}
                      </a>
                      {r.note ? (
                        <span className="truncate text-muted-foreground">· {r.note}</span>
                      ) : null}
                      <div className="flex-1" />
                      {canManage || (currentUserId && r.created_by === currentUserId) ? (
                        <button
                          type="button"
                          aria-label={ACTION.delete}
                          onClick={() => removeResp(doc.id, r.id)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {canRespond ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 text-xs"
                  onClick={() => openResp(doc.id)}
                  data-testid={`${idPrefix}-doc-add-resp-${doc.id}`}
                >
                  <Plus className="size-3" /> Dokumen Balasan
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={addFileDoc}
        data-testid={`${idPrefix}-doc-file-input`}
      />

      <Dialog open={urlOpen} onOpenChange={setUrlOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Dokumen URL</DialogTitle>
          </DialogHeader>
          <DialogBody className="form-dense space-y-[var(--field-gap)]">
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor={`${idPrefix}-url`}>URL Referensi</Label>
              <Input
                id={`${idPrefix}-url`}
                value={urlForm.url}
                onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })}
                placeholder="https://..."
                data-testid={`${idPrefix}-url-input`}
              />
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor={`${idPrefix}-url-label`}>Label</Label>
              <Input
                id={`${idPrefix}-url-label`}
                value={urlForm.label}
                onChange={(e) => setUrlForm({ ...urlForm, label: e.target.value })}
                placeholder="Nama dokumen"
                data-testid={`${idPrefix}-url-label-input`}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUrlOpen(false)}>
              {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={addUrlDoc} data-testid={`${idPrefix}-url-save`}>
              {ACTION.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={respOpen} onOpenChange={setRespOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dokumen Balasan</DialogTitle>
          </DialogHeader>
          <DialogBody className="form-dense space-y-[var(--field-gap)]">
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label>Jenis</Label>
                <Select
                  value={respForm.kind}
                  onValueChange={(v) => setRespForm({ ...respForm, kind: v })}
                >
                  <SelectTrigger data-testid={`${idPrefix}-resp-kind`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="file">Unggah File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label>Status</Label>
                <Select
                  value={respForm.status}
                  onValueChange={(v) => setRespForm({ ...respForm, status: v })}
                >
                  <SelectTrigger data-testid={`${idPrefix}-resp-status`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revisi">Revisi</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {respForm.kind === "url" ? (
              <>
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor={`${idPrefix}-resp-url-input`}>URL</Label>
                  <Input
                    id={`${idPrefix}-resp-url-input`}
                    value={respForm.url}
                    onChange={(e) => setRespForm({ ...respForm, url: e.target.value })}
                    placeholder="https://..."
                    data-testid={`${idPrefix}-resp-url`}
                  />
                </div>
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor={`${idPrefix}-resp-label-input`}>Label</Label>
                  <Input
                    id={`${idPrefix}-resp-label-input`}
                    value={respForm.label}
                    onChange={(e) => setRespForm({ ...respForm, label: e.target.value })}
                    data-testid={`${idPrefix}-resp-label`}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-[var(--item-gap)]">
                <Label>File</Label>
                <input
                  ref={respFileRef}
                  type="file"
                  className="text-xs"
                  data-testid={`${idPrefix}-resp-file`}
                />
              </div>
            )}
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor={`${idPrefix}-resp-note-input`}>Catatan</Label>
              <Textarea
                id={`${idPrefix}-resp-note-input`}
                rows={2}
                value={respForm.note}
                onChange={(e) => setRespForm({ ...respForm, note: e.target.value })}
                data-testid={`${idPrefix}-resp-note`}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRespOpen(false)}>
              {ACTION.cancel}
            </Button>
            <Button
              size="sm"
              onClick={saveResp}
              disabled={respUploading}
              data-testid={`${idPrefix}-resp-save`}
            >
              {respUploading ? "Mengunggah..." : ACTION.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{preview?.title}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {preview?.type === "image" ? (
              <img
                src={preview.src}
                alt={preview.title}
                className="mx-auto max-h-[70vh] w-auto rounded-md"
                data-testid={`${idPrefix}-preview-image`}
              />
            ) : (
              <iframe
                src={preview?.src}
                title="pratinjau"
                className="h-[70vh] w-full rounded-md border"
                data-testid={`${idPrefix}-preview-pdf`}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default DocumentManager;
