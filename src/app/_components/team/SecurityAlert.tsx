import { Alert, AlertDescription } from "~/components/ui/alert";

export function SecurityAlert() {
  return (
    <Alert>
      <AlertDescription>
        All team members will use your API keys. Be careful who you
        invite.
      </AlertDescription>
    </Alert>
  );
}
