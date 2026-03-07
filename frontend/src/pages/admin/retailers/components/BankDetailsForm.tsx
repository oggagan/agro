import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import {
  useUpsertRetailerBankDetails,
  useUploadRetailerBankDetailsDocuments,
  useDeleteRetailerDocument,
} from "@/hooks/useRetailers";
import InlineDocUpload from "../../manufacturers/components/InlineDocUpload";
import { retailersApi } from "@/api/retailers.api";
import type { BankDetails } from "@/types/manufacturer";

interface BankDetailsFormProps {
  retailerId: string;
  existing?: BankDetails | null;
}

export default function BankDetailsForm({ retailerId, existing }: BankDetailsFormProps) {
  const upsert = useUpsertRetailerBankDetails();
  const uploadBankDocs = useUploadRetailerBankDetailsDocuments();
  const deleteDoc = useDeleteRetailerDocument();

  const [form, setForm] = useState({
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        accountName: existing.accountName || "",
        accountNumber: existing.accountNumber || "",
        ifscCode: existing.ifscCode || "",
        bankName: existing.bankName || "",
      });
    }
  }, [existing]);

  const handleSave = () => {
    if (!form.accountName || !form.accountNumber || !form.ifscCode || !form.bankName) return;
    upsert.mutate({ retailerId, payload: form });
  };

  const docs = existing?.documents || [];
  const filterDocs = (docType: string) => docs.filter((d) => d.docType === docType);

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-medium">Bank</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground font-normal text-sm">Account name</Label>
            <Input
              value={form.accountName}
              onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))}
              placeholder="Account holder name"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground font-normal text-sm">Bank name</Label>
            <Input
              value={form.bankName}
              onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
              placeholder="State Bank of India"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground font-normal text-sm">Account number</Label>
            <Input
              value={form.accountNumber}
              onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
              placeholder="1234567890"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground font-normal text-sm">IFSC code</Label>
            <Input
              value={form.ifscCode}
              onChange={(e) => setForm((p) => ({ ...p, ifscCode: e.target.value }))}
              placeholder="SBIN0001234"
              maxLength={11}
              className="h-10"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={upsert.isPending} className="bg-gradient-primary h-10">
          {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>

        {existing && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Documents</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InlineDocUpload
                label="Cancelled Cheque"
                documents={filterDocs("cancelled_cheque")}
                onUpload={(files) =>
                  uploadBankDocs.mutate({ retailerId, files, docType: "cancelled_cheque" })
                }
                onDelete={(docId) => deleteDoc.mutate({ retailerId, docId })}
                uploading={uploadBankDocs.isPending}
                deleting={deleteDoc.isPending}
                getDocumentUrl={retailersApi.getDocumentUrl}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
