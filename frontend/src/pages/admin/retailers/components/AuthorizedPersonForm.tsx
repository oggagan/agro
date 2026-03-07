import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import {
  useAddRetailerAuthorizedPerson,
  useUpdateRetailerAuthorizedPerson,
  useUploadRetailerAuthorizedPersonDocuments,
  useDeleteRetailerDocument,
} from "@/hooks/useRetailers";
import InlineDocUpload from "../../manufacturers/components/InlineDocUpload";
import { retailersApi } from "@/api/retailers.api";
import type { RetailerAuthorizedPerson } from "@/types/retailer";

interface AuthorizedPersonFormProps {
  retailerId: string;
  apId?: string;
  existing?: RetailerAuthorizedPerson | null;
  onClose?: () => void;
}

export default function AuthorizedPersonForm({
  retailerId,
  apId,
  existing,
  onClose,
}: AuthorizedPersonFormProps) {
  const addAp = useAddRetailerAuthorizedPerson();
  const updateAp = useUpdateRetailerAuthorizedPerson();
  const uploadApDocs = useUploadRetailerAuthorizedPersonDocuments();
  const deleteDoc = useDeleteRetailerDocument();

  const isAdd = existing === null;
  const displayName = existing ? (existing.displayName ?? existing.user?.name ?? "") : "";
  const displayPhone = existing ? (existing.displayPhone ?? existing.user?.phones?.[0]?.number ?? "") : "";
  const displayEmail = existing ? (existing.displayEmail ?? existing.user?.emails?.[0]?.address ?? "") : "";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    aadhaarNumber: "",
    password: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: displayName,
        phone: displayPhone,
        email: displayEmail,
        aadhaarNumber: existing.aadhaarNumber ?? "",
        password: "",
      });
    } else if (!isAdd) {
      setForm({ name: "", phone: "", email: "", aadhaarNumber: "", password: "" });
    }
  }, [existing, isAdd, displayName, displayPhone, displayEmail]);

  const handleSave = () => {
    if (isAdd) {
      if (!form.name || !form.phone) return;
      if (!form.password || form.password.length < 8) return;
      addAp.mutate(
        {
          retailerId,
          payload: {
            name: form.name,
            phone: form.phone,
            email: form.email || undefined,
            aadhaarNumber: form.aadhaarNumber || undefined,
            password: form.password,
          },
        },
        { onSuccess: () => onClose?.() }
      );
      return;
    }
    if (apId) {
      updateAp.mutate(
        {
          retailerId,
          apId,
          payload: {
            name: form.name,
            phone: form.phone,
            email: form.email || undefined,
            aadhaarNumber: form.aadhaarNumber || undefined,
          },
        },
        { onSuccess: () => onClose?.() }
      );
    }
  };

  const docs = existing?.documents || [];
  const filterDocs = (docType: string) => docs.filter((d) => d.docType === docType);
  const pending = addAp.isPending || updateAp.isPending;
  const effectiveApId = apId ?? existing?.id;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone *</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))}
            placeholder="10-digit phone"
            maxLength={10}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email address"
          />
        </div>
        <div className="space-y-2">
          <Label>Aadhaar Number</Label>
          <Input
            value={form.aadhaarNumber}
            onChange={(e) => setForm((p) => ({ ...p, aadhaarNumber: e.target.value.replace(/\D/g, "") }))}
            placeholder="12-digit Aadhaar number"
            maxLength={12}
          />
        </div>
        {isAdd && (
          <div className="space-y-2 md:col-span-2">
            <Label>Password *</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Min 8 characters (required for login)"
              minLength={8}
            />
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={pending} className="bg-gradient-primary">
        {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        {isAdd ? "Add authorized person" : "Save"}
      </Button>

      {existing && effectiveApId && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Documents</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InlineDocUpload
              label="Aadhaar Front"
              documents={filterDocs("aadhaar_front")}
              onUpload={(files) =>
                uploadApDocs.mutate({ retailerId, apId: effectiveApId, files, docType: "aadhaar_front" })
              }
              onDelete={(docId) => deleteDoc.mutate({ retailerId, docId })}
              uploading={uploadApDocs.isPending}
              deleting={deleteDoc.isPending}
              getDocumentUrl={retailersApi.getDocumentUrl}
            />
            <InlineDocUpload
              label="Aadhaar Back"
              documents={filterDocs("aadhaar_back")}
              onUpload={(files) =>
                uploadApDocs.mutate({ retailerId, apId: effectiveApId, files, docType: "aadhaar_back" })
              }
              onDelete={(docId) => deleteDoc.mutate({ retailerId, docId })}
              uploading={uploadApDocs.isPending}
              deleting={deleteDoc.isPending}
              getDocumentUrl={retailersApi.getDocumentUrl}
            />
            <InlineDocUpload
              label="Declaration Document"
              documents={filterDocs("declaration")}
              onUpload={(files) =>
                uploadApDocs.mutate({ retailerId, apId: effectiveApId, files, docType: "declaration" })
              }
              onDelete={(docId) => deleteDoc.mutate({ retailerId, docId })}
              uploading={uploadApDocs.isPending}
              deleting={deleteDoc.isPending}
              getDocumentUrl={retailersApi.getDocumentUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}
