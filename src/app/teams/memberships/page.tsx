import { api } from "~/trpc/server";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { MembershipTeamCard } from "~/app/_components/team/MembershipTeamCard";

export default async function MembershipsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/teams/memberships");
  }

  const memberships = await api.team.getMemberships();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Team Memberships</h1>

      {memberships.length > 0 ? (
        <div className="space-y-6">
          {memberships.map((team) => (
            <MembershipTeamCard
              key={team.id}
              team={{
                ...team,
                correiosCredential: team.correiosCredential
                  ? {
                      id: team.correiosCredential.id,
                      identifier: team.correiosCredential.identifier,
                      contract: team.correiosCredential.contract,
                      createdAt: team.correiosCredential.createdAt,
                    }
                  : null,
              }}
              userId={session.user.id}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 text-center text-muted-foreground">
          Not a member of any teams
        </div>
      )}
    </div>
  );
}
