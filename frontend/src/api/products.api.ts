import client from "./client";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductListParams,
} from "@/types/product";
import type { ProductStatus } from "@/types/product";

export const productsApi = {
  list: (params?: ProductListParams) =>
    client.get<PaginatedResponse<Product>>("/products", { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<ApiResponse<Product>>(`/products/${id}`).then((r) => r.data),

  create: (payload: CreateProductPayload) =>
    client.post<ApiResponse<Product>>("/products", payload).then((r) => r.data),

  update: (id: string, payload: UpdateProductPayload) =>
    client.put<ApiResponse<Product>>(`/products/${id}`, payload).then((r) => r.data),

  updateStatus: (id: string, status: ProductStatus, reason?: string) =>
    client.patch<ApiResponse<Product>>(`/products/${id}/status`, { status, reason }).then((r) => r.data),

  delete: (id: string) =>
    client.delete<ApiResponse<{ message: string }>>(`/products/${id}`).then((r) => r.data),

  uploadDocuments: (id: string, files: File[], docType: string, productSizeId?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    if (productSizeId) formData.append("productSizeId", productSizeId);
    return client
      .post<ApiResponse<{ documents: unknown[]; message: string }>>(`/products/${id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  deleteDocument: (id: string, docId: string) =>
    client.delete<ApiResponse<{ message: string }>>(`/products/${id}/documents/${docId}`).then((r) => r.data),

  getDocumentUrl: (filePath: string) =>
    `/api/v1/uploads/${filePath.split("/").pop() || filePath}`,
};
