import { OrderStatus } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@radix-ui/react-select";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { SelectItem } from "~/components/ui/select";

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: OrderStatus | undefined;
  onStatusFilterChange: (value: OrderStatus | undefined) => void;
}

export const SearchFilters = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: SearchFilterProps) => (
  <div className="mb-4 flex flex-col gap-4 md:flex-row">
    <div className="relative flex-1">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search by order number or tracking code..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-8"
      />
    </div>
    <Select
      value={statusFilter ?? "all"}
      onValueChange={(value) => {
        onStatusFilterChange(
          value === "all" ? undefined : (value as OrderStatus),
        );
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value={OrderStatus.POSTED}>Posted</SelectItem>
        <SelectItem value={OrderStatus.NOT_FOUND}>Not found</SelectItem>
        <SelectItem value={OrderStatus.IN_TRANSIT}>In transit</SelectItem>
        <SelectItem value={OrderStatus.DELIVERED}>Delivered</SelectItem>
        <SelectItem value={OrderStatus.UNKNOWN}>Unknown</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
