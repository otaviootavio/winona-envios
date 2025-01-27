import { Suspense } from "react";
import { api } from "~/trpc/server";
import { OrdersManagementClient } from "./OrdersManagementClient";
import { NoOrdersView } from "./dashboard/management/NoOrdersView";
import { TeamSelector } from "./dashboard/management/TeamSelector";
import { DashboardWidgetsServer } from "./DashboardWidgetsServer";

export async function OrdersManagementServer() {
  // Server-side data fetching
  const selectedTeam = await api.team.getSelectedTeam();
  const hasCredentials = !!selectedTeam?.correiosCredential;
  const hasOnboardingCompleted = selectedTeam && hasCredentials;

  const importSummary = hasOnboardingCompleted
    ? await api.order.getImportsSummary()
    : null;

  const latestImportId = importSummary?.[0]?.id ?? "";

  return (
    <div className="w-full space-y-4">
      <Suspense fallback={<div>Loading teams...</div>}>
        <TeamSelector />
      </Suspense>

      {hasOnboardingCompleted ? (
        <OrdersManagementClient
          initialTeamId={selectedTeam.id}
          latestImportId={latestImportId}
          importSummary={importSummary}
        >
          <Suspense fallback={<div>Loading dashboard stats...</div>}>
            <DashboardWidgetsServer latestImportId={latestImportId} />
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
