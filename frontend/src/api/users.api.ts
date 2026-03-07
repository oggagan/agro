import client from "./client";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { User, UserStatus } from "@/types/auth";

export interface UpdateProfilePayload {
  name?: string;
  emails?: { address: string; isPrimary?: boolean; label?: string }[];
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export const usersApi = {
  getMe: () => client.get<ApiResponse<User>>("/users/me").then((r) => r.data),

  updateMe: (payload: UpdateProfilePayload) =>
    client.patch<ApiResponse<User>>("/users/me", payload).then((r) => r.data),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    client.patch<ApiResponse<null>>("/users/me/password", payload).then((r) => r.data),

  listUsers: (params?: ListUsersParams) =>
    client.get<PaginatedResponse<User>>("/users", { params }).then((r) => r.data),

  getUserById: (id: string) =>
    client.get<ApiResponse<User>>(`/users/${id}`).then((r) => r.data),

  updateUserStatus: (id: string, status: UserStatus) =>
    client.patch<ApiResponse<User>>(`/users/${id}/status`, { status }).then((r) => r.data),

  deleteUser: (id: string) =>
    client.delete<ApiResponse<null>>(`/users/${id}`).then((r) => r.data),
};
