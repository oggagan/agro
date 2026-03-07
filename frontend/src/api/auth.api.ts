import client from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  LoginPayload,
  LoginResponse,
  RefreshPayload,
  RefreshResponse,
} from "@/types/auth";

export const authApi = {
  login: (payload: LoginPayload) =>
    client.post<ApiResponse<LoginResponse>>("/auth/login", payload).then((r) => r.data),

  refresh: (payload: RefreshPayload) =>
    client.post<ApiResponse<RefreshResponse>>("/auth/refresh", payload).then((r) => r.data),

  logout: (refreshToken: string) =>
    client.post<ApiResponse<null>>("/auth/logout", { refreshToken }).then((r) => r.data),
};
