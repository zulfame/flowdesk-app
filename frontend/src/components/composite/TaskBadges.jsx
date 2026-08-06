import { Progress } from "@/components/ui/progress";
import { StateChip } from "@/components/composite/StateChip";

/**
 * Task status/priority meta.
 * `chip` = CSS variable hue (E9 exception: badge status & prioritas boleh berwarna).
 */
export const STATUS_META = {
  Draft: { label: "Draf", chip: "--st-draft" },
  Pending: { label: "Menunggu", chip: "--st-pending" },
  "On Progress": { label: "Berjalan", chip: "--st-progress" },
  Completed: { label: "Selesai", chip: "--st-done" },
  Overdue: { label: "Terlambat", chip: "--st-overdue" },
  Cancelled: { label: "Dibatalkan", chip: "--st-cancelled" },
  Archived: { label: "Arsip", chip: "--st-archived" },
};

export const PRIORITY_META = {
  Urgent: { label: "Mendesak", chip: "--pr-urgent" },
  High: { label: "Tinggi", chip: "--pr-high" },
  Medium: { label: "Sedang", chip: "--pr-medium" },
  Low: { label: "Rendah", chip: "--pr-low" },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, chip: "--st-draft" };
  return <StateChip label={meta.label} chip={meta.chip} testid="status-badge" />;
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || { label: priority, chip: "--pr-low" };
  return <StateChip label={meta.label} chip={meta.chip} testid="priority-badge" />;
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
