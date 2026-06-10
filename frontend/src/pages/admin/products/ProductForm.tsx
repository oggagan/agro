import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProduct, useCreateProduct, useUpdateProduct, useUploadProductDocuments, useDeleteProductDocument } from "@/hooks/useProducts";
import { useManufacturerList } from "@/hooks/useManufacturers";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PREDEFINED_CROPS } from "@/constants/crops";
import InlineDocUpload from "@/components/shared/InlineDocUpload";
import { productsApi } from "@/api/products.api";
import type { ProductType, DoseUnit, CreateProductPayload } from "@/types/product";

const PRODUCT_TYPES: ProductType[] = [
  "PESTICIDE", "FUNGICIDE", "HERBICIDE", "BACTERIACIDE", "PGR", "NPK", "FERTILIZER",
  "BIO_PESTICIDE", "BIO_FUNGICIDE", "BIO_PGR", "BIO_FERTILIZER",
];

const DOSE_UNITS: DoseUnit[] = ["PER_ACRE", "PER_HECTARE", "PER_LITER_WATER"];
const SIZE_UNITS = ["ml", "L", "kg", "g"];

const emptySize = () => ({ quantity: "", unit: "ml", bottlesPerCase: 1 });

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: product, isLoading } = useProduct(id);
  const { data: manufacturersRes } = useManufacturerList({ limit: 500 });
  const queryClient = useQueryClient();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const uploadDocs = useUploadProductDocuments();
  const deleteDocs = useDeleteProductDocument();

  const [manufacturerId, setManufacturerId] = useState("");
  const [manufacturedById, setManufacturedById] = useState("");
  const [marketedById, setMarketedById] = useState("");
  const [productType, setProductType] = useState<ProductType>("PESTICIDE");
  const [productName, setProductName] = useState("");
  const [technicalName, setTechnicalName] = useState("");
  const [description, setDescription] = useState("");
  const [cirNumber, setCirNumber] = useState("");
  const [gstPercentage, setGstPercentage] = useState<number>(5);
  const [hsnCode, setHsnCode] = useState("");
  const [recommendedDose, setRecommendedDose] = useState("");
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("PER_ACRE");
  const [dosePerLiter, setDosePerLiter] = useState("");
  const [sizes, setSizes] = useState<{ quantity: string; unit: string; bottlesPerCase: number }[]>([emptySize()]);
  const [crops, setCrops] = useState<{ cropName: string; isCustom: boolean }[]>([]);
  const [customCrop, setCustomCrop] = useState("");
  const [cropSearch, setCropSearch] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [productPhotos, setProductPhotos] = useState<File[]>([]);
  const [pamphletFile, setPamphletFile] = useState<File | null>(null);
  const [antidoteFile, setAntidoteFile] = useState<File | null>(null);
  const [sizePackagingFiles, setSizePackagingFiles] = useState<File[][]>([[]]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);

  const clearError = (field: string) => {
    setErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const manufacturers = manufacturersRes?.data ?? [];

  const existingPhotoDocs = isEdit && product?.documents ? product.documents.filter((d) => d.docType === "product_photo") : [];
  const existingPamphletDocs = isEdit && product?.documents ? product.documents.filter((d) => d.docType === "product_pamphlet") : [];
  const existingAntidoteDocs = isEdit && product?.documents ? product.documents.filter((d) => d.docType === "product_antidote") : [];
  const totalPhotoCount = existingPhotoDocs.length + productPhotos.length;

  useEffect(() => {
    if (isEdit && product && !initialized) {
      setManufacturerId(product.manufacturerId);
      setManufacturedById(product.manufacturedById);
      setMarketedById(product.marketedById ?? product.manufacturedById);
      setProductType(product.productType);
      setProductName(product.productName);
      setTechnicalName(product.technicalName);
      setDescription(product.description);
      setCirNumber(product.cirNumber ?? "");
      setGstPercentage(Number(product.gstPercentage));
      setHsnCode(product.hsnCode);
      setRecommendedDose(product.recommendedDose);
      setDoseUnit(product.doseUnit);
      setDosePerLiter(product.dosePerLiter ?? "");
      setSizes(
        product.sizes?.length
          ? product.sizes.map((s) => ({
              quantity: s.quantity,
              unit: s.unit,
              bottlesPerCase: s.bottlesPerCase,
            }))
          : [emptySize()]
      );
      setSizePackagingFiles(product.sizes?.map(() => []) ?? []);
      setCrops(product.crops?.map((c) => ({ cropName: c.cropName, isCustom: c.isCustom })) ?? []);
      setInitialized(true);
    }
  }, [isEdit, product, initialized]);

  useEffect(() => {
    if (!isEdit && manufacturerId) {
      setManufacturedById(manufacturerId);
      setMarketedById(manufacturerId);
    }
  }, [manufacturerId, isEdit]);

  const addSize = () => {
    setSizes((s) => [...s, emptySize()]);
    setSizePackagingFiles((p) => [...p, []]);
  };
  const removeSize = (i: number) => {
    setSizes((s) => s.filter((_, idx) => idx !== i));
    setSizePackagingFiles((p) => p.filter((_, idx) => idx !== i));
  };
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
    manufacturedById: manufacturedById || mfrId,
    marketedById: marketedById || mfrId,
    description: description.trim() || undefined,
    cirNumber: cirNumber.trim() || undefined,
    gstPercentage,
    hsnCode: hsnCode.trim(),
    recommendedDose: recommendedDose.trim(),
    doseUnit,
    dosePerLiter: dosePerLiter.trim() || undefined,
    sizes: sizes.map((s) => ({
      quantity: String(s.quantity).trim(),
      unit: s.unit,
      bottlesPerCase: Number(s.bottlesPerCase) || 1,
    })),
    crops: crops.length ? crops.map((c) => ({ cropName: c.cropName, isCustom: c.isCustom })) : [{ cropName: "General", isCustom: true }],
    isDraft,
  });

  const handleSubmit = async (isDraft: boolean) => {
    setErrors({});
    if (!isDraft) {
      const next: Record<string, string> = {};
      if (!manufacturerId) {
        next.manufacturerId = "Please select a manufacturing company";
      }
      if (!productType) next.productType = "Please select product type";
      if (!productName.trim()) next.productName = "Product name is required";
      if (!technicalName.trim()) next.technicalName = "Technical name is required";
      const mfrId = manufacturerId || (product?.manufacturerId ?? "");
      if (!manufacturedById && !marketedById && !mfrId) {
        next.manufacturedById = "Please select manufactured by and marketed by";
      }
      if (gstPercentage === undefined || gstPercentage === null) next.gstPercentage = "Please enter GST percentage";
      if (!hsnCode.trim()) next.hsnCode = "HSN code is required";
      const existingPhotoCount = isEdit ? (product?.documents?.filter((d) => d.docType === "product_photo").length ?? 0) : 0;
      const totalPhotos = existingPhotoCount + productPhotos.length;
      if (totalPhotos < 3) next.productPhotos = "Please upload at least 3 product photos";
      if (totalPhotos > 4) next.productPhotos = "Maximum 4 product photos allowed";
      if (sizes.length < 1) next.sizes = "Please add at least one product size";
      for (let i = 0; i < sizes.length; i++) {
        const s = sizes[i];
        if (!s.quantity.trim() || !s.unit || s.bottlesPerCase == null) {
          next[`size_${i}`] = `Please fill in all fields for product size ${i + 1}`;
          break;
        }
      }
      if (!recommendedDose.trim()) next.recommendedDose = "Recommended dose is required";
      if (!doseUnit) next.doseUnit = "Please select dose unit";
      if (crops.length < 1) next.crops = "Please select at least one recommended crop";
      const needsCir = ["PESTICIDE", "FUNGICIDE", "HERBICIDE", "BACTERIACIDE"].includes(productType);
      if (needsCir && !cirNumber.trim()) next.cirNumber = "CIR number is required for this product type";
      if (Object.keys(next).length > 0) {
        setErrors(next);
        const first = Object.values(next)[0];
        if (first) toast.error(first);
        return;
      }
    } else {
      if (!productName.trim() || !technicalName.trim() || !hsnCode.trim() || !recommendedDose) {
        return;
      }
    }
    if (!isDraft && crops.length === 0) addCrop("General", true);

    const payload = buildPayload(isDraft);
    setSubmitting(true);
    try {
      let productId: string;
      if (isEdit) {
        await productsApi.update(id!, {
          productName: payload.productName,
          technicalName: payload.technicalName,
          manufacturedById: payload.manufacturedById,
          marketedById: payload.marketedById,
          description: payload.description,
          cirNumber: payload.cirNumber,
          gstPercentage: payload.gstPercentage,
          hsnCode: payload.hsnCode,
          recommendedDose: payload.recommendedDose,
          doseUnit: payload.doseUnit,
          dosePerLiter: payload.dosePerLiter,
          sizes: payload.sizes,
          crops: payload.crops,
        });
        productId = id!;
        if (!isDraft && productPhotos.length > 0) {
          await productsApi.uploadDocuments(productId, productPhotos, "product_photo");
        }
      } else {
        const res = await productsApi.create(payload);
        productId = res.data.id;
        if (!isDraft) {
          const uploads: Promise<unknown>[] = [];
          if (productPhotos.length > 0) {
            uploads.push(productsApi.uploadDocuments(productId, productPhotos, "product_photo"));
          }
          if (pamphletFile) {
            uploads.push(productsApi.uploadDocuments(productId, [pamphletFile], "product_pamphlet"));
          }
          if (antidoteFile) {
            uploads.push(productsApi.uploadDocuments(productId, [antidoteFile], "product_antidote"));
          }
          const createdSizes = res.data.sizes ?? [];
          sizePackagingFiles.forEach((files, idx) => {
            if (files.length > 0 && createdSizes[idx]?.id) {
              uploads.push(productsApi.uploadDocuments(productId, files, "packaging_photo", createdSizes[idx].id));
            }
          });
          await Promise.all(uploads);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      toast.success(isEdit ? "Product updated" : "Product created");
      navigate("/dashboard/admin/products");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg || (isEdit ? "Update failed" : "Create failed"));
    } finally {
      setSubmitting(false);
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
          <CardTitle className="text-base">Company</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-normal text-sm">Marketing Company</Label>
              <Select
                value={manufacturerId}
                onValueChange={(v) => { setManufacturerId(v); clearError("manufacturerId"); }}
                disabled={isEdit}
              >
                <SelectTrigger className={`h-9 ${errors.manufacturerId ? "border-destructive" : ""}`}>
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
              <Label className="text-muted-foreground font-normal text-sm">Manufactured By</Label>
              <Select value={manufacturedById} onValueChange={(v) => { setManufacturedById(v); clearError("manufacturedById"); }}>
                <SelectTrigger className={`h-9 ${errors.manufacturedById ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Auto-filled from company" />
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
              <Label className="text-muted-foreground font-normal text-sm">Marketed By</Label>
              <Select value={marketedById} onValueChange={(v) => { setMarketedById(v); clearError("manufacturedById"); }}>
                <SelectTrigger className={`h-9 ${errors.manufacturedById ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Select company" />
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
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">Product Type</Label>
              <Select
                value={productType}
                onValueChange={(v) => {
                  const newType = v as ProductType;
                  setProductType(newType);
                  clearError("productType");
                  if (!["PESTICIDE", "FUNGICIDE", "HERBICIDE", "BACTERIACIDE"].includes(newType)) setCirNumber("");
                }}
              >
                <SelectTrigger className={`h-9 ${errors.productType ? "border-destructive" : ""}`}>
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
              {errors.productType && <p className="text-xs text-destructive">{errors.productType}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">Product Name</Label>
              <Input value={productName} onChange={(e) => { setProductName(e.target.value); clearError("productName"); }} placeholder="Product name" className={`h-9 ${errors.productName ? "border-destructive" : ""}`} />
              {errors.productName && <p className="text-xs text-destructive">{errors.productName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">Technical Name</Label>
              <Input value={technicalName} onChange={(e) => { setTechnicalName(e.target.value); clearError("technicalName"); }} placeholder="Technical name" className={`h-9 ${errors.technicalName ? "border-destructive" : ""}`} />
              {errors.technicalName && <p className="text-xs text-destructive">{errors.technicalName}</p>}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-muted-foreground font-normal text-sm">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description" rows={3} />
            </div>
            {["PESTICIDE", "FUNGICIDE", "HERBICIDE", "BACTERIACIDE"].includes(productType) && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal text-sm">CIR Number *</Label>
                <Input value={cirNumber} onChange={(e) => { setCirNumber(e.target.value); clearError("cirNumber"); }} placeholder="CIR Number" className={`h-9 ${errors.cirNumber ? "border-destructive" : ""}`} />
                {errors.cirNumber && <p className="text-xs text-destructive">{errors.cirNumber}</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Product Photos (Min 3, Max 4)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{totalPhotoCount} of 3–4 photos</p>
          {existingPhotoDocs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {existingPhotoDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-1 rounded border bg-muted/30 px-2 py-1.5 text-sm">
                  <span className="truncate max-w-[120px]">{doc.fileName}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => deleteDocs.mutate({ id: id!, docId: doc.id })}
                    disabled={deleteDocs.isPending}
                  >
                    {deleteDocs.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {productPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {productPhotos.map((file, i) => (
                <div key={i} className="flex items-center gap-1 rounded border bg-muted/30 px-2 py-1.5 text-sm">
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => setProductPhotos((p) => p.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              setProductPhotos((p) => {
                const next = [...p, ...files].slice(0, 4);
                return next;
              });
              clearError("productPhotos");
              if (photoInputRef.current) photoInputRef.current.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => photoInputRef.current?.click()}
            disabled={totalPhotoCount >= 4}
          >
            <Upload className="h-4 w-4 mr-2" />
            Add photos
          </Button>
          {errors.productPhotos && <p className="text-xs text-destructive">{errors.productPhotos}</p>}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEdit ? (
            <>
              <InlineDocUpload
                label="Product Pamphlet (PDF)"
                documents={existingPamphletDocs.map((d) => ({ id: d.id, fileName: d.fileName, filePath: d.filePath }))}
                onUpload={(files) => id && files.length > 0 && uploadDocs.mutate({ id, files, docType: "product_pamphlet" })}
                onDelete={(docId) => id && deleteDocs.mutate({ id, docId })}
                getDocumentUrl={productsApi.getDocumentUrl}
                uploading={uploadDocs.isPending}
                deleting={deleteDocs.isPending}
                accept=".pdf"
              />
              <InlineDocUpload
                label="Product Antidote (Optional)"
                documents={existingAntidoteDocs.map((d) => ({ id: d.id, fileName: d.fileName, filePath: d.filePath }))}
                onUpload={(files) => id && files.length > 0 && uploadDocs.mutate({ id, files, docType: "product_antidote" })}
                onDelete={(docId) => id && deleteDocs.mutate({ id, docId })}
                getDocumentUrl={productsApi.getDocumentUrl}
                uploading={uploadDocs.isPending}
                deleting={deleteDocs.isPending}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Product Pamphlet (PDF)</Label>
                {pamphletFile && (
                  <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm bg-muted/30">
                    <span className="truncate flex-1">{pamphletFile.name}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setPamphletFile(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <Input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  id="pamphlet-upload"
                  onChange={(e) => setPamphletFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="pamphlet-upload" className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed rounded-md cursor-pointer hover:bg-muted/50">
                  <Upload className="h-3.5 w-3.5" />
                  Upload pamphlet PDF
                </label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Product Antidote (Optional)</Label>
                {antidoteFile && (
                  <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm bg-muted/30">
                    <span className="truncate flex-1">{antidoteFile.name}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setAntidoteFile(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  id="antidote-upload"
                  onChange={(e) => setAntidoteFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="antidote-upload" className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed rounded-md cursor-pointer hover:bg-muted/50">
                  <Upload className="h-3.5 w-3.5" />
                  Upload antidote
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Product Sizes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sizes.map((size, i) => (
            <div key={i} className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Size {i + 1}</h4>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeSize(i)} disabled={sizes.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    placeholder="e.g. 100"
                    className="h-9"
                    value={size.quantity}
                    onChange={(e) => { updateSize(i, "quantity", e.target.value); clearError("sizes"); clearError(`size_${i}`); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quantity Type</Label>
                  <Select value={size.unit} onValueChange={(v) => { updateSize(i, "unit", v); clearError("sizes"); clearError(`size_${i}`); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bottles per case</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="1"
                    className="h-9"
                    value={size.bottlesPerCase}
                    onChange={(e) => { updateSize(i, "bottlesPerCase", parseInt(e.target.value, 10) || 1); clearError("sizes"); clearError(`size_${i}`); }}
                  />
                </div>
              </div>
              {isEdit && product?.sizes?.[i]?.id ? (
                <InlineDocUpload
                  label="Packaging photos"
                  documents={(product.sizes[i].documents ?? []).map((d) => ({ id: d.id, fileName: d.fileName, filePath: d.filePath }))}
                  onUpload={(files) => id && files.length > 0 && uploadDocs.mutate({ id, files, docType: "packaging_photo", productSizeId: product.sizes![i].id })}
                  onDelete={(docId) => id && deleteDocs.mutate({ id, docId })}
                  getDocumentUrl={productsApi.getDocumentUrl}
                  uploading={uploadDocs.isPending}
                  deleting={deleteDocs.isPending}
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                />
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Packaging photos (optional)</Label>
                  {(sizePackagingFiles[i] ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(sizePackagingFiles[i] ?? []).map((f, j) => (
                        <span key={j} className="text-xs truncate max-w-[100px] bg-muted px-2 py-0.5 rounded">
                          {f.name}
                          <button type="button" onClick={() => setSizePackagingFiles((p) => { const n = [...p]; n[i] = (n[i] ?? []).filter((_, k) => k !== j); return n; })} className="ml-1 text-destructive">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                    className="hidden"
                    id={`size-packaging-${i}`}
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      setSizePackagingFiles((p) => { const n = [...p]; while (n.length <= i) n.push([]); n[i] = [...(n[i] ?? []), ...files]; return n; });
                      e.target.value = "";
                    }}
                  />
                  <label htmlFor={`size-packaging-${i}`} className="inline-flex items-center gap-1 text-xs border border-dashed rounded px-2 py-1 cursor-pointer hover:bg-muted/50">
                    <Upload className="h-3 w-3" /> Add photos
                  </label>
                </div>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={addSize}>
            <Plus className="h-4 w-4 mr-2" />
            Add Size
          </Button>
          {(errors.sizes || Object.keys(errors).some((k) => k.startsWith("size_"))) && (
            <p className="text-xs text-destructive">{errors.sizes || errors[Object.keys(errors).find((k) => k.startsWith("size_")) || ""]}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Tax Details</CardTitle>
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
                onChange={(e) => { setGstPercentage(parseFloat(e.target.value) || 0); clearError("gstPercentage"); }}
                className={`h-9 ${errors.gstPercentage ? "border-destructive" : ""}`}
              />
              {errors.gstPercentage && <p className="text-xs text-destructive">{errors.gstPercentage}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">HSN Code</Label>
              <Input value={hsnCode} onChange={(e) => { setHsnCode(e.target.value); clearError("hsnCode"); }} placeholder="HSN Code" className={`h-9 ${errors.hsnCode ? "border-destructive" : ""}`} />
              {errors.hsnCode && <p className="text-xs text-destructive">{errors.hsnCode}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Dosage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">Recommended Dose</Label>
              <Input value={recommendedDose} onChange={(e) => { setRecommendedDose(e.target.value); clearError("recommendedDose"); }} placeholder="e.g. 100ml" className={`h-9 ${errors.recommendedDose ? "border-destructive" : ""}`} />
              {errors.recommendedDose && <p className="text-xs text-destructive">{errors.recommendedDose}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal text-sm">Dose Unit</Label>
              <Select value={doseUnit} onValueChange={(v) => { setDoseUnit(v as DoseUnit); clearError("doseUnit"); }}>
                <SelectTrigger className={`h-9 ${errors.doseUnit ? "border-destructive" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOSE_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-muted-foreground font-normal text-sm">Dose per Liter (optional)</Label>
              <Input value={dosePerLiter} onChange={(e) => setDosePerLiter(e.target.value)} placeholder="e.g. 2ml per liter" className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Recommended Crops</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search crops..."
            className="h-9 max-w-xs"
            value={cropSearch}
            onChange={(e) => setCropSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {PREDEFINED_CROPS.filter((name) =>
              name.toLowerCase().includes(cropSearch.toLowerCase())
            ).map((name) => (
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
          {errors.crops && <p className="text-xs text-destructive mt-2">{errors.crops}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {!isEdit && (
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save as Draft
          </Button>
        )}
        <Button className="bg-gradient-primary" onClick={() => handleSubmit(false)} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <Save className="h-4 w-4 mr-2" />
          {isEdit ? "Save" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
