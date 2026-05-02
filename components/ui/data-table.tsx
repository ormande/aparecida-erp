"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Buscar...",
  searchKeys = [],
  pageSize = 10,
  isLoading = false,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Ajuste os filtros ou cadastre novos itens para preencher esta tabela.",
  searchValue,
  onSearchChange,
  manualPagination,
  totalItems,
  getRowKey,
}: {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKeys?: Array<(row: T) => string>;
  pageSize?: number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  manualPagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  totalItems?: number;
  getRowKey?: (row: T, index: number) => string;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const [page, setPage] = useState(1);
  const query = searchValue ?? internalQuery;
  const isManualSearch = typeof onSearchChange === "function";

  const filtered = useMemo(() => {
    if (isManualSearch) {
      return data;
    }

    if (!query.trim()) {
      return data;
    }

    const normalized = query.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((getValue) => getValue(row).toLowerCase().includes(normalized)),
    );
  }, [data, isManualSearch, query, searchKeys]);

  const totalPages = manualPagination?.totalPages ?? Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = manualPagination?.page ?? Math.min(page, totalPages);
  const paginated = manualPagination ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalCount = totalItems ?? filtered.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              if (isManualSearch) {
                onSearchChange?.(event.target.value);
                return;
              }

              setInternalQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {totalCount} registro{totalCount === 1 ? "" : "s"}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead key={column.key} className={cn("px-4", column.className)}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      {columns.map((column) => (
                        <TableCell key={column.key} className={cn("px-4", column.className)}>
                          <Skeleton className="h-5 w-full max-w-[160px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : paginated.map((row, index) => (
                    <TableRow key={getRowKey ? getRowKey(row, index) : index}>
                      {columns.map((column) => (
                        <TableCell key={column.key} className={cn("px-4", column.className)}>
                          {column.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
        {!isLoading && paginated.length === 0 ? (
          <div className="p-6">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() =>
            manualPagination
              ? manualPagination.onPageChange(Math.max(1, currentPage - 1))
              : setPage((value) => Math.max(1, value - 1))
          }
          disabled={currentPage === 1}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() =>
            manualPagination
              ? manualPagination.onPageChange(Math.min(totalPages, currentPage + 1))
              : setPage((value) => Math.min(totalPages, value + 1))
          }
          disabled={currentPage === totalPages}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
