import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanyTypeConfig, RETAILER_COMPANY_TYPES } from "@/lib/companyTypeConfig";
import InlineDocUpload from "../../manufacturers/components/InlineDocUpload";
import { distributorsApi } from "@/api/distributors.api";
import type { ManufacturerDocument } from "@/types/manufacturer";

type DistributorCompanyType = "PVT_LTD" | "PROPRIETORSHIP" | "PARTNERSHIP";

interface CompanyDetailsProps {
  values: {
    companyName: string;
    companyType: DistributorCompanyType;
    gstNumber: string;
    companyPan: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    pincode: string;
  };
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
  documents?: ManufacturerDocument[];
  onUploadDoc?: (files: File[], docType: string) => void;
  onDeleteDoc?: (docId: string) => void;
  uploading?: boolean;
  deleting?: boolean;
}

function filterDocs(docs: ManufacturerDocument[], docType: string) {
  return docs.filter((d) => d.docType === docType);
}

export default function CompanyDetails({
  values,
  onChange,
  disabled,
  documents = [],
  onUploadDoc,
  onDeleteDoc,
  uploading = false,
  deleting = false,
}: CompanyDetailsProps) {
  const config = getCompanyTypeConfig(values.companyType);
  const isEdit = !!onUploadDoc;

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-medium">Company</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-muted-foreground font-normal text-sm">
              Company name
            </Label>
            <Input
              id="companyName"
              value={values.companyName}
              onChange={(e) => onChange("companyName", e.target.value)}
              placeholder="Company name"
              disabled={disabled}
              className="h-10"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyType" className="text-muted-foreground font-normal text-sm">
              Type
            </Label>
            <Select
              value={values.companyType}
              onValueChange={(v) => onChange("companyType", v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {RETAILER_COMPANY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground">GST</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gstNumber" className="text-muted-foreground font-normal text-sm">
                GST number
              </Label>
              <Input
                id="gstNumber"
                value={values.gstNumber}
                onChange={(e) => onChange("gstNumber", e.target.value)}
                placeholder="27AABCU9603R1ZM"
                disabled={disabled}
                className="h-10"
              />
            </div>
          </div>
          {isEdit && onUploadDoc && onDeleteDoc && (
            <InlineDocUpload
              label="GST Document"
              documents={filterDocs(documents, "gst")}
              onUpload={(files) => onUploadDoc(files, "gst")}
              onDelete={onDeleteDoc}
              uploading={uploading}
              deleting={deleting}
              getDocumentUrl={distributorsApi.getDocumentUrl}
            />
          )}
        </div>

        {config.showCompanyPan && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground">Company PAN</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="companyPan" className="text-muted-foreground font-normal text-sm">
                  PAN number
                </Label>
                <Input
                  id="companyPan"
                  value={values.companyPan}
                  onChange={(e) => onChange("companyPan", e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  disabled={disabled}
                  className="h-10"
                />
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="address1" className="text-muted-foreground font-normal text-sm">
                Line 1
              </Label>
              <Input
                id="address1"
                value={values.address1}
                onChange={(e) => onChange("address1", e.target.value)}
                placeholder="Street address"
                disabled={disabled}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="address2" className="text-muted-foreground font-normal text-sm">
                Line 2
              </Label>
              <Input
                id="address2"
                value={values.address2}
                onChange={(e) => onChange("address2", e.target.value)}
                placeholder="Apartment, suite, etc."
                disabled={disabled}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-muted-foreground font-normal text-sm">
                City
              </Label>
              <Input
                id="city"
                value={values.city}
                onChange={(e) => onChange("city", e.target.value)}
                placeholder="City"
                disabled={disabled}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-muted-foreground font-normal text-sm">
                State
              </Label>
              <Input
                id="state"
                value={values.state}
                onChange={(e) => onChange("state", e.target.value)}
                placeholder="State"
                disabled={disabled}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pincode" className="text-muted-foreground font-normal text-sm">
                Pincode
              </Label>
              <Input
                id="pincode"
                value={values.pincode}
                onChange={(e) => onChange("pincode", e.target.value.replace(/\D/g, ""))}
                placeholder="110001"
                maxLength={6}
                disabled={disabled}
                className="h-10"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
