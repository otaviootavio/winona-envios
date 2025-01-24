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
import { NoCredentialsView } from "./dashboard/management/NoCredentialsView";
import { TrackingOverview } from "./dashboard/management/TrackingOverview";
import { StatusDistribution } from "./dashboard/management/StatusDistribution";
import { SearchFilters } from "./dashboard/management/SearchFilters";
import { TeamSelector } from "./dashboard/management/TeamSelector"; // New component

const ITEMS_PER_PAGE = 10;

// Types
interface ImportInfo {
  totalOrders: number;
  fileName: string;
}

export function OrdersManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = api.useUtils();

  // State
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [sortBy, setSortBy] = useState<SortableFieldValue>(
    SortableFields.ORDER_NUMBER,
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch teams data
  const { data: teams, isLoading: isLoadingTeams } =
    api.team.getMyTeams.useQuery();

  // Find selected team's credentials
  const selectedTeam = teams?.find((team) => team.id === selectedTeamId);
  const hasCredentials = !!selectedTeam?.correiosCredential;

  // Data fetching - orders are still linked to user, not team
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

  // Chart data preparation
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

  // Handlers
  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    setPage(1);
  };

  const handleSort = (field: SortableFieldValue) => {
    if (field === sortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Loading states
  if (isLoadingTeams) return null;

  // Error states
  if (!teams || teams.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert>
          <AlertTitle>No Teams Available</AlertTitle>
          <AlertDescription>
            Please join or create a team to manage orders.
            <button
              onClick={() => router.push("/teams/create")}
              className="ml-2 text-blue-600 hover:underline"
            >
              Create Team
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Team selection required first
  if (!selectedTeamId) {
    return <TeamSelector teams={teams} onSelectTeam={handleTeamChange} />;
  }

  // No credentials state
  if (!hasCredentials) {
    return <NoCredentialsView />;
  }

  // No orders state
  if (!latestImportId) {
    return <NoOrdersView />;
  }

  // Prepare data for dashboard
  const latestImport = importSummary.data?.[0];
  const totalOrders = orderStats?.totalOrders ?? 0;
  const trackingCount = orderStats?.trackingCount ?? 0;

  const importInfo: ImportInfo | undefined = latestImport
    ? { totalOrders, fileName: latestImport.fileName }
    : undefined;

  return (
    <div className="w-full space-y-4">
      <TeamSelector
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={handleTeamChange}
      />

      <FileUploadCard latestImport={importInfo} />

      {latestImport && (
        <>
          <div className="flex flex-row gap-2">
            <div className="flex-1">
              <TrackingOverview
                totalOrders={totalOrders}
                trackingCount={trackingCount}
                lastUpdateDate={latestImport.createdAt}
              />
            </div>
            <div className="flex-1">
              <StatusDistribution
                chartData={chartData}
                totalOrders={totalOrders}
              />
            </div>
          </div>
        </>
      )}

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

      <OrdersTable
        orders={orders.data?.orders ?? []}
        isLoading={orders.isLoading || batchUpdate.isPending}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        selectedTeamId={selectedTeamId}
      />

      {orders.data && orders.data.orders.length > 0 && (
        <TablePagination
          currentPage={page}
          onPageChange={setPage}
          totalPages={orders.data.pagination.pageCount}
          isLoading={orders.isLoading}
        />
      )}
    </div>
  );
}