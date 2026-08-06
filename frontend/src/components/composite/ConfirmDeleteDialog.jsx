import React from "react";
import { Trash2 } from "lucide-react";

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
 * ConfirmDeleteDialog — standard destructive confirmation (R40/R47.6).
 * Cancel on the left, destructive action on the right (R50).
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Hapus data ini?",
  description = "Tindakan ini tidak dapat dibatalkan.",
  confirmLabel = ACTION.delete,
  onConfirm,
  testid = "confirm-delete",
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testid}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid={`${testid}-cancel`}>{ACTION.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
            data-testid={`${testid}-confirm`}
          >
            <Trash2 className="size-4" aria-hidden="true" /> {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
