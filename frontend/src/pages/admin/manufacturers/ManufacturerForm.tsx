import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import CompanyDetails from "./components/CompanyDetails";
import BankDetailsForm from "./components/BankDetailsForm";
import DirectorsSection from "./components/DirectorsSection";
import AuthorizedPersonsSection from "./components/AuthorizedPersonsSection";
import {
  useManufacturer,
  useCreateManufacturer,
  useUpdateManufacturer,
  useUploadDocuments,
  useDeleteDocument,
} from "@/hooks/useManufacturers";
import { getCompanyTypeConfig } from "@/lib/companyTypeConfig";
import type { CompanyType } from "@/types/manufacturer";

export default function ManufacturerForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: manufacturer, isLoading } = useManufacturer(id);
  const createMfg = useCreateManufacturer();
  const updateMfg = useUpdateManufacturer();
  const uploadDocs = useUploadDocuments();
  const deleteDocs = useDeleteDocument();

  const [userForm, setUserForm] = useState({
    phone: "",
    password: "",
    name: "",
    email: "",
  });

  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    companyType: "LIMITED" as CompanyType,
    gstNumber: "",
    companyPan: "",
    udyogAadhaar: "",
    licenseNumber: "",
    licenseValidUpto: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [initialized, setInitialized] = useState(false);
  if (isEdit && manufacturer && !initialized) {
    const addr = manufacturer.addresses?.[0];
    setCompanyForm({
      companyName: manufacturer.companyName || "",
      companyType: manufacturer.companyType || "LIMITED",
      gstNumber: manufacturer.gstNumber || "",
      companyPan: manufacturer.companyPan || "",
      udyogAadhaar: manufacturer.udyogAadhaar || "",
      licenseNumber: manufacturer.licenseNumber || "",
      licenseValidUpto: manufacturer.licenseValidUpto ? manufacturer.licenseValidUpto.slice(0, 10) : "",
      address1: addr?.address1 || "",
      address2: addr?.address2 || "",
      city: addr?.city || "",
      state: addr?.state || "",
      pincode: addr?.pincode || "",
    });
    setInitialized(true);
  }

  const config = getCompanyTypeConfig(companyForm.companyType);

  const primaryUser = manufacturer?.user;
  const primaryPhone =
    primaryUser?.phones?.[0]?.number ?? (primaryUser as { phone?: string })?.phone ?? "";
  const primaryEmail =
    primaryUser?.emails?.[0]?.address ?? (primaryUser as { email?: string })?.email ?? "";

  const handleCompanyChange = (field: string, value: string) => {
    setCompanyForm((p) => ({ ...p, [field]: value }));
  };

  const handleCreate = () => {
    if (!userForm.phone || !userForm.password || !userForm.name || !companyForm.companyName) return;

    createMfg.mutate(
      {
        phone: userForm.phone,
        password: userForm.password,
        name: userForm.name,
        email: userForm.email || undefined,
        companyName: companyForm.companyName,
        companyType: companyForm.companyType,
        gstNumber: companyForm.gstNumber || undefined,
        companyPan: companyForm.companyPan || undefined,
        udyogAadhaar: companyForm.udyogAadhaar || undefined,
        licenseNumber: companyForm.licenseNumber || undefined,
        licenseValidUpto: companyForm.licenseValidUpto || undefined,
        address: companyForm.address1 ? {
          address1: companyForm.address1,
          address2: companyForm.address2 || undefined,
          city: companyForm.city,
          state: companyForm.state,
          pincode: companyForm.pincode,
        } : undefined,
      },
      { onSuccess: () => navigate("/dashboard/admin/manufacturers") },
    );
  };

  const handleUploadDoc = (files: File[], docType: string) => {
    if (!id) return;
    uploadDocs.mutate({ mfgId: id, files, docType });
  };

  const handleDeleteDoc = (docId: string) => {
    if (!id) return;
    deleteDocs.mutate({ mfgId: id, docId });
  };

  const handleUpdate = () => {
    if (!id) return;
    updateMfg.mutate(
      {
        id,
        payload: {
          companyName: companyForm.companyName,
          companyType: companyForm.companyType,
          gstNumber: companyForm.gstNumber || undefined,
          companyPan: companyForm.companyPan || undefined,
          udyogAadhaar: companyForm.udyogAadhaar || undefined,
          licenseNumber: companyForm.licenseNumber || undefined,
          licenseValidUpto: companyForm.licenseValidUpto || undefined,
          address: companyForm.address1 ? {
            address1: companyForm.address1,
            address2: companyForm.address2 || undefined,
            city: companyForm.city,
            state: companyForm.state,
            pincode: companyForm.pincode,
          } : undefined,
        },
      },
      { onSuccess: () => navigate("/dashboard/admin/manufacturers") },
    );
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/admin/manufacturers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {isEdit ? "Edit manufacturer" : "Add manufacturer"}
          </h1>
          {isEdit && manufacturer?.companyName && (
            <p className="text-sm text-muted-foreground mt-0.5">{manufacturer.companyName}</p>
          )}
        </div>
      </div>

      {isEdit ? (
        <Tabs defaultValue="account" className="space-y-5">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="directors">{config.tabLabel}</TabsTrigger>
            <TabsTrigger value="authorized">Authorized</TabsTrigger>
            <TabsTrigger value="bank">Bank</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-5">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-base font-medium">Primary account</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-normal text-sm">Name</Label>
                      <Input
                        value={primaryUser?.name ?? ""}
                        disabled
                        readOnly
                        className="h-10 bg-muted/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-normal text-sm">Phone</Label>
                      <Input
                        value={primaryPhone}
                        disabled
                        readOnly
                        className="h-10 bg-muted/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-normal text-sm">Email</Label>
                      <Input
                        value={primaryEmail}
                        disabled
                        readOnly
                        className="h-10 bg-muted/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-normal text-sm">Status</Label>
                      <Input
                        value={primaryUser?.status?.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) ?? ""}
                        disabled
                        readOnly
                        className="h-10 bg-muted/50"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="company" className="mt-5">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <CompanyDetails
                values={companyForm}
                onChange={handleCompanyChange}
                documents={manufacturer?.documents || []}
                onUploadDoc={handleUploadDoc}
                onDeleteDoc={handleDeleteDoc}
                uploading={uploadDocs.isPending}
                deleting={deleteDocs.isPending}
              />
              <Button
                onClick={handleUpdate}
                disabled={updateMfg.isPending}
                className="bg-gradient-primary h-10"
              >
                {updateMfg.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="directors" className="mt-5">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <DirectorsSection
                manufacturerId={id!}
                directors={manufacturer?.directors || []}
                companyType={companyForm.companyType}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="authorized" className="mt-5">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <AuthorizedPersonsSection
                manufacturerId={id!}
                authorizedPersons={manufacturer?.authorizedPersons ?? []}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="bank" className="mt-5">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <BankDetailsForm manufacturerId={id!} existing={manufacturer?.bankDetails?.[0]} />
            </motion.div>
          </TabsContent>
        </Tabs>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <Card className="border-0 shadow-md bg-card">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-base font-medium">Account</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-normal text-sm">Name</Label>
                  <Input
                    value={userForm.name}
                    onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Full name"
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-normal text-sm">Phone</Label>
                  <Input
                    value={userForm.phone}
                    onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))}
                    placeholder="10-digit number"
                    maxLength={10}
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-normal text-sm">Password</Label>
                  <Input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-normal text-sm">Email</Label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <CompanyDetails values={companyForm} onChange={handleCompanyChange} />

          <Button
            onClick={handleCreate}
            disabled={createMfg.isPending}
            className="bg-gradient-primary h-10"
          >
            {createMfg.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Create
          </Button>
        </motion.div>
      )}
    </div>
  );
}
