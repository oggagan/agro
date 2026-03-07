import type { UserStatus } from "./auth";

export type CompanyType = "LIMITED" | "PVT_LTD" | "PROPRIETORSHIP" | "PARTNERSHIP";
export type DirectorType = "DIRECTOR" | "PARTNER" | "PROPRIETOR";

export interface Address {
  id: string;
  entityType: string;
  entityId: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Director {
  id: string;
  manufacturerId: string;
  userId: string;
  type: DirectorType;
  designation?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  documents?: ManufacturerDocument[];
  user?: { id: string; name: string; status: string; phones?: { number: string; isPrimary?: boolean }[]; emails?: { address: string; isPrimary?: boolean }[] } | null;
  displayName?: string | null;
  displayPhone?: string | null;
  displayEmail?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthorizedPerson {
  id: string;
  manufacturerId: string;
  userId: string;
  aadhaarNumber?: string | null;
  documents?: ManufacturerDocument[];
  user?: { id: string; name: string; status: string; phones?: { number: string; isPrimary?: boolean }[]; emails?: { address: string; isPrimary?: boolean }[] } | null;
  canLogin?: boolean;
  displayName?: string | null;
  displayPhone?: string | null;
  displayEmail?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BankDetails {
  id: string;
  entityType: string;
  entityId: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  documents?: ManufacturerDocument[];
  createdAt: string;
}

export interface ManufacturerDocument {
  id: string;
  entityType: string;
  entityId: string;
  docType: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface Manufacturer {
  id: string;
  userId: string;
  companyName: string;
  companyType: CompanyType;
  licenseNumber?: string;
  licenseValidUpto?: string;
  gstNumber?: string;
  udyogAadhaar?: string;
  companyPan?: string;
  canAddEditProducts: boolean;
  canManageBatch: boolean;
  isDraft: boolean;
  user: {
    id: string;
    name: string;
    status: UserStatus;
    role: string;
    phone?: string | null;
    email?: string | null;
    createdAt?: string;
    phones?: { number: string; isPrimary?: boolean }[];
    emails?: { address: string; isPrimary?: boolean }[];
  };
  addresses: Address[];
  directors: Director[];
  authorizedPersons: AuthorizedPerson[];
  bankDetails: BankDetails[];
  documents: ManufacturerDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateManufacturerPayload {
  phone?: string;
  phones?: { number: string; isPrimary?: boolean; label?: string }[];
  password: string;
  name: string;
  email?: string;
  emails?: { address: string; isPrimary?: boolean; label?: string }[];
  companyName: string;
  companyType: CompanyType;
  licenseNumber?: string;
  licenseValidUpto?: string;
  gstNumber?: string;
  udyogAadhaar?: string;
  companyPan?: string;
  address?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  directors?: {
    type: DirectorType;
    name: string;
    designation?: string;
    phone?: string;
    phones?: { number: string; isPrimary?: boolean; label?: string }[];
    email?: string;
    emails?: { address: string; isPrimary?: boolean; label?: string }[];
    aadhaarNumber?: string;
    panNumber?: string;
  }[];
  authorizedPersons?: {
    name: string;
    phone?: string;
    phones?: { number: string; isPrimary?: boolean; label?: string }[];
    email?: string;
    emails?: { address: string; isPrimary?: boolean; label?: string }[];
    password: string;
    aadhaarNumber?: string;
  }[];
}

export interface UpdateManufacturerPayload {
  companyName?: string;
  companyType?: CompanyType;
  licenseNumber?: string;
  licenseValidUpto?: string;
  gstNumber?: string;
  udyogAadhaar?: string;
  companyPan?: string;
  address?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface ManufacturerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
}
