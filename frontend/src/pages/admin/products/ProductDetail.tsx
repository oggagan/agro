import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Image as ImageIcon, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct, useUpdateProductStatus } from "@/hooks/useProducts";
import { productsApi } from "@/api/products.api";
import type { ProductType, ProductStatus } from "@/types/product";
import { Loader2 } from "lucide-react";

function formatProductType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const updateStatus = useUpdateProductStatus();

  const canActivate = product?.status === "PENDING";
  const canToggleActiveInactive = product?.status === "ACTIVE" || product?.status === "INACTIVE";
  const canToggleStatus = canActivate || canToggleActiveInactive;
  const handleStatusToggle = () => {
    if (!product || !canToggleStatus) return;
    const newStatus: ProductStatus =
      product.status === "PENDING"
        ? "ACTIVE"
        : product.status === "ACTIVE"
          ? "INACTIVE"
          : "ACTIVE";
    updateStatus.mutate({ id: product.id, status: newStatus });
  };

  if (isLoading || !product) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/dashboard/admin/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">{product.productName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {product.technicalName} · {product.manufacturer?.companyName}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {formatProductType(product.productType)}
        </Badge>
        <Badge variant="secondary" className="shrink-0">
          {product.status}
        </Badge>
        {canToggleStatus && (
          <Button variant="outline" size="sm" onClick={handleStatusToggle} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {product.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/admin/products/edit/${product.id}`)}>
          Edit
        </Button>
      </div>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Product Type</p>
              <p className="font-medium">{formatProductType(product.productType)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Technical Name</p>
              <p className="font-medium">{product.technicalName}</p>
            </div>
            {["PESTICIDE", "FUNGICIDE", "HERBICIDE", "BACTERIACIDE"].includes(product.productType) && (
              <div>
                <p className="text-sm text-muted-foreground">CIR Number</p>
                <p className="font-medium">{product.cirNumber ?? "—"}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Manufactured By</p>
              <p className="font-medium">{product.manufacturedBy?.companyName ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Marketed By</p>
              <p className="font-medium">{product.marketedBy?.companyName ?? product.manufacturedBy?.companyName ?? "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{product.description ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {product.documents?.filter((d) => d.docType === "product_photo").length > 0 && (
        <Card className="border-0 shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Product Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {product.documents
                .filter((d) => d.docType === "product_photo")
                .map((doc) => (
                  <a
                    key={doc.id}
                    href={productsApi.getDocumentUrl(doc.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded border overflow-hidden w-24 h-24 shrink-0"
                  >
                    <img
                      src={productsApi.getDocumentUrl(doc.filePath)}
                      alt={doc.fileName}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(product.documents?.some((d) => d.docType === "product_pamphlet" || d.docType === "product_antidote") ?? false) && (
        <Card className="border-0 shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {product.documents
              ?.filter((d) => d.docType === "product_pamphlet")
              .map((doc) => (
                <a
                  key={doc.id}
                  href={productsApi.getDocumentUrl(doc.filePath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Pamphlet: {doc.fileName}
                </a>
              ))}
            {product.documents
              ?.filter((d) => d.docType === "product_antidote")
              .map((doc) => (
                <a
                  key={doc.id}
                  href={productsApi.getDocumentUrl(doc.filePath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Antidote: {doc.fileName}
                </a>
              ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Tax Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">GST %</p>
              <p className="font-medium">{product.gstPercentage}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">HSN Code</p>
              <p className="font-medium">{product.hsnCode}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Dosage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Recommended Dose</p>
              <p className="font-medium">{product.recommendedDose} {product.doseUnit.replace("_", " ").toLowerCase()}</p>
            </div>
            {product.dosePerLiter != null && product.dosePerLiter !== "" && (
              <div>
                <p className="text-sm text-muted-foreground">Dose per Liter</p>
                <p className="font-medium">{product.dosePerLiter}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Sizes</CardTitle>
        </CardHeader>
        <CardContent>
          {product.sizes?.length ? (
            <ul className="space-y-3">
              {product.sizes.map((s) => (
                <li key={s.id} className="border rounded p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{s.quantity} {s.unit}</span>
                    <span className="text-muted-foreground">· {s.bottlesPerCase} per case</span>
                  </div>
                  {s.documents && s.documents.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">Packaging photos:</span>
                      {s.documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={productsApi.getDocumentUrl(doc.filePath)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          {doc.fileName}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No sizes defined.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-base">Recommended Crops</CardTitle>
        </CardHeader>
        <CardContent>
          {product.crops?.length ? (
            <div className="flex flex-wrap gap-2">
              {product.crops.map((c) => (
                <Badge key={c.id} variant="secondary">
                  {c.cropName}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No crops specified.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
