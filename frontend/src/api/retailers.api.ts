import client from "./client";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Retailer,
  RetailerLicense,
  CreateRetailerPayload,
  UpdateRetailerPayload,
  RetailerListParams,
} from "@/types/retailer";
import type { Director, AuthorizedPerson, BankDetails } from "@/types/manufacturer";
import type { ManufacturerDocument as DocType } from "@/types/manufacturer";
import type { UserStatus } from "@/types/auth";

export const retailersApi = {
  list: (params?: RetailerListParams) =>
    client.get<PaginatedResponse<Retailer>>("/retailers", { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<ApiResponse<Retailer>>(`/retailers/${id}`).then((r) => r.data),

  create: (payload: CreateRetailerPayload) =>
    client.post<ApiResponse<Retailer>>("/retailers", payload).then((r) => r.data),

  update: (id: string, payload: UpdateRetailerPayload) =>
    client.put<ApiResponse<Retailer>>(`/retailers/${id}`, payload).then((r) => r.data),

  updateStatus: (id: string, status: UserStatus) =>
    client.patch<ApiResponse<Retailer>>(`/retailers/${id}/status`, { status }).then((r) => r.data),

  addDirector: (id: string, payload: Record<string, unknown>) =>
    client.post<ApiResponse<Director>>(`/retailers/${id}/directors`, payload).then((r) => r.data),

  updateDirector: (id: string, dirId: string, payload: Record<string, unknown>) =>
    client.put<ApiResponse<Director>>(`/retailers/${id}/directors/${dirId}`, payload).then((r) => r.data),

  deleteDirector: (id: string, dirId: string) =>
    client.delete<ApiResponse<null>>(`/retailers/${id}/directors/${dirId}`).then((r) => r.data),

  addAuthorizedPerson: (id: string, payload: Record<string, unknown>) =>
    client.post<ApiResponse<AuthorizedPerson>>(`/retailers/${id}/authorized-persons`, payload).then((r) => r.data),

  updateAuthorizedPerson: (id: string, apId: string, payload: Record<string, unknown>) =>
    client.put<ApiResponse<AuthorizedPerson>>(`/retailers/${id}/authorized-persons/${apId}`, payload).then((r) => r.data),

  removeAuthorizedPerson: (id: string, apId: string) =>
    client.delete<ApiResponse<{ message: string }>>(`/retailers/${id}/authorized-persons/${apId}`).then((r) => r.data),

  upsertBankDetails: (id: string, payload: Record<string, unknown>) =>
    client.put<ApiResponse<BankDetails>>(`/retailers/${id}/bank-details`, payload).then((r) => r.data),

  addLicense: (id: string, payload: { category: string; licenseNumber?: string; validUptoDate?: string }) =>
    client.post<ApiResponse<RetailerLicense>>(`/retailers/${id}/licenses`, payload).then((r) => r.data),

  updateLicense: (
    id: string,
    licId: string,
    payload: { licenseNumber?: string; validUptoDate?: string }
  ) =>
    client.put<ApiResponse<RetailerLicense>>(`/retailers/${id}/licenses/${licId}`, payload).then((r) => r.data),

  deleteLicense: (id: string, licId: string) =>
    client.delete<ApiResponse<{ message: string }>>(`/retailers/${id}/licenses/${licId}`).then((r) => r.data),

  uploadDocuments: (id: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/retailers/${id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  deleteDocument: (id: string, docId: string) =>
    client.delete<ApiResponse<null>>(`/retailers/${id}/documents/${docId}`).then((r) => r.data),

  uploadDirectorDocuments: (retailerId: string, dirId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/retailers/${retailerId}/directors/${dirId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  uploadAuthorizedPersonDocuments: (retailerId: string, apId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/retailers/${retailerId}/authorized-persons/${apId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  uploadBankDetailsDocuments: (retailerId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/retailers/${retailerId}/bank-details/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  uploadLicenseDocuments: (retailerId: string, licId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<DocType[]>>(`/retailers/${retailerId}/licenses/${licId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  getDocumentUrl: (filePath: string) => `/api/v1/uploads/${filePath.split("/").pop() || filePath}`,
};
