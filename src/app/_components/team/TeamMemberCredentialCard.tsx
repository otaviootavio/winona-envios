import React from "react";
import { Alert } from "~/components/ui/alert";
import { Check, AlertCircle } from "lucide-react";

interface CredentialStatusProps {
  hasCredentials: boolean;
}

const CredentialStatus = ({ hasCredentials }: CredentialStatusProps) => (
  <div>
    <Alert variant={hasCredentials ? "default" : "destructive"}>
      {hasCredentials ? (
        <>
          <Check className="h-4 w-4" />
          <p className="text-sm">Credentials are working!</p>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">Please configure the credentials</p>
        </>
      )}
    </Alert>
  </div>
);

export default CredentialStatus;
