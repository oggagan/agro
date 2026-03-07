import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import type { LoginPayload } from "@/types/auth";

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome, ${user.name}!`);
      navigate("/dashboard/admin/manufacturers");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Login failed"),
  });
}

export function useLogout() {
  const { refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!refreshToken) return Promise.resolve(null);
      return authApi.logout(refreshToken);
    },
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate("/login");
    },
  });
}
