"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { MembersTable } from "./MembersTable";
import { SecurityAlert } from "./SecurityAlert";
import { ExitTeamButton } from "./ExitTeamButton";
import { type RouterOutputs } from "~/trpc/react";

type MembershipTeam = RouterOutputs["team"]["getMemberships"][number];

interface MembershipTeamCardProps {
  team: Omit<MembershipTeam, "correiosCredential"> & {
    correiosCredential: {
      id: string;
      identifier: string;
      contract: string;
      createdAt: Date;
    } | null;
  };
  userId: string;
}

export const MembershipTeamCard = ({
  team,
  userId,
}: MembershipTeamCardProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{team.name}</CardTitle>
            <CardDescription>Team Membership</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            {team.correiosCredential ? (
              <>
                <p>CNPJ/CPF: {team.correiosCredential.identifier}</p>
                <p>Contract: {team.correiosCredential.contract}</p>
                <p className="mt-2">
                  Credentials configured on:{" "}
                  {team.correiosCredential.createdAt.toLocaleDateString()}
                </p>
              </>
            ) : (
              <p>No shipping credentials configured</p>
            )}
          </div>

          <MembersTable
            teamId={team.id}
            adminId={team.adminId}
            currentUserId={userId}
          />

          <div className="flex items-center gap-2">
            <SecurityAlert />
            <ExitTeamButton teamId={team.id} teamName={team.name} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
