"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

interface FileUploadCardProps {
  onFileSelect: (file: File) => Promise<void>;
  isUploading: boolean;
  isPending: boolean;
  latestImport?: {
    totalOrders: number;
    fileName: string;
  };
}

export function FileUploadCard({
  onFileSelect,
  isUploading,
  isPending,
  latestImport
}: FileUploadCardProps) {
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onFileSelect(file);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Orders</CardTitle>
        <CardDescription>Upload your CSV file to import orders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <Button asChild disabled={isUploading || isPending}>
            <label htmlFor="csv-upload" className="cursor-pointer">
              {isUploading ? "Uploading..." : "Upload CSV"}
            </label>
          </Button>

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