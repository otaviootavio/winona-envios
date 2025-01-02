"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { FileUploadCard } from "./FileUploadCard";
import { OrdersTable } from "./OrdersTable";
import { TablePagination } from "./TablePagination";
import { CSVParser } from "../utils/csvParser";

const ITEMS_PER_PAGE = 10;

export function OrdersManagement() {
  const [page, setPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const utils = api.useUtils();

  const importSummary = api.order.getImportsSummary.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const orders = api.order.getImportOrders.useQuery(
    {
      importId: importSummary.data?.[0]?.id ?? "",
      page,
    },
    {
      retry: false,
      refetchOnWindowFocus: false,
      enabled: !!importSummary.data?.[0]?.id,
    },
  );

  const importOrders = api.order.import.useMutation({
    onSuccess: async () => {
      await utils.order.invalidate();
      toast({
        title: "Success",
        description: "Orders imported successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    try {
      const parsedOrders = await CSVParser.parseOrders(file);
      
      if (parsedOrders.length === 0) {
        toast({
          title: "Error",
          description: "No valid orders found in the CSV file",
          variant: "destructive",
        });
        return;
      }

      importOrders.mutate({
        fileName: file.name,
        orders: parsedOrders,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to read the CSV file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (importSummary.error?.data?.code === "UNAUTHORIZED") {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="destructive">
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>Please log in to view orders.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const latestImport = importSummary.data?.[0];
  const totalOrders = latestImport?._count?.orders ?? 0;

  const hasNextPage = !orders.isLoading && orders.data ? orders.data.length === ITEMS_PER_PAGE : false;
  const hasPreviousPage = page > 1;

  return (
    <div className="w-full space-y-4">
      <FileUploadCard
        onFileSelect={handleFileSelect}
        isUploading={isUploading}
        isPending={importOrders.isPending}
        latestImport={
          latestImport
            ? {
                totalOrders,
                fileName: latestImport.fileName,
              }
            : undefined
        }
      />

      <OrdersTable 
        orders={orders.data ?? []} 
        isLoading={orders.isLoading}
      />

      {orders.data && orders.data.length > 0 && (
        <TablePagination
          currentPage={page}
          onPageChange={setPage}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          isLoading={orders.isLoading}
        />
      )}
    </div>
  );
}