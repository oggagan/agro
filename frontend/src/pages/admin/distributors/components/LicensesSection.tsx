import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Save } from "lucide-react";
import {
  useAddDistributorLicense,
  useUpdateDistributorLicense,
  useUploadDistributorLicenseDocuments,
  useDeleteDistributorDocument,
} from "@/hooks/useDistributors";
import InlineDocUpload from "../../manufacturers/components/InlineDocUpload";
import { distributorsApi } from "@/api/distributors.api";
import type { DistributorLicense } from "@/types/distributor";
import type { LicenseCategory } from "@/types/distributor";

const LICENSE_CATEGORIES: LicenseCategory[] = ["SEEDS", "INSECTICIDE", "FERTILIZER"];

interface LicensesSectionProps {
  distributorId: string;
  licenses: DistributorLicense[];
}

function filterDocs(lic: DistributorLicense, docType: string) {
  return (lic.documents ?? []).filter((d) => d.docType === docType);
}

export default function LicensesSection({ distributorId, licenses }: LicensesSectionProps) {
  const addLicense = useAddDistributorLicense();
  const updateLicense = useUpdateDistributorLicense();
  const uploadDocs = useUploadDistributorLicenseDocuments();
  const deleteDoc = useDeleteDistributorDocument();

  const [editingLicId, setEditingLicId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ licenseNumber: "", validUptoDate: "" });
  const [newCategory, setNewCategory] = useState<LicenseCategory | "">("");
  const [newForm, setNewForm] = useState({ licenseNumber: "", validUptoDate: "" });

  const existingCategories = licenses.map((l) => l.category);
  const canAdd = existingCategories.length < 3;

  const handleSaveEdit = (licId: string) => {
    updateLicense.mutate(
      { distributorId, licId, payload: editForm },
      { onSuccess: () => setEditingLicId(null) }
    );
  };

  const handleAdd = () => {
    if (!newCategory) return;
    addLicense.mutate(
      {
        distributorId,
        payload: {
          category: newCategory,
          licenseNumber: newForm.licenseNumber || undefined,
          validUptoDate: newForm.validUptoDate || undefined,
        },
      },
      {
        onSuccess: () => {
          setNewCategory("");
          setNewForm({ licenseNumber: "", validUptoDate: "" });
        },
      }
    );
  };

  const startEdit = (lic: DistributorLicense) => {
    setEditingLicId(lic.id);
    setEditForm({
      licenseNumber: lic.licenseNumber || "",
      validUptoDate: lic.validUptoDate ? lic.validUptoDate.slice(0, 10) : "",
    });
  };

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-medium">Licenses</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0 space-y-4">
        {licenses.map((lic) => (
          <div
            key={lic.id}
            className="border rounded-lg p-4 space-y-3 bg-muted/20"
          >
            <h4 className="text-sm font-medium text-foreground">{lic.category}</h4>
            {editingLicId === lic.id ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">License number</Label>
                  <Input
                    value={editForm.licenseNumber}
                    onChange={(e) => setEditForm((p) => ({ ...p, licenseNumber: e.target.value }))}
                    placeholder="License number"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valid upto</Label>
                  <Input
                    type="date"
                    value={editForm.validUptoDate}
                    onChange={(e) => setEditForm((p) => ({ ...p, validUptoDate: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-9"
                    onClick={() => handleSaveEdit(lic.id)}
                    disabled={updateLicense.isPending}
                  >
                    {updateLicense.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9" onClick={() => setEditingLicId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {lic.licenseNumber && <span>No. {lic.licenseNumber}</span>}
                {lic.validUptoDate && (
                  <span>Valid upto {new Date(lic.validUptoDate).toLocaleDateString()}</span>
                )}
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => startEdit(lic)}>
                  Edit
                </Button>
              </div>
            )}
            <InlineDocUpload
              label={`${lic.category} documents`}
              documents={filterDocs(lic, "license")}
              onUpload={(files) => uploadDocs.mutate({ distributorId, licId: lic.id, files, docType: "license" })}
              onDelete={(docId) => deleteDoc.mutate({ distributorId, docId })}
              uploading={uploadDocs.isPending}
              deleting={deleteDoc.isPending}
              getDocumentUrl={distributorsApi.getDocumentUrl}
            />
          </div>
        ))}

        {canAdd && (
          <div className="border border-dashed rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Add license</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as LicenseCategory | "")}
                >
                  <option value="">Select category</option>
                  {LICENSE_CATEGORIES.filter((c) => !existingCategories.includes(c)).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">License number</Label>
                <Input
                  value={newForm.licenseNumber}
                  onChange={(e) => setNewForm((p) => ({ ...p, licenseNumber: e.target.value }))}
                  placeholder="Optional"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valid upto</Label>
                <Input
                  type="date"
                  value={newForm.validUptoDate}
                  onChange={(e) => setNewForm((p) => ({ ...p, validUptoDate: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={handleAdd}
              disabled={!newCategory || addLicense.isPending}
            >
              {addLicense.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
              Add license
            </Button>
          </div>
        )}

        {licenses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No licenses added yet. Add one below.</p>
        )}
      </CardContent>
    </Card>
  );
}
