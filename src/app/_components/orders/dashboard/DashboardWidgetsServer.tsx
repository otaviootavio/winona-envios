// DashboardWidgetsServer.tsx
import { api } from "~/trpc/server";
import { DashboardWidgetsClient } from "./DashboardWidgetsClient";

// Helper to get user-friendly status label
const getTrackingStatusLabel = (status: string) => {
  switch (status) {
    case "FC":
      return "Label issued";
    case "POSTED":
      return "Posted";
    case "IN_TRANSIT":
      return "In transit";
    case "DELIVERED":
      return "Delivered";
    case "NOT_FOUND":
      return "Not found";
    default:
      return "Unknown";
  }
};

export async function DashboardWidgetsServer() {
  // Server-side data fetching
  const orderStats = await api.order.getOrderStats();
  const importSummary = await api.order.getImportsSummary();

  // Transform data for the client component
  const chartData = orderStats?.statusBreakdown.map((stat) => ({
    name: getTrackingStatusLabel(stat.shippingStatus),
    value: stat._count,
  })) ?? [];

  return (
    <DashboardWidgetsClient
      chartData={chartData}
      totalOrders={orderStats?.totalOrders ?? 0}
      trackingCount={orderStats?.trackingCount ?? 0}
      lastUpdateDate={importSummary?.[0]?.createdAt ?? new Date()}
    />
  );
}

