import { Suspense } from "react";
import { OrdersManagementClient } from "./OrdersManagementClient";
import { TeamSelector } from "./management/TeamSelector";
import { DashboardWidgetsServer } from "./dashboard/DashboardWidgetsServer";
import { NoOrdersView } from "./management/NoOrdersView";
import { type RouterOutputs } from "~/trpc/react";

// Define proper types for the prefetched data
type OrdersManagementServerProps = {
  prefetchedTeam: RouterOutputs["team"]["getSelectedTeam"];
  prefetchedImportSummary: RouterOutputs["order"]["getImportsSummary"] | null;
  prefetchedOrderStats: RouterOutputs["order"]["getOrderStats"];
};

export async function OrdersManagementServer({
  prefetchedTeam,
  prefetchedImportSummary,
  prefetchedOrderStats
}: OrdersManagementServerProps) {
  // Use prefetched data instead of making the same API calls again
  const selectedTeam = prefetchedTeam;
  const hasCredentials = !!selectedTeam?.correiosCredential;
  const hasOnboardingCompleted = selectedTeam && hasCredentials;
  const importSummary = prefetchedImportSummary;

  return (
    <div className="w-full space-y-4">
      <Suspense fallback={<div>Loading teams...</div>}>
        <TeamSelector />
      </Suspense>

      {hasOnboardingCompleted ? (
        <OrdersManagementClient
          initialTeamId={selectedTeam.id}
          importSummary={importSummary}
        >
          <Suspense fallback={<div>Loading dashboard stats...</div>}>
            <DashboardWidgetsServer 
              prefetchedOrderStats={prefetchedOrderStats}
              prefetchedImportSummary={prefetchedImportSummary}
            />
          </Suspense>
        </OrdersManagementClient>
      ) : (
        <div className="pointer-events-none opacity-20">
          <NoOrdersView />
        </div>
      )}
    </div>
  );
}
