import React from "react";
import { Trash2, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

/**
 * ConfirmDeleteDialog — standard confirmation dialog (R40/R47.6).
 * Judul di header, penjelasan di body, aksi di footer kiri-kanan (FD12).
 * Set `destructive={false}` for reversible actions (e.g. restore).
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Hapus data ini?",
  description = "Tindakan ini tidak dapat dibatalkan.",
  confirmLabel = ACTION.delete,
  destructive = true,
  icon: Icon = Trash2,
  onConfirm,
  testid = "confirm-delete",
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testid}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="px-6 py-4">
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid={`${testid}-cancel`}>
            <X className="size-4" /> {ACTION.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              buttonVariants({ variant: destructive ? "destructive" : "default", size: "sm" })
            )}
            data-testid={`${testid}-confirm`}
          >
            <Icon className="size-4" aria-hidden="true" /> {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
