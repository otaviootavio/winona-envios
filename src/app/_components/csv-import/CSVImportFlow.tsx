"use client";

import { useState } from "react";
import { useToast } from "~/hooks/use-toast";
import { api } from "~/trpc/react";
import { type ParsedOrder } from "~/app/utils/csvParser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CSVFileUpload } from './CSVFileUpload';
import { CSVPreview } from './CSVPreview';
import { CSVSubmission } from './CSVSubmission';

type ImportStep = "upload" | "preview" | "submit";

export function CSVImportFlow() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedOrder[]>([]);
  const { toast } = useToast();
  const utils = api.useUtils();

  // Step handlers
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleDataParsed = (data: ParsedOrder[]) => {
    setParsedData(data);
    setCurrentStep("preview");
  };

  const handleBack = () => {
    switch (currentStep) {
      case "preview":
        setCurrentStep("upload");
        break;
      case "submit":
        setCurrentStep("preview");
        break;
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case "preview":
        setCurrentStep("submit");
        break;
    }
  };

  const handleSubmitSuccess = async () => {
    await utils.order.invalidate();
    toast({
      title: "Success",
      description: "Orders imported successfully",
    });
    // Reset state and redirect or show success message
  };

  return (
    <div className="space-y-4">
      {/* Progress Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Import Progress</CardTitle>
          <CardDescription>
            Complete each step to import your orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full ${
                  currentStep === "upload"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                } flex items-center justify-center`}
              >
                1
              </div>
              <span>Upload</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full ${
                  currentStep === "preview"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                } flex items-center justify-center`}
              >
                2
              </div>
              <span>Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full ${
                  currentStep === "submit"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                } flex items-center justify-center`}
              >
                3
              </div>
              <span>Submit</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === "upload" && (
            <CSVFileUpload
              onFileSelect={handleFileSelect}
              onDataParsed={handleDataParsed}
            />
          )}
          {currentStep === "preview" && (
            <CSVPreview data={parsedData} file={file} />
          )}
          {currentStep === "submit" && (
            <CSVSubmission
              data={parsedData}
              file={file}
              onSuccess={handleSubmitSuccess}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === "upload"}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {currentStep === "preview" && (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}