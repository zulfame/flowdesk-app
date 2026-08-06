import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

function StateChip({ meta, fallback, testid }) {
  const { label, chip } = meta || { label: fallback || "\u2014", chip: "--st-draft" };
  return (
    <Badge
      variant="outline"
      className="state-chip font-medium"
      style={{ "--chip": `var(${chip})` }}
      data-testid={testid}
    >
      {label}
    </Badge>
  );
}

export function StatusBadge({ status }) {
  return <StateChip meta={STATUS_META[status]} fallback={status} testid="status-badge" />;
}

export function PriorityBadge({ priority }) {
  return <StateChip meta={PRIORITY_META[priority]} fallback={priority} testid="priority-badge" />;
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
