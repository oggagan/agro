export type InventoryType = "WAREHOUSE" | "SHOP" | "GODOWN" | "DISTRIBUTION_CENTER";
export type InventoryStatus = "ACTIVE" | "INACTIVE";
export type StockSourceType = "MANUFACTURER" | "OTHER";
export type StockUnit = "KG" | "G" | "L" | "ML" | "PACK" | "BAG" | "BOTTLE" | "QUANTAL";

export interface Inventory {
  id: string;
  ownerType: string;
  manufacturerId?: string | null;
  retailerId?: string | null;
  distributorId?: string | null;
  name: string;
  type: InventoryType;
  description?: string | null;
  status: InventoryStatus;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  pincode: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  manufacturer?: { id: string; companyName: string } | null;
  retailer?: { id: string; companyName: string } | null;
  distributor?: { id: string; companyName?: string } | null;
  _count?: { products: number };
  lowStockCount?: number;
  outOfStockCount?: number;
  createdAt: string;
}

export interface CreateInventoryPayload {
  ownerType: "MANUFACTURER" | "RETAILER" | "DISTRIBUTOR";
  manufacturerId?: string | null;
  retailerId?: string | null;
  distributorId?: string | null;
  name: string;
  type: InventoryType;
  description?: string | null;
  status?: InventoryStatus;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  pincode: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface UpdateInventoryPayload {
  name?: string;
  type?: InventoryType;
  description?: string | null;
  status?: InventoryStatus;
  address1?: string;
  address2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  ownerType?: "MANUFACTURER" | "RETAILER" | "DISTRIBUTOR";
  type?: InventoryType;
  status?: InventoryStatus;
}

export interface InventoryProduct {
  id: string;
  inventoryId: string;
  productId: string;
  productSizeId?: string | null;
  stock: number;
  price: number;
  averageCost?: number | null;
  sourceType: StockSourceType;
  batchNumber?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  purchasedFrom?: string | null;
  unit: StockUnit;
  lowStockThreshold: number;
  product: {
    id: string;
    productName: string;
    technicalName: string;
    manufacturer: { companyName: string };
  };
  computedStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

export interface AddInventoryProductPayload {
  productId: string;
  productSizeId?: string | null;
  stock: number;
  price: number;
  sourceType: StockSourceType;
  batchNumber?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  purchasedFrom?: string | null;
  unit: StockUnit;
  lowStockThreshold?: number;
}

export interface UpdateInventoryProductPayload {
  stock?: number;
  price?: number;
  batchNumber?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  purchasedFrom?: string | null;
  lowStockThreshold?: number;
}

export interface InventoryProductsListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "inStock" | "lowStock" | "outOfStock";
  company?: string;
}

export interface InventoryStats {
  totalInventories: number;
  totalProducts: number;
  lowStockItems: number;
  totalValue: number;
}
