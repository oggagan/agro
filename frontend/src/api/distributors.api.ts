import client from "./client";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Distributor,
  DistributorLicense,
  CreateDistributorPayload,
  UpdateDistributorPayload,
  DistributorListParams,
} from "@/types/distributor";
import type { Director, AuthorizedPerson, BankDetails } from "@/types/manufacturer";
import type { ManufacturerDocument as DocType } from "@/types/manufacturer";
import type { UserStatus } from "@/types/auth";

export const distributorsApi = {
  list: (params?: DistributorListParams) =>
    client.get<PaginatedResponse<Distributor>>("/distributors", { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<ApiResponse<Distributor>>(`/distributors/${id}`).then((r) => r.data),

  create: (payload: CreateDistributorPayload) =>
    client.post<ApiResponse<Distributor>>("/distributors", payload).then((r) => r.data),

  update: (id: string, payload: UpdateDistributorPayload) =>
    client.put<ApiResponse<Distributor>>(`/distributors/${id}`, payload).then((r) => r.data),

  updateStatus: (id: string, status: UserStatus, reason?: string) =>
    client.patch<ApiResponse<Distributor>>(`/distributors/${id}/status`, { status, reason }).then((r) => r.data),

  addDirector: (id: string, payload: Record<string, unknown>) =>
    client.post<ApiResponse<Director>>(`/distributors/${id}/directors`, payload).then((r) => r.data),

  updateDirector: (id: string, dirId: string, payload: Record<string, unknown>) =>
    client.put<ApiResponse<Director>>(`/distributors/${id}/directors/${dirId}`, payload).then((r) => r.data),

  deleteDirector: (id: string, dirId: string) =>
    client.delete<ApiResponse<null>>(`/distributors/${id}/directors/${dirId}`).then((r) => r.data),

  addAuthorizedPerson: (id: string, payload: Record<string, unknown>) =>
    client.post<ApiResponse<AuthorizedPerson>>(`/distributors/${id}/authorized-persons`, payload).then((r) => r.data),

  updateAuthorizedPerson: (id: string, apId: string, payload: Record<string, unknown>) =>
    client.put<ApiResponse<AuthorizedPerson>>(`/distributors/${id}/authorized-persons/${apId}`, payload).then((r) => r.data),

  removeAuthorizedPerson: (id: string, apId: string) =>
    client.delete<ApiResponse<{ message: string }>>(`/distributors/${id}/authorized-persons/${apId}`).then((r) => r.data),

  upsertBankDetails: (id: string, payload: Record<string, unknown>) =>
    client.put<ApiResponse<BankDetails>>(`/distributors/${id}/bank-details`, payload).then((r) => r.data),

  addLicense: (id: string, payload: { category: string; licenseNumber?: string; validUptoDate?: string }) =>
    client.post<ApiResponse<DistributorLicense>>(`/distributors/${id}/licenses`, payload).then((r) => r.data),

  updateLicense: (
    id: string,
    licId: string,
    payload: { licenseNumber?: string; validUptoDate?: string }
  ) =>
    client.put<ApiResponse<DistributorLicense>>(`/distributors/${id}/licenses/${licId}`, payload).then((r) => r.data),

  deleteLicense: (id: string, licId: string) =>
    client.delete<ApiResponse<{ message: string }>>(`/distributors/${id}/licenses/${licId}`).then((r) => r.data),

  uploadDocuments: (id: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/distributors/${id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  deleteDocument: (id: string, docId: string) =>
    client.delete<ApiResponse<null>>(`/distributors/${id}/documents/${docId}`).then((r) => r.data),

  uploadDirectorDocuments: (distributorId: string, dirId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/distributors/${distributorId}/directors/${dirId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  uploadAuthorizedPersonDocuments: (distributorId: string, apId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/distributors/${distributorId}/authorized-persons/${apId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  uploadBankDetailsDocuments: (distributorId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/distributors/${distributorId}/bank-details/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  uploadLicenseDocuments: (distributorId: string, licId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/distributors/${distributorId}/licenses/${licId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  getDocumentUrl: (filePath: string) => `/api/v1/uploads/${filePath.split("/").pop() || filePath}`,
};
