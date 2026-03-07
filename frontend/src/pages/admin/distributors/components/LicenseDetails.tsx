import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import InlineDocUpload from "../../manufacturers/components/InlineDocUpload";
import { distributorsApi } from "@/api/distributors.api";
import {
  useUpdateDistributor,
  useUploadDistributorDocuments,
  useDeleteDistributorDocument,
} from "@/hooks/useDistributors";
import type { ManufacturerDocument } from "@/types/manufacturer";

interface LicenseDetailsProps {
  distributorId: string;
  licenseNumber: string | null;
  licenseValidUpto: string | null;
  documents: ManufacturerDocument[];
  onSuccess?: () => void;
}

function filterDocs(docs: ManufacturerDocument[], docType: string) {
  return docs.filter((d) => d.docType === docType);
}

export default function LicenseDetails({
  distributorId,
  licenseNumber,
  licenseValidUpto,
  documents,
  onSuccess,
}: LicenseDetailsProps) {
  const updateDistributor = useUpdateDistributor();
  const uploadDocs = useUploadDistributorDocuments();
  const deleteDoc = useDeleteDistributorDocument();

  const [licenseNumberLocal, setLicenseNumberLocal] = useState(licenseNumber ?? "");
  const [validUptoLocal, setValidUptoLocal] = useState(
    licenseValidUpto ? licenseValidUpto.slice(0, 10) : ""
  );

  useEffect(() => {
    setLicenseNumberLocal(licenseNumber ?? "");
    setValidUptoLocal(licenseValidUpto ? licenseValidUpto.slice(0, 10) : "");
  }, [licenseNumber, licenseValidUpto]);

  const handleSave = () => {
    updateDistributor.mutate(
      {
        id: distributorId,
        payload: {
          licenseNumber: licenseNumberLocal || undefined,
          licenseValidUpto: validUptoLocal || undefined,
        },
      },
      { onSuccess }
    );
  };

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-medium">License</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground font-normal text-sm">License number</Label>
            <Input
              value={licenseNumberLocal}
              onChange={(e) => setLicenseNumberLocal(e.target.value)}
              placeholder="License number"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground font-normal text-sm">Valid upto</Label>
            <Input
              type="date"
              value={validUptoLocal}
              onChange={(e) => setValidUptoLocal(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
        <InlineDocUpload
          label="License document"
          documents={filterDocs(documents, "license")}
          onUpload={(files) => uploadDocs.mutate({ distributorId, files, docType: "license" })}
          onDelete={(docId) => deleteDoc.mutate({ distributorId, docId })}
          uploading={uploadDocs.isPending}
          deleting={deleteDoc.isPending}
          getDocumentUrl={distributorsApi.getDocumentUrl}
        />
        <Button
          onClick={handleSave}
          disabled={updateDistributor.isPending}
          className="bg-gradient-primary h-10"
        >
          {updateDistributor.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
