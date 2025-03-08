"use client";

import { Suspense } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { OrdersTable } from "./OrdersTable";
import { TablePagination } from "./TablePagination";
import type { OrderStatus } from "@prisma/client";
import type { SortableFieldValue } from "~/constants/order";

type OrdersTableSectionProps = {
  teamId: string;
  page: number;
  onPageChange: (page: number) => void;
  searchTerm: string;
  statusFilter: OrderStatus | undefined;
  sortBy: SortableFieldValue;
  sortOrder: "asc" | "desc";
  onSort: (field: SortableFieldValue) => void;
};

export function OrdersTableSection({
  teamId,
  page,
  onPageChange,
  searchTerm,
  statusFilter,
  sortBy,
  sortOrder,
  onSort,
}: OrdersTableSectionProps) {
  const { toast } = useToast();
  const utils = api.useUtils();

  const ITEMS_PER_PAGE = 10;

  const { data: orders, isLoading: ordersLoading } =
    api.order.getImportOrders.useQuery(
      {
        page,
        pageSize: ITEMS_PER_PAGE,
        filters: {
          search: searchTerm || undefined,
          status: statusFilter,
        },
        sortBy,
        sortOrder,
      },
    );

  const batchUpdate = api.tracking.batchUpdateTracking.useMutation({
    onSuccess: async (data) => {
      await utils.order.invalidate();
      toast({
        title: "Batch Update Completed",
        description: `${data.successfulUpdates} out of ${data.totalProcessed} orders were successfully updated`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Suspense fallback={<div>Loading orders...</div>}>
      <OrdersTable
        orders={orders?.orders ?? []}
        isLoading={ordersLoading || batchUpdate.isPending}
        onSort={onSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        selectedTeamId={teamId}
      />

      {orders && orders.orders.length > 0 && (
        <TablePagination
          currentPage={page}
          onPageChange={onPageChange}
          totalPages={orders.pagination.pageCount}
          isLoading={ordersLoading}
        />
      )}
    </Suspense>
  );
}
