import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Edit, Trash2, Package, Loader2, Eye } from "lucide-react";
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
import { useInventory, useInventoryProducts, useUpdateInventoryProduct, useDeleteInventoryProduct } from "@/hooks/useInventory";
import type { InventoryProduct, StockUnit, StockSourceType } from "@/types/inventory";

const STOCK_UNITS: StockUnit[] = ["KG", "G", "L", "ML", "PACK", "BAG", "BOTTLE", "QUANTAL"];
const SOURCE_TYPES: StockSourceType[] = ["MANUFACTURER", "OTHER"];

const statusStyles: Record<string, string> = {
  IN_STOCK: "bg-green-600/10 text-green-700 border-green-200",
  LOW_STOCK: "bg-amber-500/10 text-amber-800 border-amber-200",
  OUT_OF_STOCK: "bg-destructive/10 text-destructive border-destructive/20",
};

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function InventoryProducts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [viewEntry, setViewEntry] = useState<InventoryProduct | null>(null);
  const [editEntry, setEditEntry] = useState<InventoryProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryProduct | null>(null);

  const { data: inventory, isLoading: invLoading } = useInventory(id);
  const { data: response, isLoading } = useInventoryProducts(id, { page, limit: 10, search: search || undefined, status: statusFilter !== "all" ? statusFilter as "inStock" | "lowStock" | "outOfStock" : undefined });
  const updateProduct = useUpdateInventoryProduct();
  const deleteProduct = useDeleteInventoryProduct();

  const inventoryProducts: InventoryProduct[] = response?.data ?? [];
  const meta = response?.meta;

  const [formStock, setFormStock] = useState(1);
  const [formUnit, setFormUnit] = useState<StockUnit>("BOTTLE");
  const [formPrice, setFormPrice] = useState(0);
  const [formGstInclusive, setFormGstInclusive] = useState(false);
  const [formMrp, setFormMrp] = useState<string>("");
  const [formSellingPrice, setFormSellingPrice] = useState<string>("");
  const [formDiscount, setFormDiscount] = useState<string>("");
  const [formSourceType, setFormSourceType] = useState<StockSourceType>("MANUFACTURER");
  const [formBatchNumber, setFormBatchNumber] = useState("");
  const [formMfgDate, setFormMfgDate] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formPurchasedFrom, setFormPurchasedFrom] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formInvoiceDate, setFormInvoiceDate] = useState("");
  const [formLowStockThreshold, setFormLowStockThreshold] = useState(10);

  const resetForm = () => {
    setFormStock(1);
    setFormUnit("BOTTLE");
    setFormPrice(0);
    setFormGstInclusive(false);
    setFormMrp("");
    setFormSellingPrice("");
    setFormDiscount("");
    setFormSourceType("MANUFACTURER");
    setFormBatchNumber("");
    setFormMfgDate("");
    setFormExpiryDate("");
    setFormPurchasedFrom("");
    setFormInvoiceNumber("");
    setFormInvoiceDate("");
    setFormLowStockThreshold(10);
  };

  const handleEdit = () => {
    if (!id || !editEntry) return;
    const payload: Record<string, unknown> = {
      stock: formStock,
      unit: formUnit,
      price: formPrice,
      gstInclusive: formGstInclusive,
      lowStockThreshold: formLowStockThreshold,
      sourceType: formSourceType,
      batchNumber: formBatchNumber.trim() || null,
      mfgDate: formMfgDate || null,
      expiryDate: formExpiryDate || null,
      purchasedFrom: formPurchasedFrom.trim() || null,
      invoiceNumber: formInvoiceNumber.trim() || null,
      invoiceDate: formInvoiceDate || null,
      discount: formDiscount !== "" ? parseFloat(formDiscount) : null,
    };
    if (formMrp !== "") payload.mrp = parseFloat(formMrp);
    if (formSellingPrice !== "") payload.sellingPrice = parseFloat(formSellingPrice);
    updateProduct.mutate(
      {
        inventoryId: id,
        inventoryProductId: editEntry.id,
        payload: payload as Parameters<typeof updateProduct.mutate>[0]["payload"],
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
    setFormUnit(entry.unit);
    setFormPrice(Number(entry.price));
    setFormGstInclusive(entry.gstInclusive === true);
    setFormMrp(entry.mrp != null ? String(entry.mrp) : "");
    setFormSellingPrice(entry.sellingPrice != null ? String(entry.sellingPrice) : "");
    setFormDiscount(entry.discount != null ? String(entry.discount) : "");
    setFormSourceType(entry.sourceType);
    setFormBatchNumber(entry.batchNumber ?? "");
    setFormMfgDate(entry.mfgDate ? new Date(entry.mfgDate).toISOString().slice(0, 10) : "");
    setFormExpiryDate(entry.expiryDate ? new Date(entry.expiryDate).toISOString().slice(0, 10) : "");
    setFormPurchasedFrom(entry.purchasedFrom ?? "");
    setFormInvoiceNumber(entry.invoiceNumber ?? "");
    setFormInvoiceDate(entry.invoiceDate ? new Date(entry.invoiceDate).toISOString().slice(0, 10) : "");
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
        <Button className="bg-gradient-primary h-10" onClick={() => navigate(`/dashboard/admin/inventory/${id}/products/add`)}>
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
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Batch</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Stock</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Price (₹)</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">MRP (₹)</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Selling (₹)</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right w-[130px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-14 text-muted-foreground">
                        <Package className="h-9 w-9 mx-auto mb-2 opacity-40" />
                        <p>No products in this inventory. Add a product to get started.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventoryProducts.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell className="font-medium py-3">{ip.product?.productName ?? "—"}</TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">{ip.product?.manufacturer?.companyName ?? "—"}</TableCell>
                        <TableCell className="py-3 text-sm">{ip.batchNumber ?? "—"}</TableCell>
                        <TableCell className="py-3">{ip.stock} {ip.unit}</TableCell>
                        <TableCell className="py-3">₹{Number(ip.price).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="py-3">{ip.mrp != null ? `₹${Number(ip.mrp).toLocaleString("en-IN")}` : "—"}</TableCell>
                        <TableCell className="py-3">{ip.sellingPrice != null ? `₹${Number(ip.sellingPrice).toLocaleString("en-IN")}` : "—"}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`text-xs ${statusStyles[ip.computedStatus ?? ""] ?? ""}`}>
                            {ip.computedStatus?.replace("_", " ") ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewEntry(ip)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ip)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(ip)} title="Delete">
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

      <Dialog open={!!viewEntry} onOpenChange={(open) => !open && setViewEntry(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inventory product details</DialogTitle>
          </DialogHeader>
          {viewEntry && (
            <>
              <div className="grid grid-cols-3 gap-x-6 gap-y-3 py-4 text-sm">
                <div className="col-span-3 font-medium text-foreground text-base">{viewEntry.product?.productName}</div>
                <div className="text-muted-foreground">Company</div>
                <div className="col-span-2">{viewEntry.product?.manufacturer?.companyName ?? "—"}</div>
                <div className="text-muted-foreground">Technical name</div>
                <div className="col-span-2">{viewEntry.product?.technicalName ?? "—"}</div>
                <div className="text-muted-foreground">Stock</div>
                <div>{viewEntry.stock} {viewEntry.unit}</div>
                <div className="text-muted-foreground">Status</div>
                <div>
                  <Badge variant="outline" className={`text-xs ${statusStyles[viewEntry.computedStatus ?? ""] ?? ""}`}>
                    {viewEntry.computedStatus?.replace("_", " ") ?? "—"}
                  </Badge>
                </div>
                <div className="text-muted-foreground">Low stock threshold</div>
                <div>{viewEntry.lowStockThreshold}</div>
                <div className="text-muted-foreground">Purchase price (₹)</div>
                <div>₹{Number(viewEntry.price).toLocaleString("en-IN")}</div>
                <div className="text-muted-foreground">MRP (₹)</div>
                <div>{viewEntry.mrp != null ? `₹${Number(viewEntry.mrp).toLocaleString("en-IN")}` : "—"}</div>
                <div className="text-muted-foreground">Selling price (₹)</div>
                <div>{viewEntry.sellingPrice != null ? `₹${Number(viewEntry.sellingPrice).toLocaleString("en-IN")}` : "—"}</div>
                <div className="text-muted-foreground">Average cost (₹)</div>
                <div>{viewEntry.averageCost != null ? `₹${Number(viewEntry.averageCost).toLocaleString("en-IN")}` : "—"}</div>
                <div className="text-muted-foreground">Discount %</div>
                <div>{viewEntry.discount != null ? `${Number(viewEntry.discount)}%` : "—"}</div>
                <div className="text-muted-foreground">GST type</div>
                <div>{viewEntry.gstInclusive ? "Inclusive GST" : "Exclusive GST"}</div>
                <div className="text-muted-foreground">Batch number</div>
                <div>{viewEntry.batchNumber ?? "—"}</div>
                <div className="text-muted-foreground">Mfg date</div>
                <div>{formatDate(viewEntry.mfgDate)}</div>
                <div className="text-muted-foreground">Expiry date</div>
                <div>{formatDate(viewEntry.expiryDate)}</div>
                <div className="text-muted-foreground">Source type</div>
                <div>{viewEntry.sourceType ?? "—"}</div>
                <div className="text-muted-foreground">Purchased from</div>
                <div className="col-span-2">{viewEntry.purchasedFrom ?? "—"}</div>
                <div className="text-muted-foreground">Invoice number</div>
                <div>{viewEntry.invoiceNumber ?? "—"}</div>
                <div className="text-muted-foreground">Invoice date</div>
                <div>{formatDate(viewEntry.invoiceDate)}</div>
              </div>
              {(() => {
                const otherBatches = inventoryProducts.filter(
                  (p) => p.productId === viewEntry.productId && p.id !== viewEntry.id
                );
                if (otherBatches.length > 0) {
                  return (
                    <div className="border-t pt-4 mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Other batches for this product ({otherBatches.length})</p>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="h-8 text-xs">Batch</TableHead>
                              <TableHead className="h-8 text-xs">Stock</TableHead>
                              <TableHead className="h-8 text-xs">Expiry</TableHead>
                              <TableHead className="h-8 text-xs">Status</TableHead>
                              <TableHead className="h-8 text-xs text-right w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {otherBatches.map((ob) => (
                              <TableRow key={ob.id} className="text-sm">
                                <TableCell className="py-2">{ob.batchNumber ?? "—"}</TableCell>
                                <TableCell className="py-2">{ob.stock} {ob.unit}</TableCell>
                                <TableCell className="py-2">{formatDate(ob.expiryDate)}</TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="outline" className={`text-xs ${statusStyles[ob.computedStatus ?? ""] ?? ""}`}>
                                    {ob.computedStatus?.replace("_", " ") ?? "—"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewEntry(ob)} title="View this batch">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewEntry(null); openEdit(ob); }} title="Edit">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewEntry(null)}>Close</Button>
            {viewEntry && (
              <Button onClick={() => { setViewEntry(null); openEdit(viewEntry); }}>
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit stock & pricing</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {editEntry && <p className="text-sm text-muted-foreground font-medium mb-4">{editEntry.product?.productName}</p>}
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" min={0} value={formStock} onChange={(e) => setFormStock(parseInt(e.target.value, 10) || 0)} className="h-9" />
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
              <div className="space-y-2">
                <Label>Purchase price (₹)</Label>
                <Input type="number" min={0} step={0.01} value={formPrice} onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>GST type</Label>
                <Select value={formGstInclusive ? "inclusive" : "exclusive"} onValueChange={(v) => setFormGstInclusive(v === "inclusive")}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusive GST</SelectItem>
                    <SelectItem value="inclusive">Inclusive GST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>MRP (₹)</Label>
                <Input type="number" min={0} step={0.01} value={formMrp} onChange={(e) => setFormMrp(e.target.value)} placeholder="Optional" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Selling price (₹)</Label>
                <Input type="number" min={0} step={0.01} value={formSellingPrice} onChange={(e) => setFormSellingPrice(e.target.value)} placeholder="Optional" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Discount %</Label>
                <Input type="number" min={0} max={100} step={0.01} value={formDiscount} onChange={(e) => setFormDiscount(e.target.value)} placeholder="Optional" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Source type</Label>
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
                <Label>Low stock threshold</Label>
                <Input type="number" min={0} value={formLowStockThreshold} onChange={(e) => setFormLowStockThreshold(parseInt(e.target.value, 10) || 0)} className="h-9" />
              </div>
              <div className="space-y-2 col-span-3">
                <Label>Batch number</Label>
                <Input value={formBatchNumber} onChange={(e) => setFormBatchNumber(e.target.value)} placeholder="Optional" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Mfg date</Label>
                <Input type="date" value={formMfgDate} onChange={(e) => setFormMfgDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Expiry date</Label>
                <Input type="date" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Invoice date</Label>
                <Input type="date" value={formInvoiceDate} onChange={(e) => setFormInvoiceDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Purchased from</Label>
                <Input value={formPurchasedFrom} onChange={(e) => setFormPurchasedFrom(e.target.value)} placeholder="Optional" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Invoice number</Label>
                <Input value={formInvoiceNumber} onChange={(e) => setFormInvoiceNumber(e.target.value)} placeholder="Optional" className="h-9" />
              </div>
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
