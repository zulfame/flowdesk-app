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
import { ACTION } from "@/constants/labels";

/** Standard date/time formatter for table cells (locale id-ID). */
export const fmtDate = (iso) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "\u2014"
    : d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

/** Standard sortable column header button (R46). */
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
 * DataTableCard — the standard card-wrapped TanStack DataTable (R47):
 * Card wrapper → toolbar in a muted card → dense table → pagination footer.
 *
 * Two modes:
 *  - CLIENT (default): search / pagination handled in-browser.
 *  - SERVER: pass `search={{ value, onChange }}` and/or `pagination={{ pageIndex,
 *    pageSize, pageCount, totalRows, onPageChange, onPageSizeChange }}` to let
 *    the caller drive them from the API.
 * `filters` renders extra controls on the right side of the toolbar.
 * The search placeholder is LOCKED to `ACTION.search` ("Pencarian...") — FD9.
 */
export function DataTableCard({
  title,
  description,
  onRefresh,
  refreshTestId,
  headerAction,
  filters,
  columns,
  data,
  loading,
  search,
  pagination,
  testid,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const serverSearch = Boolean(search);
  const serverPaging = Boolean(pagination);

  const searchValue = serverSearch ? search.value : globalFilter;
  const setSearchValue = serverSearch ? search.onChange : setGlobalFilter;

  const table = useReactTable({
    data,
    columns,
    state: { sorting, ...(serverSearch ? {} : { globalFilter }) },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(serverSearch
      ? {}
      : { onGlobalFilterChange: setGlobalFilter, getFilteredRowModel: getFilteredRowModel() }),
    ...(serverPaging
      ? { manualPagination: true, pageCount: Math.max(1, pagination.pageCount) }
      : { getPaginationRowModel: getPaginationRowModel() }),
    initialState: { pagination: { pageSize: 10 } },
  });

  const clientPaging = table.getState().pagination;
  const pageIndex = serverPaging ? pagination.pageIndex : clientPaging.pageIndex;
  const pageSize = serverPaging ? pagination.pageSize : clientPaging.pageSize;
  const pageCount = serverPaging
    ? Math.max(1, pagination.pageCount)
    : Math.max(1, table.getPageCount());
  const totalRows = serverPaging
    ? pagination.totalRows
    : table.getFilteredRowModel().rows.length;

  const canPrev = serverPaging ? pageIndex > 0 : table.getCanPreviousPage();
  const canNext = serverPaging ? pageIndex + 1 < pageCount : table.getCanNextPage();
  const goPrev = () =>
    serverPaging ? pagination.onPageChange(pageIndex - 1) : table.previousPage();
  const goNext = () =>
    serverPaging ? pagination.onPageChange(pageIndex + 1) : table.nextPage();
  const changePageSize = (value) =>
    serverPaging ? pagination.onPageSizeChange(value) : table.setPageSize(value);

  const hasSearch = String(searchValue || "").trim().length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerAction}
          {onRefresh ? (
            <Button variant="outline" size="sm" onClick={onRefresh} data-testid={refreshTestId}>
              <RefreshCw className="size-4" /> {ACTION.refresh}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-[15rem]">
            <Search
              className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={ACTION.search}
              className="h-[var(--ctl-h-sm)] pl-8 text-xs"
              data-testid={`${testid}-search`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters}
            {hasSearch && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchValue("")}
                data-testid={`${testid}-reset`}
              >
                <FilterX className="size-4" /> {ACTION.reset}
              </Button>
            )}
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
            <EmptyState
              variant="first-time"
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
            />
          ) : (
            <Table
              data-testid={`${testid}-table`}
              className="tbl-density [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
            >
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
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
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      <div
                        className="flex flex-col items-center gap-2"
                        data-testid={`${testid}-empty-filtered`}
                      >
                        <span>Tidak ada baris yang cocok dengan pencarian.</span>
                        <Button variant="outline" size="sm" onClick={() => setSearchValue("")}>
                          <FilterX className="size-4" /> {ACTION.reset}
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
              <Select value={String(pageSize)} onValueChange={(v) => changePageSize(Number(v))}>
                <SelectTrigger
                  className="h-[var(--ctl-h-sm)] w-[70px]"
                  data-testid={`${testid}-page-size`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span data-testid={`${testid}-total`}>
                dari {Number(totalRows).toLocaleString("id-ID")} baris
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-xs text-muted-foreground" data-testid={`${testid}-page`}>
                Halaman {pageIndex + 1} dari {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-[var(--ctl-h-sm)]"
                  onClick={goPrev}
                  disabled={!canPrev}
                  aria-label="Halaman sebelumnya"
                  data-testid={`${testid}-prev`}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-[var(--ctl-h-sm)]"
                  onClick={goNext}
                  disabled={!canNext}
                  aria-label="Halaman berikutnya"
                  data-testid={`${testid}-next`}
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
