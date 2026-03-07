import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usersApi, type UpdateProfilePayload, type ListUsersParams } from "@/api/users.api";
import { useAuthStore } from "@/stores/authStore";
import type { UserStatus } from "@/types/auth";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => usersApi.getMe(),
    select: (data) => data.data,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => usersApi.updateMe(payload),
    onSuccess: (data) => {
      setUser(data.data);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Update failed"),
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      usersApi.changePassword(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Password changed");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message || "Password change failed"),
  });
}

export function useUserList(params?: ListUsersParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.listUsers(params),
    select: (data) => data.data,
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      usersApi.updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User status updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Status update failed"),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      queryClient.invalidateQueries({ queryKey: ["retailers"] });
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      toast.success("User deleted");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || "Delete failed"),
  });
}
