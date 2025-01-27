"use client";

import { StatusDistribution } from "./dashboard/management/StatusDistribution";
import { TrackingOverview } from "./dashboard/management/TrackingOverview";

type DashboardWidgetsClientProps = {
  chartData: Array<{ name: string; value: number }>;
  totalOrders: number;
  trackingCount: number;
  lastUpdateDate: Date;
};

export function DashboardWidgetsClient({
  chartData,
  totalOrders,
  trackingCount,
  lastUpdateDate,
}: DashboardWidgetsClientProps) {
  return (
    <div className="flex flex-row gap-2">
      <div className="flex-1">
        <TrackingOverview
          totalOrders={totalOrders}
          trackingCount={trackingCount}
          lastUpdateDate={lastUpdateDate}
        />
      </div>
      <div className="flex-1">
        <StatusDistribution chartData={chartData} totalOrders={totalOrders} />
      </div>
    </div>
  );
}
