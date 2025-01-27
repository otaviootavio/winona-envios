"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { api } from "~/trpc/react";

function JoinTeamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the token from the URL using searchParams
  const token = searchParams.get("token");

  const joinTeamMutation = api.team.join.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You have successfully joined the team.",
      });
      router.push("/teams/managed");
    },
    onError: (error) => {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link. No token provided.");
      setIsLoading(false);
      return;
    }

    joinTeamMutation.mutate({ token });
  }, [token]);

  if (isLoading && joinTeamMutation.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Joining Team</CardTitle>
            <CardDescription>
              Please wait while we process your invitation...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-destructive">
              Unable to Join Team
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/teams/personal")}>
              Go to Teams
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Join Team</CardTitle>
          <CardDescription>Processing your invitation...</CardDescription>
        </CardHeader>
        <CardContent>
          {joinTeamMutation.error && (
            <p className="text-sm text-destructive">
              {joinTeamMutation.error.message}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push("/teams/personal")}>
            Cancel
          </Button>
          <Button
            onClick={() => token && joinTeamMutation.mutate({ token })}
            disabled={joinTeamMutation.isPending || !token}
          >
            {joinTeamMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Team"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Loading</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JoinTeamContent />
    </Suspense>
  );
}
