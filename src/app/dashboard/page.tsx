import { Suspense } from "react";
import { OrdersManagementServer } from "../_components/orders/OrdersManagementServer";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function DashboardPage() {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Prefetch data in parallel at the page level
  const selectedTeamPromise = api.team.getSelectedTeam();
  const orderStatsPromise = api.order.getOrderStats();
  
  // Wait for team data to determine if we need import summary
  const selectedTeam = await selectedTeamPromise;
  const hasCredentials = !!selectedTeam?.correiosCredential;
  const hasOnboardingCompleted = selectedTeam && hasCredentials;
  
  // Only fetch import summary if onboarding is complete
  const importSummaryPromise = hasOnboardingCompleted
    ? api.order.getImportsSummary()
    : Promise.resolve(null);
    
  // Pass prefetched data to component
  const [orderStats, importSummary] = await Promise.all([
    orderStatsPromise,
    importSummaryPromise
  ]);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Orders Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and track your imported orders
        </p>
      </div>

      <Suspense fallback={<div>Loading orders management...</div>}>
        <OrdersManagementServer 
          prefetchedTeam={selectedTeam} 
          prefetchedImportSummary={importSummary}
          prefetchedOrderStats={orderStats}
        />
      </Suspense>
    </main>
  );
}
