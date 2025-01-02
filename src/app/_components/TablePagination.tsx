"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";

interface TablePaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading?: boolean;
}

export function TablePagination({
  currentPage,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
  isLoading = false,
}: TablePaginationProps) {
  if (isLoading) return null;

  return (
    <div className="mt-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => hasPreviousPage && onPageChange(currentPage - 1)}
              className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink>{currentPage}</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              onClick={() => hasNextPage && onPageChange(currentPage + 1)}
              className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}