import { Suspense } from "react";
import { OrdersManagementServer } from "../_components/orders/OrdersManagementServer";

export default async function DashboardPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Orders Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and track your imported orders
        </p>
      </div>

      <Suspense fallback={<div>Loading orders management...</div>}>
        <OrdersManagementServer />
      </Suspense>
    </main>
  );
}
