import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { manufacturersApi } from "@/api/manufacturers.api";
import type {
  CreateManufacturerPayload,
  UpdateManufacturerPayload,
  ManufacturerListParams,
  DirectorType,
} from "@/types/manufacturer";
import type { UserStatus } from "@/types/auth";

export function useManufacturerList(params?: ManufacturerListParams) {
  return useQuery({
    queryKey: ["manufacturers", params],
    queryFn: () => manufacturersApi.list(params),
  });
}

export function useManufacturer(id: string | undefined) {
  return useQuery({
    queryKey: ["manufacturer", id],
    queryFn: () => manufacturersApi.getById(id!),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function useCreateManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateManufacturerPayload) => manufacturersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      toast.success("Manufacturer created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Create failed"),
  });
}

export function useUpdateManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateManufacturerPayload }) =>
      manufacturersApi.update(id, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.id] });
      toast.success("Manufacturer updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Update failed"),
  });
}

export function useUpdateManufacturerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      manufacturersApi.updateStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.id] });
      toast.success("Manufacturer status updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Status update failed"),
  });
}

export function useAddDirector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, payload }: {
      mfgId: string;
      payload: {
        type: DirectorType;
        name: string;
        designation?: string;
        phone: string;
        email?: string;
        aadhaarNumber?: string;
        panNumber?: string;
      };
    }) =>
      manufacturersApi.addDirector(mfgId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Director added");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to add director"),
  });
}

export function useUpdateDirector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, dirId, payload }: {
      mfgId: string;
      dirId: string;
      payload: {
        type?: DirectorType;
        name?: string;
        designation?: string;
        phone?: string;
        email?: string;
        aadhaarNumber?: string;
        panNumber?: string;
      };
    }) =>
      manufacturersApi.updateDirector(mfgId, dirId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Director updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to update director"),
  });
}

export function useDeleteDirector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, dirId }: { mfgId: string; dirId: string }) =>
      manufacturersApi.deleteDirector(mfgId, dirId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Director removed");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to delete director"),
  });
}

export function useUpsertBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, payload }: {
      mfgId: string;
      payload: {
        accountName: string;
        accountNumber: string;
        ifscCode: string;
        bankName: string;
      };
    }) =>
      manufacturersApi.upsertBankDetails(mfgId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Bank details saved");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to save bank details"),
  });
}

export function useUpsertAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, payload }: {
      mfgId: string;
      payload: {
        name: string;
        phone: string;
        aadhaarNumber?: string;
      };
    }) =>
      manufacturersApi.upsertAuthorizedPerson(mfgId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Authorized person saved");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to save authorized person"),
  });
}

export function useAddAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, payload }: {
      mfgId: string;
      payload: {
        name: string;
        phone: string;
        email?: string;
        aadhaarNumber?: string;
        createUser?: boolean;
        password?: string;
      };
    }) => manufacturersApi.addAuthorizedPerson(mfgId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Authorized person added");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to add authorized person"),
  });
}

export function useUpdateAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, apId, payload }: {
      mfgId: string;
      apId: string;
      payload: { name?: string; phone?: string; email?: string; aadhaarNumber?: string };
    }) => manufacturersApi.updateAuthorizedPerson(mfgId, apId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Authorized person updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to update authorized person"),
  });
}

export function useRemoveAuthorizedPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, apId }: { mfgId: string; apId: string }) =>
      manufacturersApi.removeAuthorizedPerson(mfgId, apId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Authorized person removed");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to remove authorized person"),
  });
}

export function useUploadDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, files, docType }: {
      mfgId: string;
      files: File[];
      docType: string;
    }) =>
      manufacturersApi.uploadDocuments(mfgId, files, docType),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Documents uploaded");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to upload documents"),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, docId }: { mfgId: string; docId: string }) =>
      manufacturersApi.deleteDocument(mfgId, docId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Document deleted");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to delete document"),
  });
}

export function useUploadDirectorDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, dirId, files, docType }: {
      mfgId: string;
      dirId: string;
      files: File[];
      docType: string;
    }) =>
      manufacturersApi.uploadDirectorDocuments(mfgId, dirId, files, docType),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Director document uploaded");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to upload director document"),
  });
}

export function useUploadAuthorizedPersonDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, apId, files, docType }: {
      mfgId: string;
      apId: string;
      files: File[];
      docType: string;
    }) =>
      manufacturersApi.uploadAuthorizedPersonDocuments(mfgId, apId, files, docType),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Authorized person document uploaded");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to upload document"),
  });
}

export function useUploadBankDetailsDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfgId, files, docType }: {
      mfgId: string;
      files: File[];
      docType: string;
    }) =>
      manufacturersApi.uploadBankDetailsDocuments(mfgId, files, docType),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturer", vars.mfgId] });
      toast.success("Bank details document uploaded");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Failed to upload document"),
  });
}
