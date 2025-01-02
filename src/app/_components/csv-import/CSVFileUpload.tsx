"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Upload, X, FileText } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { type ParsedOrder } from "~/app/utils/csvParser";
import { CSVParser } from "~/app/utils/csvParser";
import { Card, CardContent } from "~/components/ui/card";

interface CSVFileUploadProps {
  onFileSelect: (file: File) => void;
  onDataParsed: (data: ParsedOrder[]) => void;
}

export function CSVFileUpload({ onFileSelect, onDataParsed }: CSVFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const validateFile = async (file: File): Promise<boolean> => {
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return false;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size should be less than 5MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFile = async (file: File) => {
    if (!(await validateFile(file))) return;

    setIsUploading(true);
    try {
      const parsedData = await CSVParser.parseOrders(file);
      setSelectedFile(file);
      onFileSelect(file);
      onDataParsed(parsedData);
      
      toast({
        title: "Success",
        description: `Successfully processed ${parsedData.length} orders`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive",
      });
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div
            className={`relative flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              dragActive
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={clearFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleChange}
                  className="hidden"
                  id="csv-upload"
                  disabled={isUploading}
                />
                <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer text-center"
                >
                  <span className="text-primary font-medium">Click to upload</span>
                  {" or drag and drop"}
                  <p className="text-xs text-muted-foreground">
                    CSV files only (max 5MB)
                  </p>
                </label>
              </>
            )}

            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <div className="text-sm text-muted-foreground">
                  Processing file...
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertTitle>Required CSV Format</AlertTitle>
        <AlertDescription>
          <p>Your CSV file must include an order number column with one of these names:</p>
          <ul className="mt-2 list-inside list-disc">
            <li>Número do Pedido (or similar variations)</li>
            <li>Order Number</li>
            <li>Pedido</li>
          </ul>
          <p className="mt-2 text-sm text-muted-foreground">
            Small typos in column names are automatically fixed. Tracking code and shipping status columns are optional.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}