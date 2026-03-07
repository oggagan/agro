export type UserRole = "SUPER_ADMIN" | "MANUFACTURER" | "AUTHORIZED_PERSON" | "DIRECTOR" | "DISTRIBUTOR" | "RETAILER" | "AGRONOMIST";
export type UserStatus = "ACTIVE" | "INACTIVE" | "DRAFT" | "PENDING" | "REJECTED";

export interface PhoneEntry {
  id: string;
  number: string;
  isPrimary: boolean;
  label: string | null;
}

export interface EmailEntry {
  id: string;
  address: string;
  isPrimary: boolean;
  label: string | null;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
  email?: string | null;
  phones?: PhoneEntry[];
  emails?: EmailEntry[];
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  phone?: string;
  email?: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
