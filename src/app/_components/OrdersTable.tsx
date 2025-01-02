import { type Order } from "@prisma/client";
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
import { Loader2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { useState } from "react";

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onBatchUpdate?: () => void;
}

export function OrdersTable({
  orders,
  isLoading,
  onBatchUpdate,
}: OrdersTableProps) {
  const utils = api.useUtils();

  const { toast } = useToast();
  // Track loading state per order
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());

  const updateTracking = api.tracking.updateTracking.useMutation({
    onMutate: (variables) => {
      setUpdatingOrders(prev => {  return new Set(prev).add(variables.orderId)});
    },
    onSettled: (_, __, variables) => {
      setUpdatingOrders(prev => {
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

  const getTrackingStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "entregue":
        return "bg-green-100 text-green-800";
      case "em trânsito":
        return "bg-blue-100 text-blue-800";
      case "postado":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">Orders List</h2>
        {onBatchUpdate && (
          <Button
            onClick={onBatchUpdate}
            disabled={isLoading || orders.length === 0}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Update All Tracking"
            )}
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Number</TableHead>
            <TableHead>Shipping Status</TableHead>
            <TableHead>Tracking Code</TableHead>
            <TableHead>Last Update</TableHead>
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
            orders.sort((a, b) => a.orderNumber.localeCompare(b.orderNumber)).map((order) => (
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
                <TableCell>{order.updatedAt.toLocaleDateString()}</TableCell>
                <TableCell>
                  {order.trackingCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateTracking.mutate({
                          orderId: order.id,
                          trackingCode: order.trackingCode!,
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