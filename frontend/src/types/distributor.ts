import type { UserStatus } from "./auth";
import type {
  CompanyType,
  Address,
  Director,
  AuthorizedPerson,
  BankDetails,
  ManufacturerDocument,
} from "./manufacturer";

export type DistributorType = "STATE_DISTRIBUTOR" | "UNDER_MANUFACTURER" | "UNDER_RETAILER";

export type DistributorDirector = Omit<Director, "manufacturerId"> & {
  manufacturerId?: string;
  retailerId?: string;
  distributorId?: string;
};
export type DistributorAuthorizedPerson = Omit<AuthorizedPerson, "manufacturerId"> & {
  manufacturerId?: string;
  retailerId?: string;
  distributorId?: string;
};

export type LicenseCategory = "SEEDS" | "INSECTICIDE" | "FERTILIZER";

export interface DistributorLicense {
  id: string;
  distributorId: string;
  category: LicenseCategory;
  licenseNumber?: string;
  validUptoDate?: string;
  documents?: ManufacturerDocument[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Distributor {
  id: string;
  userId: string;
  distributorType: DistributorType;
  gstNumber?: string;
  licenseNumber?: string;
  licenseValidUpto?: string;
  manufacturerId?: string;
  retailerId?: string;
  companyName?: string;
  companyType?: CompanyType;
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
  manufacturer?: { id: string; companyName: string } | null;
  retailer?: { id: string; companyName: string } | null;
  addresses: Address[];
  directors: DistributorDirector[];
  authorizedPersons: DistributorAuthorizedPerson[];
  bankDetails: BankDetails[];
  licenses: DistributorLicense[];
  documents: ManufacturerDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDistributorPayload {
  distributorType: DistributorType;
  phone?: string;
  phones?: { number: string; isPrimary?: boolean; label?: string }[];
  password: string;
  name: string;
  email?: string;
  emails?: { address: string; isPrimary?: boolean; label?: string }[];
  gstNumber?: string;
  address?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  isDraft?: boolean;
  licenseNumber?: string;
  licenseValidUpto?: string;
  manufacturerId?: string;
  retailerId?: string;
  companyName?: string;
  companyType?: "PVT_LTD" | "PROPRIETORSHIP" | "PARTNERSHIP";
  companyPan?: string;
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
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
}

export interface UpdateDistributorPayload {
  gstNumber?: string | null;
  licenseNumber?: string | null;
  licenseValidUpto?: string | null;
  manufacturerId?: string | null;
  retailerId?: string | null;
  companyName?: string | null;
  companyType?: "PVT_LTD" | "PROPRIETORSHIP" | "PARTNERSHIP" | "LIMITED" | null;
  companyPan?: string | null;
  isDraft?: boolean;
  address?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface DistributorListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  distributorType?: DistributorType;
}
