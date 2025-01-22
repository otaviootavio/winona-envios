import { Alert, AlertDescription } from "~/components/ui/alert";

export function SecurityAlert() {
  return (
    <Alert>
      <AlertDescription>
        All team members have access to the shared secrets, such as API keys. Be careful who you
        invite.
      </AlertDescription>
    </Alert>
  );
}
