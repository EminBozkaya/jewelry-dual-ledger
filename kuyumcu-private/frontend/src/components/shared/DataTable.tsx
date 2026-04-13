import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Row,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "./SearchInput";
import { EmptyState } from "./EmptyState";
import { ExportButtons, type ExportColumn, type ExportSummarySection } from "./ExportButtons";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  searchPlaceholder?: string;
  searchableColumns?: string[];
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  exportFilename?: string;
  exportColumns?: ExportColumn[];
  exportSummary?: ExportSummarySection[];
  getRowClassName?: (row: Row<TData>) => string;
  headerActions?: React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = "Ara...",
  searchableColumns,
  onRowClick,
  isLoading = false,
  emptyMessage,
  exportFilename,
  exportColumns,
  exportSummary,
  getRowClassName,
  headerActions,
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const term = String(filterValue).toLocaleLowerCase("tr-TR");
      const cols = searchableColumns?.length 
        ? searchableColumns 
        : row.getAllCells().map(c => c.column.id);

      for (const col of cols) {
        try {
          const val = row.getValue(col);
          if (val != null && String(val).toLocaleLowerCase("tr-TR").includes(term)) {
            return true;
          }
        } catch {
          // ignore accessor errors
        }
      }
      return false;
    },
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const { pageIndex, pageSize } = table.getState().pagination;
  const from = filteredRows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, filteredRows.length);

  return (
    <div className="space-y-4">
      {/* Üst bar: arama + export */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:max-w-3xl">
          <SearchInput
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder={searchPlaceholder}
            className="w-full shrink-0 sm:w-[360px] md:w-[420px]"
          />
          {headerActions}
        </div>
        {exportFilename && exportColumns && (
          <ExportButtons
            data={filteredRows.map((r) => r.original as Record<string, unknown>)}
            columns={exportColumns}
            filename={exportFilename}
            exportSummary={exportSummary}
          />
        )}
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 gap-1"
                        onClick={() => header.column.toggleSorting()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState
                    title={emptyMessage ?? "Kayıt bulunamadı"}
                    description=""
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={[
                    onRowClick ? "cursor-pointer hover:bg-muted/60" : "",
                    getRowClassName ? getRowClassName(row) : "",
                  ].filter(Boolean).join(" ") || undefined}
                  style={{ minHeight: "3rem" }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sayfalama */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredRows.length} {t("datatable.recordsShown")} {from}–{to}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("datatable.pageSize")}</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm">
              {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
