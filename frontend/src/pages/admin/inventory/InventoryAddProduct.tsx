import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventory } from "@/hooks/useInventory";
import { useProductList, useProduct } from "@/hooks/useProducts";
import { useAddInventoryProductBatch } from "@/hooks/useInventory";
import type { StockUnit, StockSourceType } from "@/types/inventory";
import type { ProductSize } from "@/types/product";
import { toast } from "sonner";

const STOCK_UNITS: StockUnit[] = ["KG", "G", "L", "ML", "PACK", "BAG", "BOTTLE", "QUANTAL"];
const SOURCE_TYPES: StockSourceType[] = ["MANUFACTURER", "OTHER"];

interface BatchRow {
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  stock: number;
  unit: StockUnit;
  price: number;
  gstInclusive: boolean;
  discount: string;
}

const defaultBatchRow = (): BatchRow => ({
  batchNumber: "",
  mfgDate: "",
  expiryDate: "",
  stock: 1,
  unit: "BOTTLE",
  price: 0,
  gstInclusive: false,
  discount: "",
});

export default function InventoryAddProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inventory, isLoading: invLoading } = useInventory(id);
  const { data: productsRes } = useProductList({ limit: 500, status: "ACTIVE" });
  const products = productsRes?.data ?? [];

  const [productId, setProductId] = useState("");
  const [productSizeId, setProductSizeId] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<StockSourceType>("MANUFACTURER");
  const [purchasedFrom, setPurchasedFrom] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [mrp, setMrp] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [batches, setBatches] = useState<BatchRow[]>([defaultBatchRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const { data: selectedProduct } = useProduct(productId || undefined);
  const sizes: ProductSize[] = selectedProduct?.sizes ?? [];
  const defaultUnitFromSize = useMemo((): StockUnit => {
    if (sizes.length && productSizeId) {
      const s = sizes.find((x) => x.id === productSizeId);
      if (s?.unit && STOCK_UNITS.includes(s.unit as StockUnit)) return s.unit as StockUnit;
    }
    if (sizes.length && sizes[0].unit && STOCK_UNITS.includes(sizes[0].unit as StockUnit))
      return sizes[0].unit as StockUnit;
    return "BOTTLE";
  }, [sizes, productSizeId]);

  const addBatch = () => setBatches((b) => [...b, defaultBatchRow()]);
  const removeBatch = (index: number) => {
    if (batches.length <= 1) return;
    setBatches((b) => b.filter((_, i) => i !== index));
  };
  const updateBatch = (index: number, field: keyof BatchRow, value: BatchRow[keyof BatchRow]) => {
    setBatches((b) => {
      const next = [...b];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const totalQuantity = useMemo(
    () => batches.reduce((sum, b) => sum + (Number.isFinite(b.stock) ? b.stock : 0), 0),
    [batches]
  );
  const totalValue = useMemo(
    () =>
      batches.reduce(
        (sum, b) => sum + (Number.isFinite(b.stock) && Number.isFinite(b.price) ? b.stock * b.price : 0),
        0
      ),
    [batches]
  );

  const addBatchMutation = useAddInventoryProductBatch();

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!productId) {
      next.productId = "Please select a product";
    }
    if (batches.length === 0) {
      next.batches = "Add at least one batch";
    }
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (!(b.batchNumber?.trim())) {
        next[`batch_${i}_batchNumber`] = "Batch number is required";
      }
      if (!Number.isFinite(b.stock) || b.stock < 1) {
        next[`batch_${i}_stock`] = "Quantity must be at least 1";
      }
      if (!Number.isFinite(b.price) || b.price <= 0) {
        next[`batch_${i}_price`] = "Purchase price must be greater than 0";
      }
      const mfg = b.mfgDate ? new Date(b.mfgDate).getTime() : null;
      const exp = b.expiryDate ? new Date(b.expiryDate).getTime() : null;
      if (mfg != null && exp != null && exp <= mfg) {
        next[`batch_${i}_dates`] = "Expiry date must be after manufacturing date";
      }
    }
    const mrpNum = mrp ? parseFloat(mrp) : null;
    const sellNum = sellingPrice ? parseFloat(sellingPrice) : null;
    if (mrpNum != null && sellNum != null && mrpNum < sellNum) {
      next.mrpSelling = "MRP is less than selling price";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.values(next)[0];
      if (first) toast.error(first);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!id || !validate()) return;

    const payload = {
      productId,
      productSizeId: productSizeId || undefined,
      sourceType,
      purchasedFrom: purchasedFrom.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      invoiceDate: invoiceDate.trim() || undefined,
      mrp: mrp ? parseFloat(mrp) : undefined,
      sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
      lowStockThreshold,
      batches: batches.map((b) => ({
        batchNumber: b.batchNumber.trim(),
        mfgDate: b.mfgDate.trim() || undefined,
        expiryDate: b.expiryDate.trim() || undefined,
        stock: b.stock,
        unit: b.unit,
        price: b.price,
        gstInclusive: b.gstInclusive,
        discount: b.discount ? parseFloat(b.discount) : undefined,
      })),
    };

    addBatchMutation.mutate(
      { inventoryId: id, payload },
      {
        onSuccess: () => navigate(`/dashboard/admin/inventory/${id}/products`),
      }
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

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate(`/dashboard/admin/inventory/${id}/products`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Add Product to Inventory</h1>
          <p className="text-sm text-muted-foreground">{inventory.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={(v) => { setProductId(v); setProductSizeId(null); clearError("productId"); }}>
              <SelectTrigger className={`h-9 ${errors.productId ? "border-destructive" : ""}`}>
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
            {errors.productId && <p className="text-xs text-destructive">{errors.productId}</p>}
          </div>
          {sizes.length > 0 && (
            <div className="space-y-2">
              <Label>Size variant</Label>
              <Select
                value={productSizeId ?? "none"}
                onValueChange={(v) => {
                  setProductSizeId(v === "none" ? null : v);
                  setBatches((prev) =>
                    prev.map((b) => ({ ...b, unit: (v === "none" ? defaultUnitFromSize : (sizes.find((s) => s.id === v)?.unit as StockUnit)) || b.unit }))
                  );
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select size (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific size</SelectItem>
                  {sizes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.quantity} {s.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice number</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Optional"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Purchased from</Label>
            <Input
              value={purchasedFrom}
              onChange={(e) => setPurchasedFrom(e.target.value)}
              placeholder="Supplier name (optional)"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label>Source type</Label>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as StockSourceType)}>
              <SelectTrigger className="h-9 w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>MRP (₹/unit)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={mrp}
                onChange={(e) => { setMrp(e.target.value); clearError("mrpSelling"); }}
                placeholder="Optional"
                className={`h-9 ${errors.mrpSelling ? "border-destructive" : ""}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Selling price (₹/unit)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={sellingPrice}
                onChange={(e) => { setSellingPrice(e.target.value); clearError("mrpSelling"); }}
                placeholder="Optional"
                className={`h-9 ${errors.mrpSelling ? "border-destructive" : ""}`}
              />
              {errors.mrpSelling && <p className="text-xs text-destructive">{errors.mrpSelling}</p>}
            </div>
            <div className="space-y-2">
              <Label>Low stock threshold</Label>
              <Input
                type="number"
                min={0}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Batch information & pricing</CardTitle>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={addBatch}>
            <Plus className="h-4 w-4 mr-1" />
            Add batch
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add multiple batches with quantities and purchase prices.
          </p>
          <div className="space-y-4">
            {batches.map((batch, index) => (
              <div
                key={index}
                className="rounded-lg border p-4 space-y-3 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Batch {index + 1}</span>
                  {batches.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeBatch(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label>Batch number *</Label>
                    <Input
                      value={batch.batchNumber}
                      onChange={(e) => {
                        updateBatch(index, "batchNumber", e.target.value);
                        clearError(`batch_${index}_batchNumber`);
                      }}
                      placeholder="e.g. BATCH-2024-001"
                      className={`h-9 ${errors[`batch_${index}_batchNumber`] ? "border-destructive" : ""}`}
                    />
                    {errors[`batch_${index}_batchNumber`] && <p className="text-xs text-destructive">{errors[`batch_${index}_batchNumber`]}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Mfg date</Label>
                    <Input
                      type="date"
                      value={batch.mfgDate}
                      onChange={(e) => {
                        updateBatch(index, "mfgDate", e.target.value);
                        clearError(`batch_${index}_dates`);
                      }}
                      className={`h-9 ${errors[`batch_${index}_dates`] ? "border-destructive" : ""}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={batch.expiryDate}
                      onChange={(e) => {
                        updateBatch(index, "expiryDate", e.target.value);
                        clearError(`batch_${index}_dates`);
                      }}
                      className={`h-9 ${errors[`batch_${index}_dates`] ? "border-destructive" : ""}`}
                    />
                    {errors[`batch_${index}_dates`] && <p className="text-xs text-destructive">{errors[`batch_${index}_dates`]}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={batch.stock}
                      onChange={(e) => {
                        updateBatch(index, "stock", parseInt(e.target.value, 10) || 0);
                        clearError(`batch_${index}_stock`);
                      }}
                      className={`h-9 ${errors[`batch_${index}_stock`] ? "border-destructive" : ""}`}
                    />
                    {errors[`batch_${index}_stock`] && <p className="text-xs text-destructive">{errors[`batch_${index}_stock`]}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Unit *</Label>
                    <Select
                      value={batch.unit}
                      onValueChange={(v) => updateBatch(index, "unit", v as StockUnit)}
                    >
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
                  <div className="space-y-1">
                    <Label>Purchase price (₹/unit) *</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={batch.price || ""}
                      onChange={(e) => {
                        updateBatch(index, "price", parseFloat(e.target.value) || 0);
                        clearError(`batch_${index}_price`);
                      }}
                      className={`h-9 ${errors[`batch_${index}_price`] ? "border-destructive" : ""}`}
                    />
                    {errors[`batch_${index}_price`] && <p className="text-xs text-destructive">{errors[`batch_${index}_price`]}</p>}
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <Label>GST</Label>
                    <Select
                      value={batch.gstInclusive ? "inclusive" : "exclusive"}
                      onValueChange={(v) => updateBatch(index, "gstInclusive", v === "inclusive")}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exclusive">Exclusive GST</SelectItem>
                        <SelectItem value="inclusive">Inclusive GST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Discount %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={batch.discount}
                      onChange={(e) => updateBatch(index, "discount", e.target.value)}
                      placeholder="Optional"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Total quantity: <span className="font-medium text-foreground">{totalQuantity} units</span>
            {batches.length > 1 && ` (${batches.length} batches)`}
          </p>
          <p className="text-sm text-muted-foreground">
            Total purchase value: <span className="font-medium text-foreground">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(`/dashboard/admin/inventory/${id}/products`)}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!productId || batches.some((b) => !b.batchNumber?.trim() || b.stock < 1 || b.price <= 0) || addBatchMutation.isPending}
        >
          {addBatchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save
        </Button>
      </div>
    </div>
  );
}
