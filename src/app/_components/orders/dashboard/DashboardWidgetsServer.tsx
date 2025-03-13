// DashboardWidgetsServer.tsx
import { api } from "~/trpc/server";
import { type RouterOutputs } from "~/trpc/react";
import { DashboardWidgetsClient } from "./DashboardWidgetsClient";

type DashboardWidgetsServerProps = {
  prefetchedOrderStats?: RouterOutputs["order"]["getOrderStats"];
  prefetchedImportSummary?: RouterOutputs["order"]["getImportsSummary"] | null;
};

type ChartDataItem = {
  name: string;
  value: number;
};

export async function DashboardWidgetsServer({ 
  prefetchedOrderStats,
  prefetchedImportSummary
}: DashboardWidgetsServerProps = {}) {
  // Use prefetched data or fetch if not provided
  const orderStats = prefetchedOrderStats ?? await api.order.getOrderStats();
  const importSummary = prefetchedImportSummary ?? await api.order.getImportsSummary();

  // Transform data for the client component with proper type safety
  const chartData: ChartDataItem[] = orderStats?.statusBreakdown 
    ? orderStats.statusBreakdown.map((stat) => ({
        name: stat.shippingStatus,
        value: stat._count,
      }))
    : [];

  const totalOrders = orderStats?.totalOrders ?? 0;
  const trackingCount = orderStats?.trackingCount ?? 0;
  
  // Safely handle the importSummary date
  const lastUpdateDate = importSummary && 
    Array.isArray(importSummary) && 
    importSummary.length > 0 && 
    importSummary[0]?.createdAt 
      ? importSummary[0].createdAt 
      : new Date();

  return (
    <DashboardWidgetsClient
      chartData={chartData}
      totalOrders={totalOrders}
      trackingCount={trackingCount}
      lastUpdateDate={lastUpdateDate}
    />
  );
}

