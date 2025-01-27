"use client";

import { Button } from "~/components/ui/button";
import { api, RouterOutputs } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { Key } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { MembersTable } from "./MembersTable";
import { SecurityAlert } from "./SecurityAlert";
import { ExitTeamButton } from "./ExitTeamButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import CredentialStatus from "./TeamMemberCredentialCard";
import { InviteSection } from "./InviteSection";
import CredentialsDialog from "../CredentialsDialog";

type TeamWithCredentials = RouterOutputs["team"]["getOwnedTeams"][number];

interface TeamCardProps {
  team: TeamWithCredentials;
  userId: string;
}

export const TeamCard = ({ team, userId }: TeamCardProps) => {
  const { toast } = useToast();
  const utils = api.useUtils();
  const isTeamAdmin = team.adminId === userId;
  const hasCredentials = !!team.correiosCredential;

  const { mutate: deleteTeam, isPending } = api.team.deleteTeam.useMutation({
    onSuccess: () => {
      toast({
        title: "Team deleted",
        description: "The team has been successfully deleted",
      });
      void utils.team.getOwnedTeams.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error deleting team",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card key={team.id} className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{team.name}</CardTitle>
            <CardDescription>
              {isTeamAdmin ? "Team Administration" : "Team Membership"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isTeamAdmin && (
              <Button
                variant="destructive"
                onClick={() => deleteTeam({ teamId: team.id })}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Delete Team"}
              </Button>
            )}
            <CredentialStatus hasCredentials={hasCredentials} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isTeamAdmin && (
            <>
              <InviteSection teamId={team.id} />
              <Alert>
                <Key className="h-4 w-4" />
                <AlertTitle>Correios Integration</AlertTitle>
                <AlertDescription>
                  {team.correiosCredential ? (
                    <>
                      <dl className="mt-2 space-y-1">
                        <div className="text-sm">
                          <dt className="text-muted-foreground">CNPJ/CPF:</dt>
                          <dd>{team.correiosCredential.identifier}</dd>
                        </div>
                        <div className="text-sm">
                          <dt className="text-muted-foreground">Contract:</dt>
                          <dd>{team.correiosCredential.contract}</dd>
                        </div>
                      </dl>
                      <div className="mt-4">
                        <CredentialsDialog teamId={team.id} />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mb-4">
                        Configure Correios business credentials to enable order
                        tracking.
                      </p>
                      <CredentialsDialog teamId={team.id} />
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </>
          )}
          <MembersTable
            teamId={team.id}
            adminId={team.adminId}
            currentUserId={userId}
          />
          <div className="flex items-center gap-2">
            <SecurityAlert />
            {!isTeamAdmin && (
              <ExitTeamButton teamId={team.id} teamName={team.name} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
