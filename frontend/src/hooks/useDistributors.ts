import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { distributorsApi } from "@/api/distributors.api";
import type {
  CreateDistributorPayload,
  UpdateDistributorPayload,
  DistributorListParams,
} from "@/types/distributor";
import type { DirectorType } from "@/types/manufacturer";
import type { UserStatus } from "@/types/auth";

export function useDistributorList(params?: DistributorListParams) {
  return useQuery({
    queryKey: ["distributors", params],
    queryFn: () => distributorsApi.list(params),
  });
}

export function useDistributor(id: string | undefined) {
  return useQuery({
    queryKey: ["distributor", id],
    queryFn: () => distributorsApi.getById(id!),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function useCreateDistributor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDistributorPayload) => distributorsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      toast.success("Distributor created");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Create failed"),
  });
}

export function useUpdateDistributor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDistributorPayload }) =>
      distributorsApi.update(id, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.id] });
      toast.success("Distributor updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Update failed"),
  });
}

export function useUpdateDistributorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: UserStatus; reason?: string }) =>
      distributorsApi.updateStatus(id, status, reason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.id] });
      toast.success("Distributor status updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Status update failed"),
  });
}

export function useAddDistributorDirector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      payload,
    }: {
      distributorId: string;
      payload: {
        type: DirectorType;
        name: string;
        designation?: string;
        phone: string;
        email?: string;
        aadhaarNumber?: string;
        panNumber?: string;
      };
    }) => distributorsApi.addDirector(distributorId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Director added");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to add director"),
  });
}

export function useUpdateDistributorDirector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      dirId,
      payload,
    }: {
      distributorId: string;
      dirId: string;
      payload: Record<string, unknown>;
    }) => distributorsApi.updateDirector(distributorId, dirId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Director updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to update director"),
  });
}

export function useDeleteDistributorDirector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ distributorId, dirId }: { distributorId: string; dirId: string }) =>
      distributorsApi.deleteDirector(distributorId, dirId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Director removed");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to delete director"),
  });
}

export function useUpsertDistributorBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      payload,
    }: {
      distributorId: string;
      payload: { accountName: string; accountNumber: string; ifscCode: string; bankName: string };
    }) => distributorsApi.upsertBankDetails(distributorId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Bank details saved");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to save bank details"),
  });
}

export function useAddDistributorAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      payload,
    }: {
      distributorId: string;
      payload: { name: string; phone: string; email?: string; aadhaarNumber?: string; password: string };
    }) => distributorsApi.addAuthorizedPerson(distributorId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Authorized person added");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to add authorized person"),
  });
}

export function useUpdateDistributorAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      apId,
      payload,
    }: {
      distributorId: string;
      apId: string;
      payload: { name?: string; phone?: string; email?: string; aadhaarNumber?: string };
    }) => distributorsApi.updateAuthorizedPerson(distributorId, apId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Authorized person updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to update authorized person"),
  });
}

export function useRemoveDistributorAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ distributorId, apId }: { distributorId: string; apId: string }) =>
      distributorsApi.removeAuthorizedPerson(distributorId, apId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Authorized person removed");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to remove authorized person"),
  });
}

export function useAddDistributorLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      payload,
    }: {
      distributorId: string;
      payload: { category: string; licenseNumber?: string; validUptoDate?: string };
    }) => distributorsApi.addLicense(distributorId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("License added");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to add license"),
  });
}

export function useUpdateDistributorLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      licId,
      payload,
    }: {
      distributorId: string;
      licId: string;
      payload: { licenseNumber?: string; validUptoDate?: string };
    }) => distributorsApi.updateLicense(distributorId, licId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("License updated");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to update license"),
  });
}

export function useDeleteDistributorLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ distributorId, licId }: { distributorId: string; licId: string }) =>
      distributorsApi.deleteLicense(distributorId, licId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("License deleted");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to delete license"),
  });
}

export function useUploadDistributorDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ distributorId, files, docType }: { distributorId: string; files: File[]; docType: string }) =>
      distributorsApi.uploadDocuments(distributorId, files, docType),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Documents uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload documents"),
  });
}

export function useDeleteDistributorDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ distributorId, docId }: { distributorId: string; docId: string }) =>
      distributorsApi.deleteDocument(distributorId, docId),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Document deleted");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to delete document"),
  });
}

export function useUploadDistributorDirectorDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      dirId,
      files,
      docType,
    }: {
      distributorId: string;
      dirId: string;
      files: File[];
      docType: string;
    }) => distributorsApi.uploadDirectorDocuments(distributorId, dirId, files, docType),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Director document uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload director document"),
  });
}

export function useUploadDistributorAuthorizedPersonDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      apId,
      files,
      docType,
    }: {
      distributorId: string;
      apId: string;
      files: File[];
      docType: string;
    }) => distributorsApi.uploadAuthorizedPersonDocuments(distributorId, apId, files, docType),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Authorized person document uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload document"),
  });
}

export function useUploadDistributorBankDetailsDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ distributorId, files, docType }: { distributorId: string; files: File[]; docType: string }) =>
      distributorsApi.uploadBankDetailsDocuments(distributorId, files, docType),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("Bank details document uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload document"),
  });
}

export function useUploadDistributorLicenseDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      distributorId,
      licId,
      files,
      docType,
    }: {
      distributorId: string;
      licId: string;
      files: File[];
      docType: string;
    }) => distributorsApi.uploadLicenseDocuments(distributorId, licId, files, docType),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["distributor", vars.distributorId] });
      toast.success("License document uploaded");
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to upload document"),
  });
}
