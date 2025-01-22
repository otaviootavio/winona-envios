"use client";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";

export function TeamCreationForm() {
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");
  const utils = api.useUtils();

  const createTeamMutation = api.team.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Team created",
        description: "Your new team has been created successfully.",
      });
      setTeamName("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    createTeamMutation.mutate({ name: teamName });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4">
      <Input
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder="Enter team name"
        className="flex-1"
        disabled={createTeamMutation.isPending}
      />
      <Button
        type="submit"
        disabled={createTeamMutation.isPending || !teamName.trim()}
      >
        {createTeamMutation.isPending ? "Creating..." : "Create Team"}
      </Button>
    </form>
  );
}
