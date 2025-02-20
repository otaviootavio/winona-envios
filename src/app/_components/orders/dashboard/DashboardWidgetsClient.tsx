"use client";

import { StatusDistribution } from "./StatusDistribution";
import { TrackingOverview } from "./TrackingOverview";

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
      <div className="flex-1 flex-col">
        <TrackingOverview
          totalOrders={totalOrders}
          trackingCount={trackingCount}
          lastUpdateDate={lastUpdateDate}
        />
      </div>
      <div className="flex-1 flex-col grow">
        <StatusDistribution chartData={chartData} totalOrders={totalOrders} />
      </div>
    </div>
  );
}
