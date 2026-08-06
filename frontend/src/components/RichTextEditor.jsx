import React, { useRef, useEffect } from "react";
import { Bold, Italic, List, ListOrdered, CheckSquare, Table as TableIcon, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOOLS = [
  { cmd: "bold", icon: Bold, label: "Tebal" },
  { cmd: "italic", icon: Italic, label: "Miring" },
  { cmd: "insertUnorderedList", icon: List, label: "Poin" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Nomor" },
];

export default function RichTextEditor({ value, onChange, placeholder = "Tulis catatan di sini...", minHeight = 220 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (cmd) => {
    document.execCommand(cmd, false, null);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || "");
  };

  const insertChecklist = () => {
    document.execCommand("insertHTML", false, '<div>☐ &nbsp;</div>');
    onChange(ref.current?.innerHTML || "");
  };

  const insertTable = () => {
    const html = '<table><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p></p>';
    document.execCommand("insertHTML", false, html);
    onChange(ref.current?.innerHTML || "");
  };

  const insertImage = () => {
    const url = window.prompt("Masukkan URL gambar:");
    if (url) {
      document.execCommand("insertImage", false, url);
      onChange(ref.current?.innerHTML || "");
    }
  };

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1">
        {TOOLS.map((t) => (
          <Button
            key={t.cmd}
            type="button"
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            title={t.label}
            data-testid={`rte-${t.cmd}`}
            onMouseDown={(e) => { e.preventDefault(); exec(t.cmd); }}
          >
            <t.icon className="size-3.5" />
          </Button>
        ))}
        <Button type="button" variant="ghost" size="sm" className="size-7 p-0" title="Checklist" data-testid="rte-checklist" onMouseDown={(e) => { e.preventDefault(); insertChecklist(); }}>
          <CheckSquare className="size-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="size-7 p-0" title="Tabel" data-testid="rte-table" onMouseDown={(e) => { e.preventDefault(); insertTable(); }}>
          <TableIcon className="size-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="size-7 p-0" title="Gambar" data-testid="rte-image" onMouseDown={(e) => { e.preventDefault(); insertImage(); }}>
          <ImageIcon className="size-3.5" />
        </Button>
      </div>
      <div
        ref={ref}
        contentEditable
        data-testid="rte-content"
        data-placeholder={placeholder}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="rte-content px-3 py-2 text-sm leading-relaxed outline-none focus:ring-0"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
}
