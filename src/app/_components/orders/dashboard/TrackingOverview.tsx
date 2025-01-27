import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface TrackingOverviewProps {
  totalOrders: number;
  trackingCount: number;
  lastUpdateDate: Date;
}


export const TrackingOverview = ({
  totalOrders,
  trackingCount,
  lastUpdateDate,
}: TrackingOverviewProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Tracking Overview</CardTitle>
      <CardDescription>Current status of your orders</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-row justify-start gap-2">
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">Total number of orders</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">Tracking code</p>
          <p className="text-2xl font-bold">{trackingCount}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">Last update</p>
          <p className="text-2xl font-bold">
            {lastUpdateDate.toLocaleDateString()}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);
