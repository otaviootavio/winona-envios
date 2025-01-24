"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Users } from "lucide-react";
import type { Team } from "@prisma/client";

interface TeamWithCredential extends Team {
  correiosCredential: { id: string } | null;
}

interface TeamSelectorProps {
  teams: TeamWithCredential[];
  selectedTeamId?: string;
  onSelectTeam: (teamId: string) => void;
}

export function TeamSelector({
  teams,
  selectedTeamId,
  onSelectTeam,
}: TeamSelectorProps) {
  if (!teams.length) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-4">
        <Users className="h-6 w-6" />
        <div>
          <CardTitle>Select Team</CardTitle>
          <CardDescription>
            Choose which team&apos;s credentials you want to use
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Select value={selectedTeamId} onValueChange={onSelectTeam}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                <div className="flex w-full items-center justify-between">
                  <span>{team.name}</span>
                  {!team.correiosCredential && (
                    <span className="text-xs text-yellow-500">
                      (No Credentials)
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
