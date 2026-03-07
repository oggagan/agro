import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { retailersApi } from "@/api/retailers.api";
import type {
  CreateRetailerPayload,
  UpdateRetailerPayload,
  RetailerListParams,
} from "@/types/retailer";
import type { DirectorType } from "@/types/manufacturer";
import type { UserStatus } from "@/types/auth";

export function useRetailerList(params?: RetailerListParams) {
  return useQuery({
    queryKey: ["retailers", params],
    queryFn: () => retailersApi.list(params),
  });
}

export function useRetailer(id: string | undefined) {
  return useQuery({
    queryKey: ["retailer", id],
    queryFn: () => retailersApi.getById(id!),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function useCreateRetailer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRetailerPayload) => retailersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailers"] });
      toast.success("Retailer created");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Create failed"),
  });
}

export function useUpdateRetailer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRetailerPayload }) =>
      retailersApi.update(id, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailers"] });
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.id] });
      toast.success("Retailer updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Update failed"),
  });
}

export function useUpdateRetailerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      retailersApi.updateStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailers"] });
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.id] });
      toast.success("Retailer status updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Status update failed"),
  });
}

export function useAddRetailerDirector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      payload,
    }: {
      retailerId: string;
      payload: {
        type: DirectorType;
        name: string;
        designation?: string;
        phone: string;
        email?: string;
        aadhaarNumber?: string;
        panNumber?: string;
      };
    }) => retailersApi.addDirector(retailerId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Director added");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to add director"),
  });
}

export function useUpdateRetailerDirector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      dirId,
      payload,
    }: {
      retailerId: string;
      dirId: string;
      payload: Record<string, unknown>;
    }) => retailersApi.updateDirector(retailerId, dirId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Director updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to update director"),
  });
}

export function useDeleteRetailerDirector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ retailerId, dirId }: { retailerId: string; dirId: string }) =>
      retailersApi.deleteDirector(retailerId, dirId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Director removed");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to delete director"),
  });
}

export function useUpsertRetailerBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      payload,
    }: {
      retailerId: string;
      payload: { accountName: string; accountNumber: string; ifscCode: string; bankName: string };
    }) => retailersApi.upsertBankDetails(retailerId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Bank details saved");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to save bank details"),
  });
}

export function useAddRetailerAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      payload,
    }: {
      retailerId: string;
      payload: { name: string; phone: string; email?: string; aadhaarNumber?: string; password: string };
    }) => retailersApi.addAuthorizedPerson(retailerId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Authorized person added");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to add authorized person"),
  });
}

export function useUpdateRetailerAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      apId,
      payload,
    }: {
      retailerId: string;
      apId: string;
      payload: { name?: string; phone?: string; email?: string; aadhaarNumber?: string };
    }) => retailersApi.updateAuthorizedPerson(retailerId, apId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Authorized person updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to update authorized person"),
  });
}

export function useRemoveRetailerAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ retailerId, apId }: { retailerId: string; apId: string }) =>
      retailersApi.removeAuthorizedPerson(retailerId, apId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Authorized person removed");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to remove authorized person"),
  });
}

export function useAddRetailerLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      payload,
    }: {
      retailerId: string;
      payload: { category: string; licenseNumber?: string; validUptoDate?: string };
    }) => retailersApi.addLicense(retailerId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("License added");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to add license"),
  });
}

export function useUpdateRetailerLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      licId,
      payload,
    }: {
      retailerId: string;
      licId: string;
      payload: { licenseNumber?: string; validUptoDate?: string };
    }) => retailersApi.updateLicense(retailerId, licId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("License updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to update license"),
  });
}

export function useDeleteRetailerLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ retailerId, licId }: { retailerId: string; licId: string }) =>
      retailersApi.deleteLicense(retailerId, licId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("License deleted");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to delete license"),
  });
}

export function useUploadRetailerDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ retailerId, files, docType }: { retailerId: string; files: File[]; docType: string }) =>
      retailersApi.uploadDocuments(retailerId, files, docType),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Documents uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload documents"),
  });
}

export function useDeleteRetailerDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ retailerId, docId }: { retailerId: string; docId: string }) =>
      retailersApi.deleteDocument(retailerId, docId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Document deleted");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to delete document"),
  });
}

export function useUploadRetailerDirectorDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      dirId,
      files,
      docType,
    }: {
      retailerId: string;
      dirId: string;
      files: File[];
      docType: string;
    }) => retailersApi.uploadDirectorDocuments(retailerId, dirId, files, docType),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Director document uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload director document"),
  });
}

export function useUploadRetailerAuthorizedPersonDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      apId,
      files,
      docType,
    }: {
      retailerId: string;
      apId: string;
      files: File[];
      docType: string;
    }) => retailersApi.uploadAuthorizedPersonDocuments(retailerId, apId, files, docType),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Authorized person document uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload document"),
  });
}

export function useUploadRetailerBankDetailsDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ retailerId, files, docType }: { retailerId: string; files: File[]; docType: string }) =>
      retailersApi.uploadBankDetailsDocuments(retailerId, files, docType),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("Bank details document uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload document"),
  });
}

export function useUploadRetailerLicenseDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      retailerId,
      licId,
      files,
      docType,
    }: {
      retailerId: string;
      licId: string;
      files: File[];
      docType: string;
    }) => retailersApi.uploadLicenseDocuments(retailerId, licId, files, docType),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["retailer", vars.retailerId] });
      toast.success("License document uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload document"),
  });
}
