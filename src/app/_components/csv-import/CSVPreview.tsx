import { useState } from "react";
import { type ParsedOrder } from "~/app/utils/csvParser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
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
import { FileText, Search, ChevronUp, ChevronDown } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import { Button } from "~/components/ui/button";

interface CSVPreviewProps {
  data: ParsedOrder[];
  file: File | null;
}

type SortField =
  | "orderNumber"
  | "shippingStatus"
  | "trackingCode"
  | "validation";
type SortDirection = "asc" | "desc";
type ValidationStatus = "all" | "valid" | "invalid";

export function CSVPreview({ data, file }: CSVPreviewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("orderNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [validationFilter, setValidationFilter] =
    useState<ValidationStatus>("all");
  const itemsPerPage = 10;

  // Filter and sort data
  const sortedAndFilteredData = [...data]
    .filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.trackingCode?.toLowerCase() ?? "").includes(
          searchTerm.toLowerCase(),
        );

      const matchesValidation = (() => {
        if (validationFilter === "all") return true;

        if (validationFilter === "valid") {
          return order.trackingCode && isValidTrackingCode(order.trackingCode);
        }

        if (validationFilter === "invalid") {
          return order.trackingCode && !isValidTrackingCode(order.trackingCode);
        }

        return false;
      })();

      return matchesSearch && matchesValidation;
    })
    .sort((a, b) => {
      if (sortField === "validation") {
        const aValid = Boolean(a.trackingCode);
        const bValid = Boolean(b.trackingCode);
        return sortDirection === "asc"
          ? Number(aValid) - Number(bValid)
          : Number(bValid) - Number(aValid);
      }

      const aValue = a[sortField] ?? "";
      const bValue = b[sortField] ?? "";
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });

  // Calculate pagination
  const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedAndFilteredData.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleValidationFilterChange = (value: ValidationStatus) => {
    setValidationFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Only count orders with tracking codes that are invalid format
  const invalidOrders = data.filter(
    (order) => order.trackingCode && !isValidTrackingCode(order.trackingCode),
  );
  const hasInvalidOrders = invalidOrders.length > 0;

  // Helper to validate tracking code format
  function isValidTrackingCode(code: string): boolean {
    // Correios tracking codes are typically 13 characters
    // They usually start with two letters followed by 9 numbers and BR
    // Example: AA123456789BR
    return /^[A-Z]{2}\d{9}BR$/i.test(code);
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-6">
      {/* File Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{file?.name}</CardTitle>
              <CardDescription>
                {data.length} orders found •{" "}
                {(file?.size ?? 0 / 1024).toFixed(1)} KB
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Validation Warnings */}
      {hasInvalidOrders && (
        <Alert variant="destructive">
          <AlertTitle>Invalid Tracking Codes Detected</AlertTitle>
          <AlertDescription>
            {invalidOrders.length} orders have invalid tracking code formats.
            Please verify these tracking codes follow the correct format (e.g.,
            AA123456789BR).
          </AlertDescription>
        </Alert>
      )}

      {/* Search, Filter, and Preview */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number or tracking code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={validationFilter}
            onValueChange={(value) =>
              handleValidationFilterChange(value as ValidationStatus)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by validation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="valid">Valid Orders</SelectItem>
              <SelectItem value="invalid">Invalid Tracking Codes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("orderNumber")}
                    className="flex items-center gap-1"
                  >
                    Order Number
                    <SortIcon field="orderNumber" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("shippingStatus")}
                    className="flex items-center gap-1"
                  >
                    Shipping Status
                    <SortIcon field="shippingStatus" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("trackingCode")}
                    className="flex items-center gap-1"
                  >
                    Tracking Code
                    <SortIcon field="trackingCode" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("validation")}
                    className="flex items-center gap-1"
                  >
                    Validation
                    <SortIcon field="validation" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No orders found matching your search
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((order, index) => (
                  <TableRow key={`${order.orderNumber}-${index}`}>
                    <TableCell>{order.orderNumber}</TableCell>
                    <TableCell>{order.shippingStatus}</TableCell>
                    <TableCell>
                      {order.trackingCode ? (
                        order.trackingCode
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!order.trackingCode ? (
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-800"
                        >
                          No Tracking
                        </Badge>
                      ) : isValidTrackingCode(order.trackingCode) ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800"
                        >
                          Valid
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-red-100 text-red-800"
                        >
                          Invalid Format
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-
            {Math.min(startIndex + itemsPerPage, sortedAndFilteredData.length)}{" "}
            of {sortedAndFilteredData.length} orders
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <div className="flex h-9 items-center justify-center px-4">
                  Page {currentPage} of {totalPages}
                </div>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
