"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { FileUploadCard } from "./FileUploadCard";
import { OrdersTable } from "./OrdersTable";
import { TablePagination } from "./TablePagination";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { ArrowRight, Search } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { SortableFields, type SortableFieldValue } from "~/constants/order";
import { useRouter } from "next/navigation";

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

  // Data fetching
  const importSummary = api.order.getImportsSummary.useQuery();
  const { data: credentials } = api.correios.getCredentials.useQuery();

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

  // Prepare chart data
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
  if (importSummary.isLoading) return null;

  // Error state
  if (importSummary.error?.data?.code === "UNAUTHORIZED") {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="destructive">
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>Please log in to view orders.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // No orders state
  if (!latestImportId) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Import Orders</CardTitle>
          <CardDescription>
            Start by importing your orders to track them
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-muted-foreground">
            To get started, you need to import your orders first.
          </p>
          <Button onClick={() => router.push("/import")}>Import Orders</Button>
        </CardContent>
      </Card>
    );
  }

  // No credentials state
  if (!credentials) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Set up your API Key</CardTitle>
            <CardDescription>
              Configure your own Correios credentials to track orders
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-center text-muted-foreground">
              Set up your own Correios credentials to start tracking your orders
              independently.
            </p>
            <Button
              onClick={() => router.push("/correios-settings")}
              className="w-full"
            >
              Configure API Key
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Join a Team</CardTitle>
            <CardDescription>
              Use shared credentials by joining an existing team
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-center text-muted-foreground">
              Join a team to use shared Correios credentials and collaborate
              with others.
            </p>
            <Button
              onClick={() => router.push("/teams")}
              variant="secondary"
              className="w-full"
            >
              Find Teams
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare data for dashboard
  const latestImport = importSummary.data?.[0];
  const totalOrders = orderStats?.totalOrders ?? 0;
  const trackingCount = orderStats?.trackingCount ?? 0;

  const importInfo: ImportInfo | undefined = latestImport
    ? { totalOrders, fileName: latestImport.fileName }
    : undefined;

  // Render dashboard
  return (
    <div className="w-full space-y-4">
      <FileUploadCard latestImport={importInfo} />

      {latestImport && (
        <>
          <div className="flex flex-row gap-2">
            <div className="flex-1">
              <Card>
                <CardHeader>
                  <CardTitle>Tracking Overview</CardTitle>
                  <CardDescription>
                    Current status of your orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium">
                        Total number of orders
                      </p>
                      <p className="text-2xl font-bold">{totalOrders}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium">Tracking code</p>
                      <p className="text-2xl font-bold">{trackingCount}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium">Last update</p>
                      <p className="text-2xl font-bold">
                        {latestImport.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex-1">
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Breakdown of order status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-row justify-start gap-2">
                    {chartData.map((stat) => (
                      <div
                        key={stat.name}
                        className="flex-auto flex-col rounded-lg border p-2"
                      >
                        <div>
                          <div className="rounded-full" />
                          <span className="text-xs font-medium">
                            {stat.name}
                          </span>
                        </div>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-2xl font-bold">
                            {stat.value}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({Math.round((stat.value / totalOrders) * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <div className="mb-4 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or tracking code..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(value) => {
            setStatusFilter(
              value === "all" ? undefined : (value as OrderStatus),
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={OrderStatus.POSTED}>Posted</SelectItem>
            <SelectItem value={OrderStatus.NOT_FOUND}>Not found</SelectItem>
            <SelectItem value={OrderStatus.IN_TRANSIT}>In transit</SelectItem>
            <SelectItem value={OrderStatus.DELIVERED}>Delivered</SelectItem>
            <SelectItem value={OrderStatus.UNKNOWN}>Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <OrdersTable
        orders={orders.data?.orders ?? []}
        isLoading={orders.isLoading || batchUpdate.isPending}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
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