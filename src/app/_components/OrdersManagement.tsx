"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { FileUploadCard } from "./FileUploadCard";
import { OrdersTable } from "./OrdersTable";
import { TablePagination } from "./TablePagination";
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
import { Search } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { SortableFields, type SortableFieldValue } from "~/constants/order";

const ITEMS_PER_PAGE = 10;

interface ImportInfo {
  totalOrders: number;
  fileName: string;
}

export function OrdersManagement() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [hasTrackingFilter, setHasTrackingFilter] = useState<boolean | undefined>();
  const [sortBy, setSortBy] = useState<SortableFieldValue>(SortableFields.UPDATED_AT);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const { toast } = useToast();
  const utils = api.useUtils();

  // Fetch latest import summary
  const importSummary = api.order.getImportsSummary.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const latestImportId = importSummary.data?.[0]?.id;

  // Get order statistics for the latest import
  const { data: orderStats } = api.order.getOrderStats.useQuery(
    { importId: latestImportId ?? "" },
    { 
      enabled: !!latestImportId,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch orders with all filters and sorting
  const orders = api.order.getImportOrders.useQuery(
    {
      importId: latestImportId ?? "",
      page,
      pageSize: ITEMS_PER_PAGE,
      filters: {
        search: searchTerm || undefined,
        status: statusFilter,
        hasTracking: hasTrackingFilter,
      },
      sortBy,
      sortOrder,
    },
    {
      retry: false,
      refetchOnWindowFocus: false,
      enabled: !!latestImportId,
    },
  );

  // Batch update mutation
  const batchUpdate = api.tracking.batchUpdateTracking.useMutation({
    onSuccess: async (data) => {
      await utils.order.invalidate();
      toast({
        title: "Batch Update Complete",
        description: `Successfully updated ${data.successfulUpdates} out of ${data.totalProcessed} orders`,
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
      setSortOrder(current => current === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1); // Reset to first page when sorting changes
  };

  // Handle unauthorized access
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

  const latestImport = importSummary.data?.[0];
  const totalOrders = orderStats?.totalOrders ?? 0;
  const trackingCount = orderStats?.trackingCount ?? 0;

  const importInfo: ImportInfo | undefined = latestImport
    ? {
        totalOrders,
        fileName: latestImport.fileName,
      }
    : undefined;

  return (
    <div className="w-full space-y-4">
      <FileUploadCard latestImport={importInfo} />

      {latestImport && (
        <Card>
          <CardHeader>
            <CardTitle>Tracking Status Overview</CardTitle>
            <CardDescription>
              Current tracking status for your orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">With Tracking</p>
                <p className="text-2xl font-bold">{trackingCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Import Date</p>
                <p className="text-2xl font-bold">
                  {latestImport.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or tracking code..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1); // Reset to first page when search changes
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(value) => {
            setStatusFilter(value === "all" ? undefined : value as OrderStatus);
            setPage(1); // Reset to first page when filter changes
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={OrderStatus.POSTED}>Posted</SelectItem>
            <SelectItem value={OrderStatus.NOT_FOUND}>Not Found</SelectItem>
            <SelectItem value={OrderStatus.IN_TRANSIT}>In Transit</SelectItem>
            <SelectItem value={OrderStatus.DELIVERED}>Delivered</SelectItem>
            <SelectItem value={OrderStatus.UNKNOWN}>Unknown</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={hasTrackingFilter === undefined ? "all" : hasTrackingFilter.toString()}
          onValueChange={(value) => {
            setHasTrackingFilter(value === "all" ? undefined : value === "true");
            setPage(1); // Reset to first page when filter changes
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by tracking" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="true">With Tracking</SelectItem>
            <SelectItem value="false">Without Tracking</SelectItem>
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