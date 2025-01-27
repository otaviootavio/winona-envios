"use client";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

interface NoCredentialsViewProps {
  teamId: string;
}

export function NoCredentialsView({ teamId }: NoCredentialsViewProps) {
  const router = useRouter();

  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Card className="w-[600px]">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <KeyRound className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">
            Correios Credentials Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>No Correios credentials found for this team</AlertTitle>
            <AlertDescription>
              To track orders, you need to set up Correios credentials for your
              team.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Button
              onClick={() => router.push(`/teams/${teamId}/settings`)}
              size="lg"
            >
              Set Up Credentials
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
