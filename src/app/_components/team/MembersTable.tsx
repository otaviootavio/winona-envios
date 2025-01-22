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
}: MembersTableProps) {
  const { toast } = useToast();
  const utils = api.useUtils();

  // Fetch team data with members
  const { data: team, isLoading } = api.team.getMyTeams.useQuery(undefined, {
    select: (teams) => teams.find((t) => t.id === teamId) as TeamWithMembers,
  });

  const removeMemberMutation = api.team.removeMember.useMutation({
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
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

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-4 text-lg font-medium">Team Members</h3>
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-full rounded bg-gray-200" />
          <div className="space-y-3">
            {[...new Array<undefined>(3)].map((_, i) => (
              <div key={i} className="h-12 w-full rounded bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const isAdmin = currentUserId === adminId;

  return (
    <div>
      <h3 className="mb-4 text-lg font-medium">Team Members</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            {isAdmin && <TableHead className="w-24">Actions</TableHead>}
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
                  {member.user.id === adminId ? "Admin" : "Member"}
                </Badge>
              </TableCell>
              {isAdmin && member.user.id !== adminId && (
                <TableCell>
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
                    {removeMemberMutation.isPending ? "Removing..." : "Remove"}
                  </Button>
                </TableCell>
              )}
              {isAdmin && member.user.id === adminId && <TableCell></TableCell>}
              {!isAdmin && <TableCell></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
