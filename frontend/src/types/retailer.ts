import type { UserStatus } from "./auth";
import type {
  CompanyType,
  Address,
  Director,
  AuthorizedPerson,
  BankDetails,
  ManufacturerDocument,
} from "./manufacturer";

// Director/AP may come from manufacturer or retailer API (manufacturerId or retailerId)
export type RetailerDirector = Omit<Director, "manufacturerId"> & {
  manufacturerId?: string;
  retailerId?: string;
};
export type RetailerAuthorizedPerson = Omit<AuthorizedPerson, "manufacturerId"> & {
  manufacturerId?: string;
  retailerId?: string;
};

export type LicenseCategory = "SEEDS" | "INSECTICIDE" | "FERTILIZER";

export interface RetailerLicense {
  id: string;
  retailerId: string;
  category: LicenseCategory;
  licenseNumber?: string;
  validUptoDate?: string;
  documents?: ManufacturerDocument[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Retailer {
  id: string;
  userId: string;
  companyName: string;
  companyType: CompanyType;
  gstNumber?: string;
  companyPan?: string;
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
  createdByUser?: { id: string; name: string } | null;
  addresses: Address[];
  directors: RetailerDirector[];
  authorizedPersons: RetailerAuthorizedPerson[];
  bankDetails: BankDetails[];
  licenses: RetailerLicense[];
  documents: ManufacturerDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRetailerPayload {
  phone?: string;
  phones?: { number: string; isPrimary?: boolean; label?: string }[];
  password: string;
  name: string;
  email?: string;
  emails?: { address: string; isPrimary?: boolean; label?: string }[];
  companyName: string;
  companyType: "PVT_LTD" | "PROPRIETORSHIP" | "PARTNERSHIP";
  gstNumber?: string;
  companyPan?: string;
  isDraft?: boolean;
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
  licenses?: {
    category: LicenseCategory;
    licenseNumber?: string;
    validUptoDate?: string;
  }[];
  directors?: {
    type: "DIRECTOR" | "PARTNER" | "PROPRIETOR";
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

export interface UpdateRetailerPayload {
  companyName?: string;
  companyType?: "PVT_LTD" | "PROPRIETORSHIP" | "PARTNERSHIP";
  gstNumber?: string;
  companyPan?: string;
  isDraft?: boolean;
  address?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface RetailerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  companyType?: "PVT_LTD" | "PROPRIETORSHIP" | "PARTNERSHIP";
}
