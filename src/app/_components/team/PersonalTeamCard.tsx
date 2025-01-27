"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { AlertCircle, Key, Loader2, UserCircle } from "lucide-react";
import { api } from "~/trpc/react";
import CredentialsDialog from "../CredentialsDialog";

const PersonalTeamCard = () => {
  const { data: team, isLoading } = api.team.getPersonalTeam.useQuery();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!team) {
    return null;
  }

  const hasCredentials = !!team.correiosCredential;
  const user = team.personalFor;

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Personal Account
              <Badge variant={hasCredentials ? "default" : "destructive"}>
                {hasCredentials ? "Ready" : "Setup Required"}
              </Badge>
            </CardTitle>
            <CardDescription>My Workspace</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Personal Information Section */}
          <div className="rounded-lg border p-4">
            <div className="mb-4 flex items-center gap-3">
              <UserCircle className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">{user.name ?? "Not set"}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Credentials Section */}
          {!hasCredentials ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Correios Integration Required</AlertTitle>
              <AlertDescription>
                <p className="mb-4">
                  To start tracking your orders, you need to configure your
                  Correios business credentials (CNPJ and contract details).
                </p>
                <CredentialsDialog
                  teamId={team.id}
                />
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Key className="h-4 w-4" />
              <AlertTitle>Correios Integration Active</AlertTitle>
              <AlertDescription>
                <dl className="mt-2 space-y-1">
                  <div className="text-sm">
                    <dt className="inline text-muted-foreground">CNPJ/CPF: </dt>
                    <dd className="inline">
                      {team.correiosCredential?.identifier}
                    </dd>
                  </div>
                  <div className="text-sm">
                    <dt className="inline text-muted-foreground">Contract: </dt>
                    <dd className="inline">
                      {team.correiosCredential?.contract}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <CredentialsDialog
                    teamId={team.id}
                  />
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalTeamCard;
