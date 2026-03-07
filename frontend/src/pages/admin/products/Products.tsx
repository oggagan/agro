import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Package, X, Loader2, Eye } from "lucide-react";
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
import { useProductList, useDeleteProduct } from "@/hooks/useProducts";
import { useManufacturerList } from "@/hooks/useManufacturers";
import type { Product, ProductStatus, ProductType } from "@/types/product";

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-green-600/10 text-green-700 border-green-200",
  INACTIVE: "bg-muted/80 text-muted-foreground border-border",
  PENDING: "bg-amber-500/10 text-amber-800 border-amber-200",
  DRAFT: "bg-blue-500/10 text-blue-700 border-blue-200",
  DECLINED: "bg-destructive/10 text-destructive border-destructive/20",
  REVERIFY: "bg-orange-500/10 text-orange-800 border-orange-200",
};

const PRODUCT_TYPES: ProductType[] = [
  "PESTICIDE",
  "FUNGICIDE",
  "PGR",
  "NPK",
  "FERTILIZER",
  "BIO_PESTICIDE",
  "BIO_FUNGICIDE",
  "BIO_PGR",
  "BIO_FERTILIZER",
];

function formatProductType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Products() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const queryParams = {
    page,
    limit,
    ...(search && { search }),
    ...(statusFilter !== "all" && { status: statusFilter as ProductStatus }),
    ...(typeFilter !== "all" && { productType: typeFilter as ProductType }),
    ...(manufacturerFilter !== "all" && { manufacturerId: manufacturerFilter }),
  };

  const { data: response, isLoading } = useProductList(queryParams);
  const { data: manufacturersResponse } = useManufacturerList({ limit: 500 });
  const deleteProduct = useDeleteProduct();

  const products: Product[] = response?.data ?? [];
  const meta = response?.meta;
  const manufacturers = manufacturersResponse?.data ?? [];

  const hasFilters = search || statusFilter !== "all" || typeFilter !== "all" || manufacturerFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setManufacturerFilter("all");
    setPage(1);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Products</h1>
        <Button
          className="bg-gradient-primary h-10"
          onClick={() => navigate("/dashboard/admin/products/add")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <Card className="border-0 shadow-md bg-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
            <div className="flex flex-1 flex-wrap gap-2 min-w-0">
              <div className="relative flex-1 min-w-[180px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search product name, technical name..."
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="DECLINED">Declined</SelectItem>
                  <SelectItem value="REVERIFY">Reverify</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatProductType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={manufacturerFilter} onValueChange={(v) => { setManufacturerFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All manufacturers</SelectItem>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.companyName}
                    </SelectItem>
                  ))}
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
                {meta.total === 0
                  ? "No results"
                  : `Showing ${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total}`}
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
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Product Name</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Technical Name</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Type</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Manufacturer</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Sizes</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-14">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-9 w-9 text-muted-foreground/40" />
                          <p className="text-sm font-medium">No products found</p>
                          {hasFilters && (
                            <Button variant="link" size="sm" className="h-auto p-0" onClick={clearFilters}>
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium py-3">{p.productName}</TableCell>
                        <TableCell className="py-3 text-muted-foreground text-sm">{p.technicalName}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-xs font-medium">
                            {formatProductType(p.productType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {p.manufacturer?.companyName ?? "—"}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {p.sizes?.length ?? 0}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${statusStyles[p.status] ?? "bg-muted/80 text-muted-foreground"}`}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/dashboard/admin/products/${p.id}`)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/dashboard/admin/products/edit/${p.id}`)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(p)}
                              title="Delete"
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
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
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
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.productName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
