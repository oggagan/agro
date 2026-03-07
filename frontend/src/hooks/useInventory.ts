import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { inventoryApi } from "@/api/inventory.api";
import type {
  CreateInventoryPayload,
  UpdateInventoryPayload,
  AddInventoryProductPayload,
  AddInventoryProductBatchPayload,
  UpdateInventoryProductPayload,
  InventoryListParams,
  InventoryProductsListParams,
} from "@/types/inventory";

export function useInventoryList(params?: InventoryListParams) {
  return useQuery({
    queryKey: ["inventories", params],
    queryFn: () => inventoryApi.list(params),
  });
}

export function useInventory(id: string | undefined) {
  return useQuery({
    queryKey: ["inventory", id],
    queryFn: () => inventoryApi.getById(id!),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ["inventory-stats"],
    queryFn: () => inventoryApi.getStats(),
    select: (data) => data.data,
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInventoryPayload) => inventoryApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      toast.success("Inventory created");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Create failed"),
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInventoryPayload }) =>
      inventoryApi.update(id, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", vars.id] });
      toast.success("Inventory updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Update failed"),
  });
}

export function useDeleteInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      toast.success("Inventory deleted");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Delete failed"),
  });
}

export function useInventoryProducts(inventoryId: string | undefined, params?: InventoryProductsListParams) {
  return useQuery({
    queryKey: ["inventory-products", inventoryId, params],
    queryFn: () => inventoryApi.listProducts(inventoryId!, params),
    enabled: !!inventoryId,
  });
}

export function useAddInventoryProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inventoryId, payload }: { inventoryId: string; payload: AddInventoryProductPayload }) =>
      inventoryApi.addProduct(inventoryId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products", vars.inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", vars.inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      toast.success("Product added to inventory");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Add failed"),
  });
}

export function useAddInventoryProductBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inventoryId,
      payload,
    }: {
      inventoryId: string;
      payload: AddInventoryProductBatchPayload;
    }) => inventoryApi.addProductBatch(inventoryId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products", vars.inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", vars.inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      toast.success("Product batches added to inventory");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
          "Add batch failed"
      ),
  });
}

export function useUpdateInventoryProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inventoryId,
      inventoryProductId,
      payload,
    }: {
      inventoryId: string;
      inventoryProductId: string;
      payload: UpdateInventoryProductPayload;
    }) => inventoryApi.updateProduct(inventoryId, inventoryProductId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products", vars.inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", vars.inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      toast.success("Inventory product updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Update failed"),
  });
}

export function useDeleteInventoryProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inventoryId, inventoryProductId }: { inventoryId: string; inventoryProductId: string }) =>
      inventoryApi.deleteProduct(inventoryId, inventoryProductId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products", vars.inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", vars.inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      toast.success("Inventory product entry deleted");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Delete failed"),
  });
}
