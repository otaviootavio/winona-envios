import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface StatusDistributionProps {
  chartData: Array<{ name: string; value: number }>;
  totalOrders: number;
}

export const StatusDistribution = ({
  chartData,
  totalOrders,
}: StatusDistributionProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Status Distribution</CardTitle>
      <CardDescription>Breakdown of order status</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-row justify-start gap-2">
        {chartData.sort((a, b) => b.value - a.value).map((stat) => (
          <div
            key={stat.name}
            className="flex-auto flex-col rounded-lg border p-2"
          >
            <div>
              <div className="rounded-full" />
              <span className="text-xs font-medium">{stat.name}</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">{stat.value}</span>
              <span className="text-sm text-muted-foreground">
                ({Math.round((stat.value / totalOrders) * 100)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
