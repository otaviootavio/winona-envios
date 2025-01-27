"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { FileUploadCard } from "./FileUploadCard";
import { OrdersTable } from "./OrdersTable";
import { TablePagination } from "./TablePagination";
import { type OrderStatus } from "@prisma/client";
import { SortableFields, type SortableFieldValue } from "~/constants/order";
import { useRouter } from "next/navigation";
import { NoOrdersView } from "./dashboard/management/NoOrdersView";
import { TrackingOverview } from "./dashboard/management/TrackingOverview";
import { StatusDistribution } from "./dashboard/management/StatusDistribution";
import { SearchFilters } from "./dashboard/management/SearchFilters";
import { TeamSelector } from "./dashboard/management/TeamSelector";
import { cn } from "~/lib/utils"; // Make sure you have this utility

const ITEMS_PER_PAGE = 10;

interface ImportInfo {
  totalOrders: number;
  fileName: string;
}

export function OrdersManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = api.useUtils();

  // State
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [sortBy, setSortBy] = useState<SortableFieldValue>(
    SortableFields.ORDER_NUMBER,
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Team data
  const { data: teams, isLoading: isLoadingTeams } =
    api.team.getMyTeams.useQuery();
  const { data: selectedTeam, isLoading: isLoadingSelected } =
    api.team.getSelectedTeam.useQuery();

  // Derived state
  const hasCredentials = !!selectedTeam?.correiosCredential;
  const selectedTeamId = selectedTeam?.id;
  const needsTeamSelection = !selectedTeam;
  const needsCredentials = selectedTeam && !hasCredentials;
  const hasOnboardingCompleted = selectedTeam && hasCredentials;

  // Order data
  const importSummary = api.order.getImportsSummary.useQuery(undefined, {
    enabled: !!selectedTeamId && hasCredentials,
  });

  const latestImportId = importSummary.data?.[0]?.id;

  const { data: orderStats } = api.order.getOrderStats.useQuery(
    { importId: latestImportId ?? "" },
    { enabled: !!latestImportId },
  );

  const orders = api.order.getImportOrders.useQuery(
    {
      importId: latestImportId ?? "",
      page,
      pageSize: ITEMS_PER_PAGE,
      filters: {
        search: searchTerm || undefined,
        status: statusFilter,
      },
      sortBy,
      sortOrder,
    },
    { enabled: !!latestImportId },
  );

  // Chart data
  const chartData =
    orderStats?.statusBreakdown.map((stat) => ({
      name: stat.shippingStatus,
      value: stat._count,
    })) ?? [];

  // Mutations
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

  const handleSort = (field: SortableFieldValue) => {
    if (field === sortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Loading state
  if (isLoadingTeams || isLoadingSelected) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert>
          <AlertTitle>Loading Team Information</AlertTitle>
          <AlertDescription>
            Please wait while we load your team settings
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Team selection */}
      <TeamSelector />

      {/* Main content area */}
      <div
        className={cn(
          "space-y-4",
          !hasOnboardingCompleted && "pointer-events-none opacity-20",
        )}
      >
        {/* File upload */}
        <FileUploadCard
          latestImport={
            importSummary.data?.[0]
              ? {
                  totalOrders: orderStats?.totalOrders ?? 0,
                  fileName: importSummary.data[0].fileName,
                }
              : undefined
          }
        />

        {/* Dashboard widgets */}
        {latestImportId && (
          <>
            <div className="flex flex-row gap-2">
              <div className="flex-1">
                <TrackingOverview
                  totalOrders={orderStats?.totalOrders ?? 0}
                  trackingCount={orderStats?.trackingCount ?? 0}
                  lastUpdateDate={
                    importSummary.data?.[0]?.createdAt ?? new Date()
                  }
                />
              </div>
              <div className="flex-1">
                <StatusDistribution
                  chartData={chartData}
                  totalOrders={orderStats?.totalOrders ?? 0}
                />
              </div>
            </div>
          </>
        )}

        {/* Search and filters */}
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

        {/* Orders table */}
        <OrdersTable
          orders={orders.data?.orders ?? []}
          isLoading={orders.isLoading || batchUpdate.isPending}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
          selectedTeamId={selectedTeamId ?? ""}
        />

        {/* Pagination */}
        {orders.data && orders.data.orders.length > 0 && (
          <TablePagination
            currentPage={page}
            onPageChange={setPage}
            totalPages={orders.data.pagination.pageCount}
            isLoading={orders.isLoading}
          />
        )}

        {/* Empty state */}
        {hasOnboardingCompleted && !latestImportId && <NoOrdersView />}
      </div>

    </div>
  );
}
