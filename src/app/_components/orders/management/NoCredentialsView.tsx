import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const NoCredentialsView = () => {
  const router = useRouter();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Set up your API Key</CardTitle>
          <CardDescription>
            Configure your own Correios credentials to track orders
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-muted-foreground">
            Set up your own Correios credentials to start tracking your orders
            independently.
          </p>
          <Button
            onClick={() => router.push("/teams/personal")}
            className="w-full"
          >
            <span>Configure API Key</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Join a Team</CardTitle>
          <CardDescription>
            Use shared credentials by joining an existing team
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-muted-foreground">
            Join a team to use shared Correios credentials and collaborate with
            others.
          </p>
          <Button
            onClick={() => router.push("/teams/personal")}
            variant="secondary"
            className="w-full"
          >
            <span>Find Teams</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
