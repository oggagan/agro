import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProduct, useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useManufacturerList } from "@/hooks/useManufacturers";
import { PREDEFINED_CROPS } from "@/constants/crops";
import type { ProductType, DoseUnit, CreateProductPayload } from "@/types/product";

const PRODUCT_TYPES: ProductType[] = [
  "PESTICIDE", "FUNGICIDE", "PGR", "NPK", "FERTILIZER",
  "BIO_PESTICIDE", "BIO_FUNGICIDE", "BIO_PGR", "BIO_FERTILIZER",
];

const DOSE_UNITS: DoseUnit[] = ["PER_ACRE", "PER_HECTARE"];
const SIZE_UNITS = ["ml", "L", "kg", "g"];

const emptySize = () => ({ quantity: "", unit: "ml", bottlesPerCase: 1 });

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: product, isLoading } = useProduct(id);
  const { data: manufacturersRes } = useManufacturerList({ limit: 500 });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [manufacturerId, setManufacturerId] = useState("");
  const [productType, setProductType] = useState<ProductType>("PESTICIDE");
  const [productName, setProductName] = useState("");
  const [technicalName, setTechnicalName] = useState("");
  const [description, setDescription] = useState("");
  const [cirNumber, setCirNumber] = useState("");
  const [gstPercentage, setGstPercentage] = useState<number>(5);
  const [hsnCode, setHsnCode] = useState("");
  const [recommendedDose, setRecommendedDose] = useState("");
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("PER_ACRE");
  const [sizes, setSizes] = useState<{ quantity: string; unit: string; bottlesPerCase: number }[]>([emptySize()]);
  const [crops, setCrops] = useState<{ cropName: string; isCustom: boolean }[]>([]);
  const [customCrop, setCustomCrop] = useState("");
  const [initialized, setInitialized] = useState(false);

  const manufacturers = manufacturersRes?.data ?? [];

  useEffect(() => {
    if (isEdit && product && !initialized) {
      setManufacturerId(product.manufacturerId);
      setProductType(product.productType);
      setProductName(product.productName);
      setTechnicalName(product.technicalName);
      setDescription(product.description);
      setCirNumber(product.cirNumber ?? "");
      setGstPercentage(Number(product.gstPercentage));
      setHsnCode(product.hsnCode);
      setRecommendedDose(product.recommendedDose);
      setDoseUnit(product.doseUnit);
      setSizes(
        product.sizes?.length
          ? product.sizes.map((s) => ({
              quantity: s.quantity,
              unit: s.unit,
              bottlesPerCase: s.bottlesPerCase,
            }))
          : [emptySize()]
      );
      setCrops(product.crops?.map((c) => ({ cropName: c.cropName, isCustom: c.isCustom })) ?? []);
      setInitialized(true);
    }
  }, [isEdit, product, initialized]);

  const addSize = () => setSizes((s) => [...s, emptySize()]);
  const removeSize = (i: number) => setSizes((s) => s.filter((_, idx) => idx !== i));
  const updateSize = (i: number, field: string, value: string | number) => {
    setSizes((s) => {
      const next = [...s];
      (next[i] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const addCrop = (cropName: string, isCustom: boolean) => {
    if (!cropName.trim()) return;
    if (crops.some((c) => c.cropName === cropName.trim())) return;
    setCrops((c) => [...c, { cropName: cropName.trim(), isCustom }]);
    setCustomCrop("");
  };
  const removeCrop = (cropName: string) => setCrops((c) => c.filter((x) => x.cropName !== cropName));

  const mfrId = manufacturerId || (product?.manufacturerId ?? "");
  const buildPayload = (isDraft: boolean): CreateProductPayload => ({
    manufacturerId: mfrId,
    productType,
    productName: productName.trim(),
    technicalName: technicalName.trim(),
    manufacturedById: mfrId,
    marketedById: mfrId,
    description: description.trim(),
    cirNumber: cirNumber.trim() || undefined,
    gstPercentage,
    hsnCode: hsnCode.trim(),
    recommendedDose: recommendedDose.trim(),
    doseUnit,
    sizes: sizes.map((s) => ({
      quantity: String(s.quantity).trim(),
      unit: s.unit,
      bottlesPerCase: Number(s.bottlesPerCase) || 1,
    })),
    crops: crops.length ? crops.map((c) => ({ cropName: c.cropName, isCustom: c.isCustom })) : [{ cropName: "General", isCustom: true }],
    isDraft,
  });

  const handleSubmit = (isDraft: boolean) => {
    if (!productName.trim() || !technicalName.trim() || !description.trim() || !hsnCode.trim() || !recommendedDose) {
      if (!isDraft) return;
    }
    if (!isDraft && (!manufacturerId || sizes.some((s) => !s.quantity.trim() || !s.unit))) return;
    if (!isDraft && crops.length === 0) addCrop("General", true);

    const payload = buildPayload(isDraft);
    if (isEdit) {
      updateProduct.mutate(
        {
          id: id!,
          payload: {
            productName: payload.productName,
            technicalName: payload.technicalName,
            description: payload.description,
            cirNumber: payload.cirNumber,
            gstPercentage: payload.gstPercentage,
            hsnCode: payload.hsnCode,
            recommendedDose: payload.recommendedDose,
            doseUnit: payload.doseUnit,
            sizes: payload.sizes,
            crops: payload.crops,
          },
        },
        { onSuccess: () => navigate("/dashboard/admin/products") }
      );
    } else {
      createProduct.mutate(payload, { onSuccess: () => navigate("/dashboard/admin/products") });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="h-9 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/dashboard/admin/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {isEdit ? "Edit Product" : "Add Product"}
        </h1>
      </div>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Manufacturer & Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-normal text-sm">Manufacturing Company</Label>
              <Select
                value={manufacturerId}
                onValueChange={setManufacturerId}
                disabled={isEdit}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground font-normal text-sm">Product Type</Label>
              <Select value={productType} onValueChange={(v) => setProductType(v as ProductType)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Basic Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">Product Name</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">Technical Name</Label>
              <Input value={technicalName} onChange={(e) => setTechnicalName(e.target.value)} placeholder="Technical name" className="h-9" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-muted-foreground font-normal text-sm">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">CIR Number (optional)</Label>
              <Input value={cirNumber} onChange={(e) => setCirNumber(e.target.value)} placeholder="CIR Number" className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Product Sizes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sizes.map((size, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <Input
                placeholder="Quantity"
                className="h-9 w-24"
                value={size.quantity}
                onChange={(e) => updateSize(i, "quantity", e.target.value)}
              />
              <Select value={size.unit} onValueChange={(v) => updateSize(i, "unit", v)}>
                <SelectTrigger className="h-9 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                placeholder="Bottles/case"
                className="h-9 w-28"
                value={size.bottlesPerCase}
                onChange={(e) => updateSize(i, "bottlesPerCase", parseInt(e.target.value, 10) || 1)}
              />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeSize(i)} disabled={sizes.length <= 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={addSize}>
            <Plus className="h-4 w-4 mr-2" />
            Add Size
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Tax & Dosage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">GST %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={gstPercentage}
                onChange={(e) => setGstPercentage(parseFloat(e.target.value) || 0)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">HSN Code</Label>
              <Input value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} placeholder="HSN Code" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">Recommended Dose</Label>
              <Input value={recommendedDose} onChange={(e) => setRecommendedDose(e.target.value)} placeholder="e.g. 100ml" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">Dose Unit</Label>
              <Select value={doseUnit} onValueChange={(v) => setDoseUnit(v as DoseUnit)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOSE_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Recommended Crops</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_CROPS.slice(0, 12).map((name) => (
              <Button
                key={name}
                type="button"
                variant={crops.some((c) => c.cropName === name) ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => (crops.some((c) => c.cropName === name) ? removeCrop(name) : addCrop(name, false))}
              >
                {name}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add custom crop"
              className="h-9 flex-1 max-w-xs"
              value={customCrop}
              onChange={(e) => setCustomCrop(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCrop(customCrop, true))}
            />
            <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => addCrop(customCrop, true)}>
              Add
            </Button>
          </div>
          {crops.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {crops.map((c) => (
                <span key={c.cropName} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                  {c.cropName}
                  <button type="button" onClick={() => removeCrop(c.cropName)} className="hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {!isEdit && (
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={createProduct.isPending}>
            {createProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save as Draft
          </Button>
        )}
        <Button className="bg-gradient-primary" onClick={() => handleSubmit(false)} disabled={createProduct.isPending || updateProduct.isPending}>
          {(createProduct.isPending || updateProduct.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <Save className="h-4 w-4 mr-2" />
          {isEdit ? "Save" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
