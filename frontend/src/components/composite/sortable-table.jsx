import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Client-side sorting for plain (non-TanStack) tables.
 * `accessors` maps a sort key -> (row) => comparable value. Keep it at module
 * scope so its identity is stable across renders.
 */
export function useSortableRows(rows, accessors, initial = null) {
  const [sort, setSort] = useState(initial); // { key, dir } | null

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const get = accessors[sort.key] || ((r) => r[sort.key]);
    const copy = [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const na = va == null ? "" : va;
      const nb = vb == null ? "" : vb;
      if (typeof na === "number" && typeof nb === "number") return na - nb;
      return String(na).localeCompare(String(nb), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
    if (sort.dir === "desc") copy.reverse();
    return copy;
  }, [rows, sort, accessors]);

  const toggle = (key) =>
    setSort((p) =>
      p && p.key === key
        ? { key, dir: p.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  return { sorted, sort, toggle };
}

/**
 * Sortable column header button. Works for both client-side (useSortableRows)
 * and server-side sorting — the caller owns the `sort` state and `onToggle`.
 */
export function SortHead({ label, sortKey, sort, onToggle, align = "left", className }) {
  const active = sort?.key === sortKey;
  const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 font-medium hover:text-foreground",
        align === "right" && "flex-row-reverse",
        className,
      )}
      data-testid={`sort-${sortKey}`}
    >
      {label}
      <Icon className={cn("size-3.5", active ? "opacity-100" : "opacity-50")} aria-hidden="true" />
    </button>
  );
}
