export type ProductType =
  | "PESTICIDE"
  | "FUNGICIDE"
  | "PGR"
  | "NPK"
  | "FERTILIZER"
  | "BIO_PESTICIDE"
  | "BIO_FUNGICIDE"
  | "BIO_PGR"
  | "BIO_FERTILIZER";

export type ProductStatus = "DRAFT" | "PENDING" | "ACTIVE" | "INACTIVE" | "DECLINED" | "REVERIFY";

export type DoseUnit = "PER_ACRE" | "PER_HECTARE";

export interface ProductSize {
  id: string;
  quantity: string;
  unit: string;
  bottlesPerCase: number;
  documents?: { id: string; fileName: string; filePath: string }[];
}

export interface ProductCrop {
  id: string;
  cropName: string;
  isCustom: boolean;
}

export interface Product {
  id: string;
  manufacturerId: string;
  productType: ProductType;
  productName: string;
  technicalName: string;
  manufacturedById: string;
  marketedById?: string | null;
  description: string;
  cirNumber?: string | null;
  gstPercentage: number;
  hsnCode: string;
  recommendedDose: string;
  doseUnit: DoseUnit;
  status: ProductStatus;
  isDraft: boolean;
  manufacturer: { id: string; companyName: string };
  manufacturedBy: { id: string; companyName: string };
  marketedBy?: { id: string; companyName: string } | null;
  sizes: ProductSize[];
  crops: ProductCrop[];
  documents: { id: string; fileName: string; filePath: string; docType: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  manufacturerId: string;
  productType: ProductType;
  productName: string;
  technicalName: string;
  manufacturedById: string;
  marketedById?: string | null;
  description: string;
  cirNumber?: string | null;
  gstPercentage: number;
  hsnCode: string;
  recommendedDose: string;
  doseUnit: DoseUnit;
  sizes: { quantity: string; unit: string; bottlesPerCase: number }[];
  crops: { cropName: string; isCustom?: boolean }[];
  isDraft?: boolean;
}

export interface UpdateProductPayload {
  productName?: string;
  technicalName?: string;
  manufacturedById?: string;
  marketedById?: string | null;
  description?: string;
  cirNumber?: string | null;
  gstPercentage?: number;
  hsnCode?: string;
  recommendedDose?: string;
  doseUnit?: DoseUnit;
  sizes?: { id?: string; quantity: string; unit: string; bottlesPerCase: number }[];
  crops?: { cropName: string; isCustom?: boolean }[];
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductStatus;
  productType?: ProductType;
  manufacturerId?: string;
}
