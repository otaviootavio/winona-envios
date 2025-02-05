"use client";

import { useState } from "react";
import { type ParsedOrder } from "~/app/utils/csvParser";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

interface CSVSubmissionProps {
  data: ParsedOrder[];
  file: File | null;
  onSuccess: () => void;
}

function isValidTrackingCode(code: string | null): boolean {
  if (!code) return false;
  return /^[A-Z]{2}\d{9}BR$/i.test(code);
}

export function CSVSubmission({ data, file, onSuccess }: CSVSubmissionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const importMutation = api.order.import.useMutation({
    onSuccess: () => {
      setIsComplete(true);
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    if (!file || !data.length) return;

    setIsSubmitting(true);
    setError(null);

    // Filter for valid tracking codes only
    const validOrders = data.filter(
      (order) => order.trackingCode && isValidTrackingCode(order.trackingCode),
    );

    if (validOrders.length === 0) {
      setError("No valid tracking codes found in the data");
      setIsSubmitting(false);
      return;
    }

    importMutation.mutate({
      fileName: file.name,
      orders: validOrders,
    });
  };

  // Count valid tracking codes
  const validTrackingCount = data.filter(
    (order) => order.trackingCode && isValidTrackingCode(order.trackingCode),
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
          <CardDescription>
            Review your import details before submitting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Total Orders
              </dt>
              <dd className="text-2xl font-bold">{data.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Valid Tracking Codes
              </dt>
              <dd className="text-2xl font-bold">{validTrackingCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                File Name
              </dt>
              <dd className="font-medium">{file?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                File Size
              </dt>
              <dd className="font-medium">
                {((file?.size ?? 0) / 1024).toFixed(1)} KB
              </dd>
            </div>
          </dl>

          {validTrackingCount !== data.length && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Attention</AlertTitle>
              <AlertDescription>
                Only {validTrackingCount} out of {data.length} orders have valid
                tracking codes and will be imported. Valid tracking codes should
                follow the format: AA123456789BR
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isComplete && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            {validTrackingCount} orders have been successfully imported and are
            ready for tracking.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-row items-center justify-between">
        {/* Help Text */}
        <p className="text-left text-sm text-muted-foreground p-2">
          <span>
            <span>
              By clicking Import Orders, only orders with valid tracking codes will
              be imported.
            </span> <br/><span>This action cannot be undone.</span>
          </span>
        </p>

        {/* Submit Button */}
        <div className="justify flex">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isComplete || validTrackingCount === 0}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : isComplete ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                <span>Imported Successfully</span>
              </>
            ) : (
              `Import ${validTrackingCount} Orders`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
