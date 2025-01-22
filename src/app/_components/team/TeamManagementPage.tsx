"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { InviteSection } from "./InviteSection";
import { MembersTable } from "./MembersTable";
import { SecurityAlert } from "./SecurityAlert";
import { TeamCreationForm } from "./TeamCreationForm";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { useToast } from "~/hooks/use-toast";
import { ExitTeamButton } from "./ExitTeamButton";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface Props {
  user: User;
}

export default function TeamManagementPage({ user }: Props) {
  const { toast } = useToast();
  const utils = api.useUtils();
  const { data: teams, isLoading: isTeamsLoading } =
    api.team.getMyTeams.useQuery();

  const deleteTeamMutation = api.team.deleteTeam.useMutation({
    onSuccess: () => {
      toast({
        title: "Team deleted",
        description: "The team has been deleted successfully.",
      });
      void utils.team.getMyTeams.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isTeamsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!teams?.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create Your First Team</CardTitle>
          <CardDescription>
            Start by creating a team to manage your group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamCreationForm />
        </CardContent>
      </Card>
    );
  }

  const isTeamAdmin = (team: (typeof teams)[0]) => team.adminId === user.id;

  return (
    <div className="space-y-6">
      <TeamCreationForm />

      {teams.map((team) => (
        <Card key={team.id} className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>
                  Team management and collaboration
                </CardDescription>
              </div>
              {isTeamAdmin(team) && (
                <Button
                  variant="destructive"
                  onClick={() => deleteTeamMutation.mutate({ teamId: team.id })}
                  disabled={deleteTeamMutation.isPending}
                >
                  {deleteTeamMutation.isPending ? "Deleting..." : "Delete Team"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {isTeamAdmin(team) && <InviteSection teamId={team.id} />}
              <MembersTable
                teamId={team.id}
                adminId={team.adminId}
                currentUserId={user.id}
              />
              <div className="flex flex-row items-center gap-2">
                <SecurityAlert />
                {!isTeamAdmin(team) && (
                  <ExitTeamButton teamId={team.id} teamName={team.name} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
