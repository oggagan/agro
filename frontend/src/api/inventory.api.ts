import client from "./client";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Inventory,
  InventoryProduct,
  InventoryStats,
  CreateInventoryPayload,
  UpdateInventoryPayload,
  AddInventoryProductPayload,
  UpdateInventoryProductPayload,
  InventoryListParams,
  InventoryProductsListParams,
} from "@/types/inventory";

export const inventoryApi = {
  list: (params?: InventoryListParams) =>
    client.get<PaginatedResponse<Inventory>>("/inventories", { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<ApiResponse<Inventory>>(`/inventories/${id}`).then((r) => r.data),

  getStats: () =>
    client.get<ApiResponse<InventoryStats>>("/inventories/stats").then((r) => r.data),

  create: (payload: CreateInventoryPayload) =>
    client.post<ApiResponse<Inventory>>("/inventories", payload).then((r) => r.data),

  update: (id: string, payload: UpdateInventoryPayload) =>
    client.put<ApiResponse<Inventory>>(`/inventories/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    client.delete<ApiResponse<{ message: string }>>(`/inventories/${id}`).then((r) => r.data),

  listProducts: (inventoryId: string, params?: InventoryProductsListParams) =>
    client
      .get<PaginatedResponse<InventoryProduct>>(`/inventories/${inventoryId}/products`, { params })
      .then((r) => r.data),

  addProduct: (inventoryId: string, payload: AddInventoryProductPayload) =>
    client
      .post<ApiResponse<InventoryProduct>>(`/inventories/${inventoryId}/products`, payload)
      .then((r) => r.data),

  updateProduct: (
    inventoryId: string,
    inventoryProductId: string,
    payload: UpdateInventoryProductPayload
  ) =>
    client
      .put<ApiResponse<InventoryProduct>>(
        `/inventories/${inventoryId}/products/${inventoryProductId}`,
        payload
      )
      .then((r) => r.data),

  deleteProduct: (inventoryId: string, inventoryProductId: string) =>
    client
      .delete<ApiResponse<{ message: string }>>(
        `/inventories/${inventoryId}/products/${inventoryProductId}`
      )
      .then((r) => r.data),
};
