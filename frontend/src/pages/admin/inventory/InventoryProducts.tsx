import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Edit, Trash2, Package, Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useInventory, useInventoryProducts, useAddInventoryProduct, useUpdateInventoryProduct, useDeleteInventoryProduct } from "@/hooks/useInventory";
import { useProductList } from "@/hooks/useProducts";
import type { InventoryProduct, StockUnit, StockSourceType } from "@/types/inventory";

const STOCK_UNITS: StockUnit[] = ["KG", "G", "L", "ML", "PACK", "BAG", "BOTTLE", "QUANTAL"];
const SOURCE_TYPES: StockSourceType[] = ["MANUFACTURER", "OTHER"];

const statusStyles: Record<string, string> = {
  IN_STOCK: "bg-green-600/10 text-green-700 border-green-200",
  LOW_STOCK: "bg-amber-500/10 text-amber-800 border-amber-200",
  OUT_OF_STOCK: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function InventoryProducts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<InventoryProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryProduct | null>(null);

  const { data: inventory, isLoading: invLoading } = useInventory(id);
  const { data: productsRes } = useProductList({ limit: 500, status: "ACTIVE" });
  const { data: response, isLoading } = useInventoryProducts(id, { page, limit: 10, search: search || undefined, status: statusFilter !== "all" ? statusFilter as "inStock" | "lowStock" | "outOfStock" : undefined });
  const addProduct = useAddInventoryProduct();
  const updateProduct = useUpdateInventoryProduct();
  const deleteProduct = useDeleteInventoryProduct();

  const products = productsRes?.data ?? [];
  const inventoryProducts: InventoryProduct[] = response?.data ?? [];
  const meta = response?.meta;

  const [formProductId, setFormProductId] = useState("");
  const [formStock, setFormStock] = useState(1);
  const [formPrice, setFormPrice] = useState(0);
  const [formSourceType, setFormSourceType] = useState<StockSourceType>("MANUFACTURER");
  const [formBatchNumber, setFormBatchNumber] = useState("");
  const [formUnit, setFormUnit] = useState<StockUnit>("BOTTLE");
  const [formLowStockThreshold, setFormLowStockThreshold] = useState(10);

  const resetForm = () => {
    setFormProductId("");
    setFormStock(1);
    setFormPrice(0);
    setFormSourceType("MANUFACTURER");
    setFormBatchNumber("");
    setFormUnit("BOTTLE");
    setFormLowStockThreshold(10);
  };

  const handleAdd = () => {
    if (!id || !formProductId || formPrice <= 0) return;
    addProduct.mutate(
      {
        inventoryId: id,
        payload: {
          productId: formProductId,
          stock: formStock,
          price: formPrice,
          sourceType: formSourceType,
          batchNumber: formBatchNumber.trim() || undefined,
          unit: formUnit,
          lowStockThreshold: formLowStockThreshold,
        },
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleEdit = () => {
    if (!id || !editEntry) return;
    updateProduct.mutate(
      {
        inventoryId: id,
        inventoryProductId: editEntry.id,
        payload: { stock: formStock, price: formPrice, lowStockThreshold: formLowStockThreshold },
      },
      {
        onSuccess: () => {
          setEditEntry(null);
          resetForm();
        },
      }
    );
  };

  const openEdit = (entry: InventoryProduct) => {
    setEditEntry(entry);
    setFormStock(entry.stock);
    setFormPrice(Number(entry.price));
    setFormLowStockThreshold(entry.lowStockThreshold);
  };

  const confirmDelete = () => {
    if (!id || !deleteTarget) return;
    deleteProduct.mutate(
      { inventoryId: id, inventoryProductId: deleteTarget.id },
      { onSuccess: () => setDeleteTarget(null) }
    );
  };

  if (invLoading || !inventory) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const inStockCount = inventoryProducts.filter((p) => p.computedStatus === "IN_STOCK").length;
  const lowStockCount = inventoryProducts.filter((p) => p.computedStatus === "LOW_STOCK").length;
  const outOfStockCount = inventoryProducts.filter((p) => p.computedStatus === "OUT_OF_STOCK").length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/dashboard/admin/inventory")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{inventory.name}</h1>
            <p className="text-sm text-muted-foreground">
              {inventory.city}, {inventory.state}
            </p>
          </div>
        </div>
        <Button className="bg-gradient-primary h-10" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Products</p>
            <p className="text-xl font-semibold">{inventoryProducts.length}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">In Stock</p>
            <p className="text-xl font-semibold text-green-600">{inStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Low Stock</p>
            <p className="text-xl font-semibold text-amber-600">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Out of Stock</p>
            <p className="text-xl font-semibold text-destructive">{outOfStockCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md bg-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product, company, batch..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="inStock">In Stock</SelectItem>
                <SelectItem value="lowStock">Low Stock</SelectItem>
                <SelectItem value="outOfStock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Product</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Company</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Stock</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Price (₹)</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-14 text-muted-foreground">
                        <Package className="h-9 w-9 mx-auto mb-2 opacity-40" />
                        <p>No products in this inventory. Add a product to get started.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventoryProducts.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell className="font-medium py-3">{ip.product?.productName ?? "—"}</TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">{ip.product?.manufacturer?.companyName ?? "—"}</TableCell>
                        <TableCell className="py-3">{ip.stock} {ip.unit}</TableCell>
                        <TableCell className="py-3">₹{Number(ip.price).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`text-xs ${statusStyles[ip.computedStatus ?? ""] ?? ""}`}>
                            {ip.computedStatus?.replace("_", " ") ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ip)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(ip)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 pt-4 border-t flex justify-between">
              <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" className="h-8" disabled={meta.page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product to Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={formProductId} onValueChange={setFormProductId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.productName} ({p.manufacturer?.companyName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" min={1} value={formStock} onChange={(e) => setFormStock(parseInt(e.target.value, 10) || 0)} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" min={0} step={0.01} value={formPrice} onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)} className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={formSourceType} onValueChange={(v) => setFormSourceType(v as StockSourceType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formUnit} onValueChange={(v) => setFormUnit(v as StockUnit)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Batch Number (optional)</Label>
              <Input value={formBatchNumber} onChange={(e) => setFormBatchNumber(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input type="number" min={0} value={formLowStockThreshold} onChange={(e) => setFormLowStockThreshold(parseInt(e.target.value, 10) || 0)} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!formProductId || formPrice <= 0 || addProduct.isPending}>
              {addProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editEntry && <p className="text-sm text-muted-foreground">{editEntry.product?.productName}</p>}
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" min={0} value={formStock} onChange={(e) => setFormStock(parseInt(e.target.value, 10) || 0)} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" min={0} step={0.01} value={formPrice} onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input type="number" min={0} value={formLowStockThreshold} onChange={(e) => setFormLowStockThreshold(parseInt(e.target.value, 10) || 0)} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateProduct.isPending}>
              {updateProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.product?.productName}</strong> from this inventory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground" disabled={deleteProduct.isPending}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
