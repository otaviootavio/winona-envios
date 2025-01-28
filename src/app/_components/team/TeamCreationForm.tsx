"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

interface TeamCreationDialogProps {
  isPersonal?: boolean;
}

export function TeamCreationDialog({
  isPersonal = false,
}: TeamCreationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = api.useUtils();
  const [teamName, setTeamName] = useState("");
  const [open, setOpen] = useState(false);

  const createTeamMutation = api.team.create.useMutation({
    onSuccess: async () => {
      toast({
        title: "Team created",
        description: "Your team has been created successfully.",
      });
      setTeamName("");
      if (isPersonal) {
        await utils.team.getPersonalTeam.invalidate();
      } else {
        await utils.team.getOwnedTeams.invalidate();
      }
      setOpen(false);
      router.refresh();
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
    if (!teamName.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    createTeamMutation.mutate({
      name: teamName,
      isPersonal,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus /> Create new team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create {isPersonal ? "Personal" : ""} Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              placeholder={isPersonal ? "Your Personal Team Name" : "Team Name"}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTeamMutation.isPending}>
              {createTeamMutation.isPending
                ? "Creating..."
                : `Create ${isPersonal ? "Personal" : ""} Team`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
