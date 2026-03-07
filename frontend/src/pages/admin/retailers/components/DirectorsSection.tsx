import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import {
  useAddRetailerDirector,
  useUpdateRetailerDirector,
  useDeleteRetailerDirector,
  useUploadRetailerDirectorDocuments,
  useDeleteRetailerDocument,
} from "@/hooks/useRetailers";
import { getCompanyTypeConfig } from "@/lib/companyTypeConfig";
import InlineDocUpload from "../../manufacturers/components/InlineDocUpload";
import { retailersApi } from "@/api/retailers.api";
import type { RetailerDirector } from "@/types/retailer";
import type { CompanyType } from "@/types/manufacturer";

interface DirectorsSectionProps {
  retailerId: string;
  directors: RetailerDirector[];
  companyType: CompanyType;
}

export default function DirectorsSection({
  retailerId,
  directors,
  companyType,
}: DirectorsSectionProps) {
  const config = getCompanyTypeConfig(companyType);
  const addDirector = useAddRetailerDirector();
  const updateDirector = useUpdateRetailerDirector();
  const deleteDirector = useDeleteRetailerDirector();

  const [newDirector, setNewDirector] = useState({
    name: "",
    designation: "",
    phone: "",
    email: "",
    aadhaarNumber: "",
    panNumber: "",
  });
  const [showNew, setShowNew] = useState(false);

  const canAdd = config.maxPersons === null || directors.length < config.maxPersons;

  const handleAdd = () => {
    if (!newDirector.name || !newDirector.phone) return;
    addDirector.mutate(
      {
        retailerId,
        payload: {
          type: config.directorType,
          name: newDirector.name,
          designation: newDirector.designation || undefined,
          phone: newDirector.phone,
          email: newDirector.email || undefined,
          aadhaarNumber: newDirector.aadhaarNumber || undefined,
          panNumber: newDirector.panNumber || undefined,
        },
      },
      {
        onSuccess: () => {
          setNewDirector({ name: "", designation: "", phone: "", email: "", aadhaarNumber: "", panNumber: "" });
          setShowNew(false);
        },
      }
    );
  };

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
        <CardTitle className="text-base font-medium">{config.tabLabel}</CardTitle>
        {canAdd && (
          <Button variant="outline" size="sm" className="h-9" onClick={() => setShowNew(!showNew)}>
            <Plus className="h-4 w-4 mr-1" /> Add {config.personLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-5 pt-0">
        {directors.map((dir, idx) => (
          <DirectorRow
            key={dir.id}
            director={dir}
            index={idx}
            retailerId={retailerId}
            personLabel={config.personLabel}
            onUpdate={updateDirector}
            onDelete={deleteDirector}
          />
        ))}

        {directors.length === 0 && !showNew && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No {config.tabLabel.toLowerCase()} added yet
          </p>
        )}

        {showNew && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <h4 className="text-sm font-medium">New {config.personLabel}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={newDirector.name}
                  onChange={(e) => setNewDirector((p) => ({ ...p, name: e.target.value }))}
                  placeholder={`${config.personLabel} name`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Designation</Label>
                <Input
                  value={newDirector.designation}
                  onChange={(e) => setNewDirector((p) => ({ ...p, designation: e.target.value }))}
                  placeholder="e.g. Managing Director"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone *</Label>
                <Input
                  value={newDirector.phone}
                  onChange={(e) => setNewDirector((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))}
                  placeholder="10-digit phone"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  value={newDirector.email}
                  onChange={(e) => setNewDirector((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Aadhaar Number</Label>
                <Input
                  value={newDirector.aadhaarNumber}
                  onChange={(e) => setNewDirector((p) => ({ ...p, aadhaarNumber: e.target.value.replace(/\D/g, "") }))}
                  placeholder="12-digit Aadhaar"
                  maxLength={12}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PAN Number</Label>
                <Input
                  value={newDirector.panNumber}
                  onChange={(e) => setNewDirector((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={addDirector.isPending}>
                {addDirector.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DirectorRow({
  director,
  index,
  retailerId,
  personLabel,
  onUpdate,
  onDelete,
}: {
  director: RetailerDirector;
  index: number;
  retailerId: string;
  personLabel: string;
  onUpdate: ReturnType<typeof useUpdateRetailerDirector>;
  onDelete: ReturnType<typeof useDeleteRetailerDirector>;
}) {
  const uploadDirDocs = useUploadRetailerDirectorDocuments();
  const deleteDoc = useDeleteRetailerDocument();

  const displayName = director.displayName ?? director.user?.name ?? "";
  const displayPhone = director.displayPhone ?? director.user?.phones?.[0]?.number ?? "";
  const displayEmail = director.displayEmail ?? director.user?.emails?.[0]?.address ?? "";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: displayName,
    designation: director.designation || "",
    phone: displayPhone,
    email: displayEmail,
    aadhaarNumber: director.aadhaarNumber || "",
    panNumber: director.panNumber || "",
  });

  useEffect(() => {
    setForm({
      name: displayName,
      designation: director.designation || "",
      phone: displayPhone,
      email: displayEmail,
      aadhaarNumber: director.aadhaarNumber || "",
      panNumber: director.panNumber || "",
    });
  }, [director.id, displayName, displayPhone, displayEmail, director.designation, director.aadhaarNumber, director.panNumber]);

  const handleSave = () => {
    onUpdate.mutate(
      {
        retailerId,
        dirId: director.id,
        payload: {
          name: form.name,
          designation: form.designation || undefined,
          phone: form.phone,
          email: form.email || undefined,
          aadhaarNumber: form.aadhaarNumber || undefined,
          panNumber: form.panNumber || undefined,
        },
      },
      { onSuccess: () => setEditing(false) }
    );
  };

  const docs = director.documents || [];
  const filterDocs = (docType: string) => docs.filter((d) => d.docType === docType);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-medium">{personLabel} {index + 1}</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} disabled={!editing} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Designation</Label>
          <Input value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} disabled={!editing} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} disabled={!editing} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} disabled={!editing} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Aadhaar Number</Label>
          <Input
            value={form.aadhaarNumber}
            onChange={(e) => setForm((p) => ({ ...p, aadhaarNumber: e.target.value.replace(/\D/g, "") }))}
            placeholder="12-digit Aadhaar"
            maxLength={12}
            disabled={!editing}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PAN Number</Label>
          <Input
            value={form.panNumber}
            onChange={(e) => setForm((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
            placeholder="ABCDE1234F"
            maxLength={10}
            disabled={!editing}
          />
        </div>
      </div>

      <div className="border-t pt-3 space-y-3">
        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InlineDocUpload
            label="Aadhaar Front"
            documents={filterDocs("aadhaar_front")}
            onUpload={(files) =>
              uploadDirDocs.mutate({ retailerId, dirId: director.id, files, docType: "aadhaar_front" })
            }
            onDelete={(docId) => deleteDoc.mutate({ retailerId, docId })}
            uploading={uploadDirDocs.isPending}
            deleting={deleteDoc.isPending}
            getDocumentUrl={retailersApi.getDocumentUrl}
          />
          <InlineDocUpload
            label="Aadhaar Back"
            documents={filterDocs("aadhaar_back")}
            onUpload={(files) =>
              uploadDirDocs.mutate({ retailerId, dirId: director.id, files, docType: "aadhaar_back" })
            }
            onDelete={(docId) => deleteDoc.mutate({ retailerId, docId })}
            uploading={uploadDirDocs.isPending}
            deleting={deleteDoc.isPending}
            getDocumentUrl={retailersApi.getDocumentUrl}
          />
          <InlineDocUpload
            label="PAN Front"
            documents={filterDocs("pan_front")}
            onUpload={(files) =>
              uploadDirDocs.mutate({ retailerId, dirId: director.id, files, docType: "pan_front" })
            }
            onDelete={(docId) => deleteDoc.mutate({ retailerId, docId })}
            uploading={uploadDirDocs.isPending}
            deleting={deleteDoc.isPending}
            getDocumentUrl={retailersApi.getDocumentUrl}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} disabled={onUpdate.isPending}>
              {onUpdate.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => onDelete.mutate({ retailerId, dirId: director.id })}
              disabled={onDelete.isPending}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
