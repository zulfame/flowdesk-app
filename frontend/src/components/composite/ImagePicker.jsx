import React, { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";

/**
 * ImagePicker — compact image field (preview + Unggah/Hapus).
 * Reads the file into a base64 data URL; the caller persists it.
 */
export function ImagePicker({
  value,
  onChange,
  maxKB = 600,
  disabled = false,
  testid = "image",
}) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const onFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify.error("Berkas harus berupa gambar.");
      return;
    }
    if (file.size > maxKB * 1024) {
      notify.error(`Ukuran gambar maksimal ${maxKB} KB.`);
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
      setLoading(false);
    };
    reader.onerror = () => {
      notify.error("Gagal membaca gambar.");
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
        {value ? (
          <img src={value} alt="" className="size-10 object-contain" />
        ) : (
          <ImageIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || loading}
          data-testid={`${testid}-btn`}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          {ACTION.upload}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onChange("")}
            disabled={disabled || loading}
            data-testid={`${testid}-clear`}
          >
            <X className="size-4" aria-hidden="true" /> {ACTION.delete}
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
        data-testid={`${testid}-input`}
      />
    </div>
  );
}
