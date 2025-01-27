// DashboardWidgetsServer.tsx
import { api } from "~/trpc/server";
import { DashboardWidgetsClient } from "./DashboardWidgetsClient";

type DashboardWidgetsServerProps = {
  latestImportId: string;
};

export async function DashboardWidgetsServer({ latestImportId }: DashboardWidgetsServerProps) {
  // Server-side data fetching
  const orderStats = await api.order.getOrderStats({ 
    importId: latestImportId 
  });
  
  const importSummary = await api.order.getImportsSummary();

  // Transform data for the client component
  const chartData = orderStats?.statusBreakdown.map((stat) => ({
    name: stat.shippingStatus,
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

