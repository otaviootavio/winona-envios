"use client";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const NoOrdersView = () => {
  const router = useRouter();
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Orders</CardTitle>
        <CardDescription>
          Start by importing your orders to track them
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <p className="text-center text-muted-foreground">
          To get started, you need to import your orders first.
        </p>
        <Button onClick={() => router.push("/import")}>Import Orders</Button>
      </CardContent>
    </Card>
  );
};
