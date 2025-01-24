"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import type { Team, User, TeamMember } from "@prisma/client";
import { Badge } from "~/components/ui/badge";

interface MembersTableProps {
  teamId: string;
  adminId: string;
  currentUserId: string;
  isPersonalTeam?: boolean;
}

type TeamWithMembers = Team & {
  members: (TeamMember & {
    user: Pick<User, "id" | "name" | "email">;
  })[];
};

export function MembersTable({
  teamId,
  adminId,
  currentUserId,
  isPersonalTeam = false,
}: MembersTableProps) {
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: team, isLoading } = isPersonalTeam
    ? api.team.getPersonalTeam.useQuery()
    : api.team.getMyTeams.useQuery(undefined, {
        select: (teams) =>
          teams.find((t) => t.id === teamId) as TeamWithMembers,
      });

  const removeMemberMutation = api.team.removeMember.useMutation({
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
      if (isPersonalTeam) {
        void utils.team.getPersonalTeam.invalidate();
      } else {
        void utils.team.getMyTeams.invalidate();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!team) {
    return null;
  }

  const isAdmin = currentUserId === adminId;
  const canManageMembers = isAdmin && !isPersonalTeam;

  return (
    <div>
      <h3 className="mb-4 text-lg font-medium">
        {isPersonalTeam ? "Personal Team Members" : "Team Members"}
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            {canManageMembers && (
              <TableHead className="w-24">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {team.members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>{member.user.email}</TableCell>
              <TableCell>{member.user.name}</TableCell>
              <TableCell>
                <Badge
                  variant={member.user.id === adminId ? "default" : "secondary"}
                >
                  {isPersonalTeam
                    ? "Personal"
                    : member.user.id === adminId
                      ? "Admin"
                      : "Member"}
                </Badge>
              </TableCell>
              {canManageMembers && (
                <TableCell>
                  {member.user.id !== adminId && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={removeMemberMutation.isPending}
                      onClick={() =>
                        removeMemberMutation.mutate({
                          teamId: team.id,
                          userId: member.user.id,
                        })
                      }
                    >
                      {removeMemberMutation.isPending
                        ? "Removing..."
                        : "Remove"}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
