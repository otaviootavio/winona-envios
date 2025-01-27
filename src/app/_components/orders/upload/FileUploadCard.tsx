"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Upload } from "lucide-react";

interface FileUploadCardProps {
  latestImport?: {
    totalOrders: number;
    fileName: string;
  };
}

export function FileUploadCard({ latestImport }: FileUploadCardProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Orders</CardTitle>
        <CardDescription>Upload and validate your orders data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6">
            <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
            <Button 
              onClick={() => router.push('/import')}
              className="w-full sm:w-auto"
            >
              Import New Orders
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              Use our new improved import process with validation and preview
            </p>
          </div>

          {latestImport && latestImport.totalOrders > 0 && (
            <Alert>
              <AlertTitle>Latest Import</AlertTitle>
              <AlertDescription>
                {latestImport.totalOrders} orders imported from {latestImport.fileName}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}