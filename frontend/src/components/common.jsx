import React from "react";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800",
  Pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "On Progress": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  Overdue: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
  Cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  Archived: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
};

const STATUS_LABELS = {
  Draft: "Draf",
  Pending: "Menunggu",
  "On Progress": "Berjalan",
  Completed: "Selesai",
  Overdue: "Terlambat",
  Cancelled: "Dibatalkan",
  Archived: "Diarsipkan",
};

export function StatusBadge({ status, className }) {
  return (
    <span
      data-testid={`status-badge-${status?.toLowerCase().replace(/\s/g, "-")}`}
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap",
        STATUS_STYLES[status] || STATUS_STYLES.Draft,
        className
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const PRIORITY_STYLES = {
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Urgent: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};
const PRIORITY_LABELS = { Low: "Rendah", Medium: "Sedang", High: "Tinggi", Urgent: "Mendesak" };

export function PriorityBadge({ priority, className }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium, className)}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}

export function ProgressBar({ value = 0, className }) {
  return (
    <div className={cn("bg-secondary rounded-full h-2 overflow-hidden w-full", className)}>
      <div
        className="bg-primary rounded-full h-full transition-all duration-500 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      {Icon && (
        <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
          <Icon className="h-8 w-8 text-primary" />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground text-sm mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export { STATUS_LABELS, PRIORITY_LABELS };
