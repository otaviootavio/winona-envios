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
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";

export function TeamSelector() {
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();

  // Fetch teams and selected team data
  const { data: teams = [], isLoading: isLoadingTeams } =
    api.team.getMyTeams.useQuery();
  const { data: selectedTeam, isLoading: isLoadingSelected } =
    api.team.getSelectedTeam.useQuery();

  // Update selected team mutation
  const { mutate: updateTeam, isPending: isUpdating } =
    api.team.updateSelectedTeam.useMutation({
      onSuccess: async () => {
        await Promise.all([
          utils.team.getSelectedTeam.invalidate(),
          utils.team.getMyTeams.invalidate(),
        ]);
        router.refresh();
      },
      onError: (error) => {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  if (isLoadingTeams || isLoadingSelected) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center space-x-4">
          <Users className="h-6 w-6" />
          <div>
            <CardTitle>Loading Teams...</CardTitle>
            <CardDescription>Fetching your team information</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!teams.length) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-4">
        <Users className="h-6 w-6" />
        <div>
          <CardTitle>Active Team</CardTitle>
          <CardDescription>
            Current team&apos;s credentials will be used for operations
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-start gap-4">
        <Select
          value={selectedTeam?.id ?? ""}
          onValueChange={(teamId) => updateTeam({ teamId })}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a team">
              {selectedTeam ? selectedTeam.name : "Choose a team"}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                <div className="w-row flex w-full items-center justify-between">
                  <span className="text-sm">
                    {team.name}
                    {!team.correiosCredential && (
                      <span className="text-xs  mx-1 text-red-500">
                        (No Credentials)
                      </span>
                    )}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!selectedTeam?.correiosCredential?.accessCode && (
          <Alert variant="destructive">
            <AlertTitle>Configure the Selected Team Credentials</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Add credentials to your selected team to enable order tracking.</p>
              <Button
                variant="destructive"
                onClick={() => router.push(`teams/personal`)}
                className="font-semibold hover:underline"
              >
                Configure credentials
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
