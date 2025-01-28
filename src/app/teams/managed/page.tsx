import { api } from "~/trpc/server";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { TeamCard } from "~/app/_components/team/TeamCard";
import { TeamCreationDialog } from "~/app/_components/team/TeamCreationForm";

export default async function ManagedTeamsPage() {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect("/signin?callbackUrl=/teams/managed");
  }

  // Server-side data fetching
  const managedTeams = await api.team.getOwnedTeams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Managed Teams</h1>{" "}
        <TeamCreationDialog isPersonal={false} />
      </div>

      {managedTeams.length > 0 ? (
        <div className="space-y-6">
          {managedTeams.map((team) => (
            <TeamCard key={team.id} team={team} userId={session.user.id} />
          ))}
        </div>
      ) : (
        <div className="mt-8 text-center text-muted-foreground">
          No teams managed yet
        </div>
      )}
    </div>
  );
}
