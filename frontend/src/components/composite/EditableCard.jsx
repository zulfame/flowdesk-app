import React, { useState } from "react";
import { Pencil, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTION } from "@/constants/labels";

/**
 * Section card with built-in inline edit mode.
 * `children` is a render prop: (editing: boolean) => ReactNode.
 * `onSave` may return false to keep the card in edit mode.
 */
export function EditableCard({
  title,
  canEdit = false,
  onEditStart,
  onSave,
  headerExtra,
  footerExtra,
  contentClassName,
  testid,
  children,
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const start = () => {
    onEditStart?.();
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const ok = await onSave?.();
    setSaving(false);
    if (ok !== false) setEditing(false);
  };

  return (
    <Card data-testid={`card-${testid}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="min-w-0 truncate text-base">{title}</CardTitle>
        <div className="flex shrink-0 items-center gap-1">
          {headerExtra}
          {canEdit && !editing ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Ubah ${title}`}
              onClick={start}
              data-testid={`btn-edit-${testid}`}
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children(editing)}</CardContent>
      {editing ? (
        <CardFooter className="justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(false)}
            data-testid={`btn-cancel-${testid}`}
          >
            <X className="size-4" /> {ACTION.cancel}
          </Button>
          <Button size="sm" onClick={save} disabled={saving} data-testid={`btn-save-${testid}`}>
            <Save className="size-4" /> {saving ? ACTION.saving : ACTION.save}
          </Button>
        </CardFooter>
      ) : footerExtra ? (
        <CardFooter className="justify-end">{footerExtra}</CardFooter>
      ) : null}
    </Card>
  );
}
