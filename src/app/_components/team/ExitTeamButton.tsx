"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { useToast } from "~/hooks/use-toast";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function ExitTeamButton({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useUtils();

  const exitTeamMutation = api.team.exitTeam.useMutation({
    onSuccess: async () => {
      toast({
        title: "Team exited successfully",
        description: `You have left the team "${teamName}"`,
      });
      setIsOpen(false);

      // Invalidate the getMyTeams query to force a refetch
      await utils.team.getMyTeams.invalidate();
      router.push("/teams"); // Redirect to teams page after exiting
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExitTeam = () => {
    exitTeamMutation.mutate({ teamId });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Exit Team</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to exit this team?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. You will need a new invite link to
            rejoin the team &quot{teamName}&quot.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExitTeam}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={exitTeamMutation.isPending}
          >
            {exitTeamMutation.isPending ? "Exiting..." : "Yes, exit team"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
