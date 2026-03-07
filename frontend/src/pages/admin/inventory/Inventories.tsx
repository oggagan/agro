import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Warehouse, X, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useInventoryList, useDeleteInventory, useInventoryStats } from "@/hooks/useInventory";
import type { Inventory, InventoryType } from "@/types/inventory";

const typeStyles: Record<string, string> = {
  WAREHOUSE: "bg-slate-500/10 text-slate-700 border-slate-200",
  SHOP: "bg-blue-500/10 text-blue-700 border-blue-200",
  GODOWN: "bg-amber-500/10 text-amber-800 border-amber-200",
  DISTRIBUTION_CENTER: "bg-purple-500/10 text-purple-700 border-purple-200",
};

function formatType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Inventories() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [deleteTarget, setDeleteTarget] = useState<Inventory | null>(null);

  const queryParams: Parameters<typeof useInventoryList>[0] = {
    page,
    limit,
    ...(search && { search }),
    ...(ownerFilter !== "all" && { ownerType: ownerFilter as "MANUFACTURER" | "RETAILER" | "DISTRIBUTOR" }),
    ...(typeFilter !== "all" && { type: typeFilter as InventoryType }),
    ...(statusFilter !== "all" && { status: statusFilter as "ACTIVE" | "INACTIVE" }),
  };

  const { data: response, isLoading } = useInventoryList(queryParams);
  const { data: stats } = useInventoryStats();
  const deleteInventory = useDeleteInventory();

  const inventories: Inventory[] = response?.data ?? [];
  const meta = response?.meta;

  const hasFilters = search || ownerFilter !== "all" || typeFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setOwnerFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteInventory.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Inventory</h1>
        <Button
          className="bg-gradient-primary h-10"
          onClick={() => navigate("/dashboard/admin/inventory/add")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Inventory
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Inventories</p>
              <p className="text-xl font-semibold">{stats.totalInventories}</p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Products</p>
              <p className="text-xl font-semibold">{stats.totalProducts}</p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Low Stock Items</p>
              <p className="text-xl font-semibold">{stats.lowStockItems}</p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Value (₹)</p>
              <p className="text-xl font-semibold">{stats.totalValue.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-0 shadow-md bg-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
            <div className="flex flex-1 flex-wrap gap-2 min-w-0">
              <div className="relative flex-1 min-w-[180px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search name, city..."
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={ownerFilter} onValueChange={(v) => { setOwnerFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                  <SelectItem value="RETAILER">Retailer</SelectItem>
                  <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="SHOP">Shop</SelectItem>
                  <SelectItem value="GODOWN">Godown</SelectItem>
                  <SelectItem value="DISTRIBUTION_CENTER">Distribution Center</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 shrink-0" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {meta && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {meta.total === 0 ? "No results" : `Showing ${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total}`}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Name</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Location</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Type</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Products</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Low Stock</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Out of Stock</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-14">
                        <div className="flex flex-col items-center gap-2">
                          <Warehouse className="h-9 w-9 text-muted-foreground/40" />
                          <p className="text-sm font-medium">No inventories found</p>
                          {hasFilters && (
                            <Button variant="link" size="sm" className="h-auto p-0" onClick={clearFilters}>
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventories.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium py-3">
                          <div>{inv.name}</div>
                          {inv.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{inv.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {inv.city}, {inv.state}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`text-xs ${typeStyles[inv.type] ?? ""}`}>
                            {formatType(inv.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-sm">{inv._count?.products ?? 0}</TableCell>
                        <TableCell className="py-3 text-sm text-amber-600">{inv.lowStockCount ?? 0}</TableCell>
                        <TableCell className="py-3 text-sm text-destructive">{inv.outOfStockCount ?? 0}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={inv.status === "ACTIVE" ? "bg-green-600/10 text-green-700" : "bg-muted/80"}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/dashboard/admin/inventory/${inv.id}/products`)}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/dashboard/admin/inventory/edit/${inv.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(inv)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-8" disabled={meta.page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteInventory.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
