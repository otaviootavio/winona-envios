"use client";

import React from "react";
import type { Session } from "next-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { InviteSection } from "./InviteSection";
import { MembersTable } from "./MembersTable";
import { SecurityAlert } from "./SecurityAlert";
import { TeamCreationForm } from "./TeamCreationForm";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { useToast } from "~/hooks/use-toast";
import { ExitTeamButton } from "./ExitTeamButton";
import { Key, Loader2 } from "lucide-react";
import PersonalTeamCard from "./PersonalTeamCard";
import { type Team } from "@prisma/client";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import CredentialsDialog from "../CredentialsDialog";
import CredentialStatus from "./TeamMemberCredentialCard";

interface TeamCardProps {
  team: Team & {
    correiosCredential: {
      id: string;
      identifier: string;
      contract: string;
      teamId: string;
      createdById: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  };
  userId: string;
  onDeleteTeam: (teamId: string) => void;
}

const TeamCard = ({ team, userId, onDeleteTeam }: TeamCardProps) => {
  const isTeamAdmin = team.adminId === userId;
  const hasCredentials = !!team.correiosCredential;

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
          <div className="flex justify-end items-center gap-2">
            {isTeamAdmin && (
              <Button variant="destructive" onClick={() => onDeleteTeam(team.id)}>
                Delete Team
              </Button>
            )}
            <CredentialStatus hasCredentials={hasCredentials}/>
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
                          <dt className="inline text-muted-foreground">
                            CNPJ/CPF:{" "}
                          </dt>
                          <dd className="inline">
                            {team.correiosCredential.identifier}
                          </dd>
                        </div>
                        <div className="text-sm">
                          <dt className="inline text-muted-foreground">
                            Contract:{" "}
                          </dt>
                          <dd className="inline">
                            {team.correiosCredential.contract}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4">
                        <CredentialsDialog
                          teamId={team.id}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mb-4">
                        Configure Correios business credentials to enable order
                        tracking for this team.
                      </p>
                      <CredentialsDialog
                        teamId={team.id}
                      />
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
          <div className="flex flex-row items-center gap-2">
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

interface EmptyStateProps {
  type: "personal" | "owned" | "memberships";
}

const EmptyState = ({ type }: EmptyStateProps) => {
  const messages = {
    personal: "Create your personal team to get started",
    owned: "Create your first team to start collaborating",
    memberships: "Join a team to see it here",
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>No {type} Teams</CardTitle>
        <CardDescription>{messages[type]}</CardDescription>
      </CardHeader>
      {type !== "memberships" && (
        <CardContent>
          <TeamCreationForm isPersonal={type === "personal"} />
        </CardContent>
      )}
    </Card>
  );
};

interface TeamManagementContentProps {
  session: Session;
}

export function TeamManagementContent({ session }: TeamManagementContentProps) {
  const { toast } = useToast();
  const utils = api.useUtils();

  // Queries with proper type inference
  const { data: personalTeam, isLoading: isPersonalTeamLoading } =
    api.team.getPersonalTeam.useQuery();
  const { data: ownedTeams, isLoading: isOwnedTeamsLoading } =
    api.team.getOwnedTeams.useQuery();
  const { data: memberTeams, isLoading: isMemberTeamsLoading } =
    api.team.getMemberships.useQuery();

  const deleteTeamMutation = api.team.deleteTeam.useMutation({
    onSuccess: () => {
      toast({
        title: "Team deleted",
        description: "The team has been deleted successfully.",
      });
      void utils.team.getOwnedTeams.invalidate();
      void utils.team.getMemberships.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading =
    isPersonalTeamLoading || isOwnedTeamsLoading || isMemberTeamsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-32 w-32 animate-spin" />
      </div>
    );
  }

  const handleDeleteTeam = (teamId: string) => {
    deleteTeamMutation.mutate({ teamId });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Team</TabsTrigger>
          <TabsTrigger value="owned">My Teams</TabsTrigger>
          <TabsTrigger value="memberships">Team Memberships</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          {personalTeam ? <PersonalTeamCard /> : <EmptyState type="personal" />}
        </TabsContent>

        <TabsContent value="owned" className="mt-6 space-y-6">
          <TeamCreationForm isPersonal={false} />
          {ownedTeams?.length ? (
            ownedTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                userId={session.user.id}
                onDeleteTeam={handleDeleteTeam}
              />
            ))
          ) : (
            <EmptyState type="owned" />
          )}
        </TabsContent>

        <TabsContent value="memberships" className="mt-6">
          {memberTeams?.length ? (
            <div className="space-y-6">
              {memberTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  userId={session.user.id}
                  onDeleteTeam={handleDeleteTeam}
                />
              ))}
            </div>
          ) : (
            <EmptyState type="memberships" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
