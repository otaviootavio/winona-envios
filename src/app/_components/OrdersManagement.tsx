"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { useToast } from "~/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";

type Order = {
  id: string;
  orderNumber: string;
  shippingStatus: string;
  trackingCode: string | null;
};

export function OrdersManagement() {
  const [page, setPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const utils = api.useUtils();

  // Get the latest import summary
  const importSummaryQuery = api.order.getImportsSummary.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Get orders with pagination (assuming 10 per page)
  const ordersQuery = api.order.getImportOrders.useQuery(
    {
      importId: importSummaryQuery.data?.[0]?.id ?? "",
      page,
    },
    {
      retry: false,
      refetchOnWindowFocus: false,
      enabled: !!importSummaryQuery.data?.[0]?.id,
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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const text = await file.text();
      Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, string>>) => {
          const orders = results.data
            .filter((row) => {
              return (
                row["Número do Pedido"] &&
                row["Status do Envio"] &&
                row["Código de rastreio do envio"]
              );
            })
            .map((row) => ({
              orderNumber: String(row["Número do Pedido"]).trim(),
              shippingStatus: String(row["Status do Envio"]).trim(),
              trackingCode: row["Código de rastreio do envio"]
                ? String(row["Código de rastreio do envio"]).trim()
                : null,
            }));

          // Verificar se há pedidos válidos
          if (orders.length === 0) {
            toast({
              title: "Error",
              description: "No valid orders found in the CSV file",
              variant: "destructive",
            });
            return;
          }

          // Notificar sobre registros ignorados
          if (orders.length < results.data.length) {
            toast({
              title: "Error",
              description: `${results.data.length - orders.length} invalid orders were skipped`,
              variant: "destructive",
            });
          }

          // Enviar dados para a API
          // Quick fix using type assertion
          importOrders.mutate({
            fileName: file.name,
            orders: orders as {
              orderNumber: string;
              shippingStatus: string;
              trackingCode: string | null;
            }[],
          });
        },
        error: (error: Error) => {
          toast({
            title: "Error parsing CSV",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "Failed to read the CSV file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const totalOrders = importSummaryQuery.data?.[0]?._count?.orders ?? 0;
  const fileName = importSummaryQuery.data?.[0]?.fileName ?? "";
  const hasOrders = totalOrders > 0;

  const showPrevious = page > 1;
  const showNext = ordersQuery.data && ordersQuery.data.length === 10;

  if (importSummaryQuery.error?.data?.code === "UNAUTHORIZED") {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="destructive">
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>Please log in to view orders.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import Orders</CardTitle>
          <CardDescription>
            Upload your CSV file to import orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <Button asChild disabled={isUploading || importOrders.isPending}>
              <label htmlFor="csv-upload" className="cursor-pointer">
                {isUploading ? "Uploading..." : "Upload CSV"}
              </label>
            </Button>

            {hasOrders && (
              <Alert>
                <AlertTitle>Latest Import</AlertTitle>
                <AlertDescription>
                  {totalOrders} orders imported from {fileName}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>List of imported orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersQuery.data?.map((order: Order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>{order.shippingStatus}</TableCell>
                  <TableCell>{order.trackingCode ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                {showPrevious && (
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={
                        !showPrevious ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink>{page}</PaginationLink>
                </PaginationItem>
                {showNext && (
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => p + 1)}
                      className={
                        !showNext ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OrdersManagement;
