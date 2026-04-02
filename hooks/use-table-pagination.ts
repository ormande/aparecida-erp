import { useCallback, useEffect, useMemo, useState } from "react";

export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];

export function useTablePagination<T>(data: T[]) {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState<TablePageSize>(10);

  useEffect(() => {
    setPageState(1);
  }, [data, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.length / pageSize)),
    [data.length, pageSize],
  );

  const currentPage = Math.min(page, totalPages);

  const setPage = useCallback((value: number | ((prev: number) => number)) => {
    setPageState(value);
  }, []);

  const setPageSize = useCallback((value: TablePageSize | ((prev: TablePageSize) => TablePageSize)) => {
    setPageSizeState(value);
  }, []);

  const paginatedData = useMemo(
    () => data.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [data, currentPage, pageSize],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPageState(totalPages);
    }
  }, [page, totalPages]);

  return {
    paginatedData,
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
  };
}
