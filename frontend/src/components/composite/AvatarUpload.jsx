import React, { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

/** Initials for the avatar fallback. */
const initialsOf = (name) =>
  ((name || "").trim().slice(0, 1) || "U").toUpperCase();

/**
 * AvatarUpload — compact avatar picker (Avatar `h-12 w-12` + Upload/Remove).
 * Reads the picked image into a base64 data URL; the caller decides when to
 * persist it. Size stays within the density budget (guard #5).
 */
export function AvatarUpload({
  value,
  onChange,
  name,
  maxKB = 600,
  disabled = false,
  testid = "avatar",
}) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const onFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Berkas harus berupa gambar.");
      return;
    }
    if (file.size > maxKB * 1024) {
      toast.error(`Ukuran gambar maksimal ${maxKB} KB.`);
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
      setLoading(false);
    };
    reader.onerror = () => {
      toast.error("Gagal membaca gambar.");
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-12 w-12 rounded-lg">
        {value ? <AvatarImage src={value} alt="" className="object-cover" /> : null}
        <AvatarFallback className="rounded-lg text-sm">
          {initialsOf(name)}
        </AvatarFallback>
      </Avatar>
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
          Unggah Foto
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
            <X className="size-4" aria-hidden="true" /> Hapus
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
