import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { productsApi } from "@/api/products.api";
import type {
  CreateProductPayload,
  UpdateProductPayload,
  ProductListParams,
  ProductStatus,
} from "@/types/product";

export function useProductList(params?: ProductListParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productsApi.list(params),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.getById(id!),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Create failed"),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      productsApi.update(id, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", vars.id] });
      toast.success("Product updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Update failed"),
  });
}

export function useUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: ProductStatus; reason?: string }) =>
      productsApi.updateStatus(id, status, reason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", vars.id] });
      toast.success("Product status updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Status update failed"),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Delete failed"),
  });
}

export function useUploadProductDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      files,
      docType,
      productSizeId,
    }: {
      id: string;
      files: File[];
      docType: string;
      productSizeId?: string;
    }) => productsApi.uploadDocuments(id, files, docType, productSizeId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["product", vars.id] });
      toast.success("Documents uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Upload failed"),
  });
}

export function useDeleteProductDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, docId }: { id: string; docId: string }) =>
      productsApi.deleteDocument(id, docId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["product", vars.id] });
      toast.success("Document deleted");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Delete failed"),
  });
}
