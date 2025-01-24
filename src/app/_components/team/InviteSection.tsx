"use client";

import { useToast } from "~/hooks/use-toast";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Copy } from "lucide-react";

export function InviteSection({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const [inviteLink, setInviteLink] = useState("");

  const generateInviteMutation = api.team.generateInviteLink.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}/teams/join${data.inviteLink.split("join-team")[1]}`;
      setInviteLink(link);
      toast({
        title: "Invite link generated",
        description: "You can now share this link with your team members.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateInviteLink = () => {
    generateInviteMutation.mutate({ teamId });
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Copied to clipboard",
      description: "The invite link has been copied to your clipboard.",
    });
  };

  return (
    <div className="flex flex-col space-y-2">
      <h3 className="text-lg font-medium">Invite Link</h3>
      <div className="flex space-x-2">
        <Input
          value={inviteLink ?? ""}
          placeholder="Generate an invite link..."
          readOnly
          className="flex-1"
        />
        {!inviteLink ? (
          <Button
            onClick={generateInviteLink}
            disabled={generateInviteMutation.isPending}
          >
            {generateInviteMutation.isPending
              ? "Generating..."
              : "Generate Link"}
          </Button>
        ) : (
          <Button onClick={copyToClipboard} variant="outline">
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
