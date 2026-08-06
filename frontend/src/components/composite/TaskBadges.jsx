import { Badge } from "@/components/ui/badge";
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
const DAY_MS = 86400000;

/** Badge tenggat relatif berwarna ("Besok", "3 hari lagi", "Lewat 2 hari") — dipakai bersama. */
export function DeadlineBadge({ date, title }) {
  if (!date) return <span className="text-muted-foreground">{"\u2014"}</span>;
  const end = new Date(new Date(date).toDateString());
  if (Number.isNaN(end.getTime())) return <span className="text-muted-foreground">{"\u2014"}</span>;
  const d = Math.round((end - new Date(new Date().toDateString())) / DAY_MS);
  const meta =
    d < 0
      ? { text: `Lewat ${Math.abs(d)} hari`, chip: "--st-overdue" }
      : d === 0
        ? { text: "Hari ini", chip: "--st-overdue" }
        : d === 1
          ? { text: "Besok", chip: "--st-pending" }
          : d <= 3
            ? { text: `${d} hari lagi`, chip: "--st-pending" }
            : d <= 7
              ? { text: `${d} hari lagi`, chip: "--st-progress" }
              : { text: `${d} hari lagi`, chip: "--st-done" };
  return (
    <Badge
      variant="outline"
      className="state-chip whitespace-nowrap font-medium"
      style={{ "--chip": `var(${meta.chip})` }}
      title={title || new Date(date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
    >
      {meta.text}
    </Badge>
  );
}

export function ProgressCell({ value = 0 }) {
  return (
    <div className="flex items-center gap-2">
      <Progress value={value} className="h-1.5 w-16" />
      <span className="w-8 text-right text-xs text-muted-foreground">{value}%</span>
    </div>
  );
}
