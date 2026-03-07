import type { CompanyType, DirectorType } from "@/types/manufacturer";

export interface CompanyTypeConfig {
  showCompanyPan: boolean;
  showUdyogAadhaar: boolean;
  showAuthorizedPerson: boolean;
  tabLabel: string;
  personLabel: string;
  directorType: DirectorType;
  maxPersons: number | null;
  minPersons: number;
}

/** Company types allowed for retailers (no LIMITED). */
export const RETAILER_COMPANY_TYPES: CompanyType[] = ["PROPRIETORSHIP", "PARTNERSHIP", "PVT_LTD"];

export const COMPANY_TYPE_CONFIG: Record<CompanyType, CompanyTypeConfig> = {
  LIMITED: {
    showCompanyPan: true,
    showUdyogAadhaar: false,
    showAuthorizedPerson: true,
    tabLabel: "Directors",
    personLabel: "Director",
    directorType: "DIRECTOR",
    maxPersons: null,
    minPersons: 2,
  },
  PVT_LTD: {
    showCompanyPan: true,
    showUdyogAadhaar: false,
    showAuthorizedPerson: true,
    tabLabel: "Directors",
    personLabel: "Director",
    directorType: "DIRECTOR",
    maxPersons: null,
    minPersons: 2,
  },
  PARTNERSHIP: {
    showCompanyPan: true,
    showUdyogAadhaar: false,
    showAuthorizedPerson: true,
    tabLabel: "Partners",
    personLabel: "Partner",
    directorType: "PARTNER",
    maxPersons: null,
    minPersons: 2,
  },
  PROPRIETORSHIP: {
    showCompanyPan: false,
    showUdyogAadhaar: true,
    showAuthorizedPerson: false,
    tabLabel: "Proprietor",
    personLabel: "Proprietor",
    directorType: "PROPRIETOR",
    maxPersons: 1,
    minPersons: 1,
  },
};

export function getCompanyTypeConfig(type: CompanyType): CompanyTypeConfig {
  return COMPANY_TYPE_CONFIG[type];
}
