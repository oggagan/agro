import client from "./client";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Manufacturer,
  CreateManufacturerPayload,
  UpdateManufacturerPayload,
  ManufacturerListParams,
  Director,
  AuthorizedPerson,
  BankDetails,
  ManufacturerDocument,
} from "@/types/manufacturer";
import type { UserStatus } from "@/types/auth";

export const manufacturersApi = {
  list: (params?: ManufacturerListParams) =>
    client.get<PaginatedResponse<Manufacturer>>("/manufacturers", { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<ApiResponse<Manufacturer>>(`/manufacturers/${id}`).then((r) => r.data),

  create: (payload: CreateManufacturerPayload) =>
    client.post<ApiResponse<Manufacturer>>("/manufacturers", payload).then((r) => r.data),

  update: (id: string, payload: UpdateManufacturerPayload) =>
    client.put<ApiResponse<Manufacturer>>(`/manufacturers/${id}`, payload).then((r) => r.data),

  updateStatus: (id: string, status: UserStatus) =>
    client.patch<ApiResponse<Manufacturer>>(`/manufacturers/${id}/status`, { status }).then((r) => r.data),

  addDirector: (id: string, payload: Record<string, any>) =>
    client.post<ApiResponse<Director>>(`/manufacturers/${id}/directors`, payload).then((r) => r.data),

  updateDirector: (id: string, dirId: string, payload: Record<string, any>) =>
    client.put<ApiResponse<Director>>(`/manufacturers/${id}/directors/${dirId}`, payload).then((r) => r.data),

  deleteDirector: (id: string, dirId: string) =>
    client.delete<ApiResponse<null>>(`/manufacturers/${id}/directors/${dirId}`).then((r) => r.data),

  upsertBankDetails: (id: string, payload: Record<string, any>) =>
    client.put<ApiResponse<BankDetails>>(`/manufacturers/${id}/bank-details`, payload).then((r) => r.data),

  upsertAuthorizedPerson: (id: string, payload: Record<string, any>) =>
    client.put<ApiResponse<AuthorizedPerson>>(`/manufacturers/${id}/authorized-person`, payload).then((r) => r.data),

  addAuthorizedPerson: (id: string, payload: Record<string, any>) =>
    client.post<ApiResponse<AuthorizedPerson>>(`/manufacturers/${id}/authorized-persons`, payload).then((r) => r.data),

  updateAuthorizedPerson: (id: string, apId: string, payload: Record<string, any>) =>
    client.put<ApiResponse<AuthorizedPerson>>(`/manufacturers/${id}/authorized-persons/${apId}`, payload).then((r) => r.data),

  removeAuthorizedPerson: (id: string, apId: string) =>
    client.delete<ApiResponse<{ message: string }>>(`/manufacturers/${id}/authorized-persons/${apId}`).then((r) => r.data),

  uploadAuthorizedPersonDocumentsByApId: (mfgId: string, apId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<ManufacturerDocument[]>>(`/manufacturers/${mfgId}/authorized-persons/${apId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  uploadDocuments: (id: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<ManufacturerDocument[]>>(`/manufacturers/${id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  deleteDocument: (id: string, docId: string) =>
    client.delete<ApiResponse<null>>(`/manufacturers/${id}/documents/${docId}`).then((r) => r.data),

  uploadDirectorDocuments: (mfgId: string, dirId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<ManufacturerDocument[]>>(`/manufacturers/${mfgId}/directors/${dirId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  uploadAuthorizedPersonDocuments: (mfgId: string, apId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<ManufacturerDocument[]>>(`/manufacturers/${mfgId}/authorized-persons/${apId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  uploadBankDetailsDocuments: (mfgId: string, files: File[], docType: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docType", docType);
    return client
      .post<ApiResponse<ManufacturerDocument[]>>(`/manufacturers/${mfgId}/bank-details/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  getDocumentUrl: (filePath: string) => `/api/v1/uploads/${filePath.split("/").pop() || filePath}`,
};
