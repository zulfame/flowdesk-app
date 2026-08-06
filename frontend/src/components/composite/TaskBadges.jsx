import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

/** Task status → Indonesian label + monochrome/semantic Badge variant. */
export const STATUS_META = {
  Draft: { label: "Draf", variant: "outline" },
  Pending: { label: "Menunggu", variant: "outline" },
  "On Progress": { label: "Berjalan", variant: "secondary" },
  Completed: { label: "Selesai", variant: "default" },
  Overdue: { label: "Terlambat", variant: "destructive" },
  Cancelled: { label: "Dibatalkan", variant: "outline" },
  Archived: { label: "Arsip", variant: "outline" },
};

export const PRIORITY_META = {
  Urgent: { label: "Mendesak", variant: "destructive" },
  High: { label: "Tinggi", variant: "default" },
  Medium: { label: "Sedang", variant: "secondary" },
  Low: { label: "Rendah", variant: "outline" },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || "\u2014", variant: "outline" };
  return (
    <Badge variant={meta.variant} className="font-normal">
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || { label: priority || "\u2014", variant: "outline" };
  return (
    <Badge variant={meta.variant} className="font-normal">
      {meta.label}
    </Badge>
  );
}

/** Inline progress indicator for dense table cells. */
export function ProgressCell({ value = 0 }) {
  return (
    <div className="flex items-center gap-2">
      <Progress value={value} className="h-1.5 w-16" />
      <span className="w-8 text-right text-xs text-muted-foreground">{value}%</span>
    </div>
  );
}
