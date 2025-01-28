"use server";

import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { JoinTeamContent } from "~/app/_components/team/join/JoinTeamContent";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { auth } from "~/server/auth";

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

export default async function JoinTeamPage() {
  const session = await auth();
  if (!session) {
    return redirect("/api/auth/signin");
  }
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JoinTeamContent />
    </Suspense>
  );
}
