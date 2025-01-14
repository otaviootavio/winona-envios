"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { FileUploadCard } from "./FileUploadCard";
import { OrdersTable } from "./OrdersTable";
import { TablePagination } from "./TablePagination";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Search } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { SortableFields, type SortableFieldValue } from "~/constants/order";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 10;

interface ImportInfo {
  totalOrders: number;
  fileName: string;
}

export function OrdersManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = api.useUtils();

  // State
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [hasTrackingFilter, setHasTrackingFilter] = useState<boolean | undefined>();
  const [sortBy, setSortBy] = useState<SortableFieldValue>(SortableFields.ORDER_NUMBER);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Data fetching
  const importSummary = api.order.getImportsSummary.useQuery();
  const { data: credentials } = api.correios.getCredentials.useQuery();
  
  const latestImportId = importSummary.data?.[0]?.id;

  const { data: orderStats } = api.order.getOrderStats.useQuery(
    { importId: latestImportId ?? "" },
    { enabled: !!latestImportId }
  );

  const orders = api.order.getImportOrders.useQuery(
    {
      importId: latestImportId ?? "",
      page,
      pageSize: ITEMS_PER_PAGE,
      filters: {
        search: searchTerm || undefined,
        status: statusFilter,
        hasTracking: hasTrackingFilter,
      },
      sortBy,
      sortOrder,
    },
    { enabled: !!latestImportId }
  );

  // Mutations
  const batchUpdate = api.tracking.batchUpdateTracking.useMutation({
    onSuccess: async (data) => {
      await utils.order.invalidate();
      toast({
        title: "Atualização em Lote Concluída",
        description: `${data.successfulUpdates} de ${data.totalProcessed} pedidos foram atualizados com sucesso`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleSort = (field: SortableFieldValue) => {
    if (field === sortBy) {
      setSortOrder(current => current === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Loading state
  if (importSummary.isLoading) return null;

  // Error state
  if (importSummary.error?.data?.code === "UNAUTHORIZED") {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="destructive">
          <AlertTitle>Não Autorizado</AlertTitle>
          <AlertDescription>Por favor, faça login para visualizar os pedidos.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // No orders state
  if (!latestImportId) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Importar Pedidos</CardTitle>
          <CardDescription>Comece importando seus pedidos para rastreá-los</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-muted-foreground">
            Para começar, você precisa importar seus pedidos primeiro.
          </p>
          <Button onClick={() => router.push("/import")}>Importar Pedidos</Button>
        </CardContent>
      </Card>
    );
  }

  // No credentials state
  if (!credentials) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Configurar Credenciais</CardTitle>
          <CardDescription>Configure suas credenciais dos Correios para rastrear seus pedidos importados</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-muted-foreground">
            Seus pedidos foram importados com sucesso! Agora, configure suas credenciais dos Correios para começar a rastreá-los.
          </p>
          <Button onClick={() => router.push("/correios-settings")}>
            Configurar Credenciais dos Correios
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for dashboard
  const latestImport = importSummary.data?.[0];
  const totalOrders = orderStats?.totalOrders ?? 0;
  const trackingCount = orderStats?.trackingCount ?? 0;

  const importInfo: ImportInfo | undefined = latestImport
    ? { totalOrders, fileName: latestImport.fileName }
    : undefined;

  // Render dashboard
  return (
    <div className="w-full space-y-4">
      <FileUploadCard latestImport={importInfo} />

      {latestImport && (
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral do Rastreamento</CardTitle>
            <CardDescription>Status atual dos seus pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Total de Pedidos</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Com Rastreamento</p>
                <p className="text-2xl font-bold">{trackingCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Data da Importação</p>
                <p className="text-2xl font-bold">
                  {latestImport.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número do pedido ou código de rastreio..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(value) => {
            setStatusFilter(value === "all" ? undefined : value as OrderStatus);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value={OrderStatus.POSTED}>Postado</SelectItem>
            <SelectItem value={OrderStatus.NOT_FOUND}>Não Encontrado</SelectItem>
            <SelectItem value={OrderStatus.IN_TRANSIT}>Em Trânsito</SelectItem>
            <SelectItem value={OrderStatus.DELIVERED}>Entregue</SelectItem>
            <SelectItem value={OrderStatus.UNKNOWN}>Desconhecido</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={hasTrackingFilter === undefined ? "all" : hasTrackingFilter.toString()}
          onValueChange={(value) => {
            setHasTrackingFilter(value === "all" ? undefined : value === "true");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por rastreio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Pedidos</SelectItem>
            <SelectItem value="true">Com Rastreio</SelectItem>
            <SelectItem value="false">Sem Rastreio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <OrdersTable
        orders={orders.data?.orders ?? []}
        isLoading={orders.isLoading || batchUpdate.isPending}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />

      {orders.data && orders.data.orders.length > 0 && (
        <TablePagination
          currentPage={page}
          onPageChange={setPage}
          totalPages={orders.data.pagination.pageCount}
          isLoading={orders.isLoading}
        />
      )}
    </div>
  );
}