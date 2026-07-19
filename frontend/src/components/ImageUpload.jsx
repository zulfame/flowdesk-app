import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Reads an image file into a base64 data URL (stored directly in DB for branding/avatars). */
export default function ImageUpload({ value, onChange, label = "Unggah Gambar", rounded = "rounded-xl", maxKB = 600, testId = "image-upload" }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > maxKB * 1024) { toast.error(`Ukuran gambar maksimal ${maxKB} KB`); return; }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => { onChange(reader.result); setLoading(false); };
    reader.onerror = () => { toast.error("Gagal membaca gambar"); setLoading(false); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`h-16 w-16 ${rounded} border border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0`}>
        {value ? <img src={value} alt="preview" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" className="rounded-xl" onClick={pick} disabled={loading} data-testid={`${testId}-btn`}>
          {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />} {label}
        </Button>
        {value && <Button type="button" variant="ghost" size="sm" className="rounded-xl text-destructive" onClick={() => onChange("")} data-testid={`${testId}-clear`}><X className="h-4 w-4" /></Button>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} data-testid={`${testId}-input`} />
    </div>
  );
}
