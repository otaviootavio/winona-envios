import { type Order, type OrderStatus } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { Loader2, ArrowUpDown } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { useState } from "react";

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onSort: (field: "orderNumber" | "updatedAt") => void;
  sortBy: "orderNumber" | "updatedAt";
  sortOrder: "asc" | "desc";
  selectedTeamId: string;
}

export function OrdersTable({
  orders,
  isLoading,
  onSort,
  sortBy,
  sortOrder,
  selectedTeamId,
}: OrdersTableProps) {
  const utils = api.useUtils();
  const { toast } = useToast();
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  const updateTracking = api.tracking.updateTracking.useMutation({
    onMutate: (variables) => {
      setUpdatingOrders((prev) => new Set(prev).add(variables.orderId));
    },
    onSettled: (_, __, variables) => {
      setUpdatingOrders((prev) => {
        const next = new Set(prev);
        next.delete(variables.orderId);
        return next;
      });
    },
    onSuccess: async () => {
      await utils.order.invalidate();
      toast({
        title: "Success",
        description: "Tracking information updated",
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

  // Add new mutation for updating all orders
  const batchUpdateAll = api.tracking.batchUpdateAllOrders.useMutation({
    onMutate: () => {
      setIsUpdatingAll(true);
    },
    onSettled: () => {
      setIsUpdatingAll(false);
    },
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

  const getTrackingStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "POSTED":
        return "bg-yellow-100 text-yellow-800";
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "NOT_FOUND":
        return "bg-red-100 text-red-800";
      case "UNKNOWN":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSortIcon = (field: "orderNumber" | "updatedAt") => {
    if (sortBy !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return (
      <ArrowUpDown
        className={`ml-2 h-4 w-4 ${sortOrder === "asc" ? "rotate-0" : "rotate-180"}`}
      />
    );
  };

  const renderSortableHeader = (
    field: "orderNumber" | "updatedAt",
    label: string,
  ) => (
    <Button
      variant="ghost"
      onClick={() => onSort(field)}
      className="flex h-8 items-center gap-1 font-semibold"
    >
      {label}
      {getSortIcon(field)}
    </Button>
  );

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">Orders List</h2>
        <Button
          onClick={() => batchUpdateAll.mutate({ teamId: selectedTeamId })}
          disabled={isUpdatingAll || orders.length === 0}
        >
          {isUpdatingAll ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating All Orders...
            </>
          ) : (
            "Update All Orders"
          )}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {renderSortableHeader("orderNumber", "Order Number")}
            </TableHead>
            <TableHead>Shipping Status</TableHead>
            <TableHead>Tracking Code</TableHead>
            <TableHead>
              {renderSortableHeader("updatedAt", "Last Update")}
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Loading...
              </TableCell>
            </TableRow>
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.orderNumber}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={getTrackingStatusColor(order.shippingStatus)}
                  >
                    {order.shippingStatus}
                  </Badge>
                </TableCell>
                <TableCell>{order.trackingCode ?? "N/A"}</TableCell>
                <TableCell>
                  {new Date(order.updatedAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  {order.trackingCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateTracking.mutate({
                          orderId: order.id,
                          trackingCode: order.trackingCode!,
                          teamId: selectedTeamId,
                        });
                      }}
                      disabled={updatingOrders.has(order.id)}
                    >
                      {updatingOrders.has(order.id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Tracking"
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
