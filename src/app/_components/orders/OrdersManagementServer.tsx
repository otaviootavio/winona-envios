import { Suspense } from "react";
import { api } from "~/trpc/server";
import { OrdersManagementClient } from "./OrdersManagementClient";
import { TeamSelector } from "./management/TeamSelector";
import { DashboardWidgetsServer } from "./dashboard/DashboardWidgetsServer";
import { NoOrdersView } from "./management/NoOrdersView";

export async function OrdersManagementServer() {
  // Server-side data fetching
  const selectedTeam = await api.team.getSelectedTeam();
  const hasCredentials = !!selectedTeam?.correiosCredential;
  const hasOnboardingCompleted = selectedTeam && hasCredentials;

  const importSummary = hasOnboardingCompleted
    ? await api.order.getImportsSummary()
    : null;

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
            <DashboardWidgetsServer />
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
