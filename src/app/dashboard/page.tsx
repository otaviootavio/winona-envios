import { Suspense } from "react";
import { OrdersManagementServer } from "../_components/orders/OrdersManagementServer";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function DashboardPage() {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

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
