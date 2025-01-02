import { auth } from "~/server/auth";
import { OrdersManagement } from "~/app/_components/OrdersManagement";

export default async function DashboardPage() {
  await auth();

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Orders Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and track your imported orders
        </p>
      </div>
      
      <OrdersManagement />
    </main>
  );
}