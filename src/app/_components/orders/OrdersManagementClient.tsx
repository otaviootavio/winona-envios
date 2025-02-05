"use client";

import { useState } from "react";
import { api,type RouterOutputs } from "~/trpc/react";
import type { OrderStatus } from "@prisma/client";
import { SortableFields, type SortableFieldValue } from "~/constants/order";
import { FileUploadCard } from "./upload/FileUploadCard";
import { SearchFilters } from "./management/SearchFilters";
import { OrdersTableSection } from "./table/OrdersTableSection";

type OrdersManagementClientProps = {
  children: React.ReactNode;
  initialTeamId: string;
  latestImportId: string;
  importSummary: RouterOutputs["order"]["getImportsSummary"] | null;
};

export function OrdersManagementClient({
  children,
  initialTeamId,
  latestImportId,
  importSummary,
}: OrdersManagementClientProps) {
  // Client-side state
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [sortBy, setSortBy] = useState<SortableFieldValue>(
    SortableFields.ORDER_NUMBER,
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Handle sorting
  const handleSort = (field: SortableFieldValue) => {
    if (field === sortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Get order stats for file upload card
  const { data: orderStats } = api.order.getOrderStats.useQuery(
    { importId: latestImportId },
    { enabled: !!latestImportId },
  );

  return (
    <div className="space-y-4">
      <FileUploadCard
        latestImport={
          importSummary?.[0]
            ? {
                totalOrders: orderStats?.totalOrders ?? 0,
                fileName: importSummary[0].fileName,
              }
            : undefined
        }
      />

      {children}

      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
      />

      <OrdersTableSection
        latestImportId={latestImportId}
        teamId={initialTeamId}
        page={page}
        onPageChange={setPage}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />
    </div>
  );
}
