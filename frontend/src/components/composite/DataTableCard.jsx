import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  RefreshCw,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/composite/EmptyState";
import { DensityToggle } from "@/components/density-toggle";

/** Standard date/time formatter for table cells. */
export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

/** Standard sortable column header button. */
export function SortableHeader({ column, children, align = "left" }) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className={`flex h-full w-full items-center gap-1 font-medium ${align === "right" ? "justify-end text-right" : "text-left"}`}
      data-testid={`sort-${column.id}`}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5" aria-hidden="true" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5" aria-hidden="true" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * DataTableCard — the standard card-wrapped TanStack DataTable used across the
 * app (search, sortable headers, density toggle, pagination, empty states).
 */
export function DataTableCard({
  title,
  description,
  onRefresh,
  refreshTestId,
  headerAction,
  columns,
  data,
  loading,
  searchPlaceholder,
  testid,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const hasSearch = globalFilter.trim().length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerAction}
          {onRefresh ? (
            <Button variant="outline" size="sm" onClick={onRefresh} data-testid={refreshTestId}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-[15rem]">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-[var(--ctl-h-sm)] pl-8 text-xs"
              data-testid={`${testid}-search`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasSearch && (
              <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")} data-testid={`${testid}-reset`}>
                <FilterX className="size-4" /> Reset
              </Button>
            )}
            <DensityToggle />
          </div>
        </div>

        <div className="rounded-md border">
          {loading ? (
            <div className="space-y-2 p-4" data-testid={`${testid}-loading`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState variant="first-time" icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
          ) : (
            <Table data-testid={`${testid}-table`} className="tbl-density [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2" data-testid={`${testid}-empty-filtered`}>
                        <span>No rows match your search.</span>
                        <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")}>
                          <FilterX className="size-4" /> Reset
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {!loading && data.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
                <SelectTrigger className="h-[var(--ctl-h-sm)] w-[70px]" data-testid={`${testid}-page-size`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>of {totalRows.toLocaleString()} rows</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-xs text-muted-foreground">
                Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-[var(--ctl-h-sm)]"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-[var(--ctl-h-sm)]"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
