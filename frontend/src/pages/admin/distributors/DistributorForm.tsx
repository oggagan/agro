import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LicenseDetails from "./components/LicenseDetails";
import CompanyDetails from "./components/CompanyDetails";
import LicensesSection from "./components/LicensesSection";
import BankDetailsForm from "./components/BankDetailsForm";
import DirectorsSection from "./components/DirectorsSection";
import AuthorizedPersonsSection from "./components/AuthorizedPersonsSection";
import ManufacturerSelect from "./components/ManufacturerSelect";
import RetailerSelect from "./components/RetailerSelect";
import {
  useDistributor,
  useCreateDistributor,
  useUpdateDistributor,
  useUploadDistributorDocuments,
  useDeleteDistributorDocument,
} from "@/hooks/useDistributors";
import { getCompanyTypeConfig } from "@/lib/companyTypeConfig";
import type { DistributorType } from "@/types/distributor";

type DistributorCompanyType = "PVT_LTD" | "PROPRIETORSHIP" | "PARTNERSHIP";

const DISTRIBUTOR_TYPES: { value: DistributorType; label: string }[] = [
  { value: "STATE_DISTRIBUTOR", label: "State Distributor" },
  { value: "UNDER_MANUFACTURER", label: "Under Manufacturer" },
  { value: "UNDER_RETAILER", label: "Under Retailer" },
];

export default function DistributorForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: distributor, isLoading } = useDistributor(id);
  const createDistributor = useCreateDistributor();
  const updateDistributor = useUpdateDistributor();
  const uploadDocs = useUploadDistributorDocuments();
  const deleteDocs = useDeleteDistributorDocument();

  const [selectedType, setSelectedType] = useState<DistributorType | "">("");
  const [userForm, setUserForm] = useState({ phone: "", password: "", name: "", email: "" });
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    companyType: "PROPRIETORSHIP" as DistributorCompanyType,
    gstNumber: "",
    companyPan: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [manufacturerId, setManufacturerId] = useState("");
  const [retailerId, setRetailerId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseValidUpto, setLicenseValidUpto] = useState("");
  const [authPerson, setAuthPerson] = useState({ name: "", phone: "", email: "", password: "" });
  const [initialized, setInitialized] = useState(false);

  const distType = (isEdit ? distributor?.distributorType : selectedType) as DistributorType | undefined;
  const isUnderRetailer = distType === "UNDER_RETAILER";
  const isStateOrUnderMfr = distType === "STATE_DISTRIBUTOR" || distType === "UNDER_MANUFACTURER";

  if (isEdit && distributor && !initialized) {
    const addr = distributor.addresses?.[0];
    setSelectedType(distributor.distributorType);
    setCompanyForm({
      companyName: distributor.companyName || "",
      companyType: (distributor.companyType as DistributorCompanyType) || "PROPRIETORSHIP",
      gstNumber: distributor.gstNumber || "",
      companyPan: distributor.companyPan || "",
      address1: addr?.address1 || "",
      address2: addr?.address2 || "",
      city: addr?.city || "",
      state: addr?.state || "",
      pincode: addr?.pincode || "",
    });
    setManufacturerId(distributor.manufacturerId || "");
    setRetailerId(distributor.retailerId || "");
    setLicenseNumber(distributor.licenseNumber || "");
    setLicenseValidUpto(distributor.licenseValidUpto ? distributor.licenseValidUpto.slice(0, 10) : "");
    setInitialized(true);
  }

  const config = isUnderRetailer ? getCompanyTypeConfig(companyForm.companyType) : null;
  const showAuthorizedPerson = isUnderRetailer && companyForm.companyType === "PVT_LTD";

  const primaryUser = distributor?.user;
  const primaryPhone =
    primaryUser?.phones?.[0]?.number ?? (primaryUser as { phone?: string })?.phone ?? "";
  const primaryEmail =
    primaryUser?.emails?.[0]?.address ?? (primaryUser as { email?: string })?.email ?? "";

  const handleCompanyChange = (field: string, value: string) => {
    setCompanyForm((p) => ({ ...p, [field]: value }));
  };

  const handleCreate = () => {
    if (!userForm.phone || !userForm.password || !userForm.name || !distType) return;
    if (distType === "UNDER_MANUFACTURER" && !manufacturerId) return;
    if (distType === "UNDER_RETAILER" && (!retailerId || !companyForm.companyName || !companyForm.companyType)) return;

    const payload: any = {
      distributorType: distType,
      phone: userForm.phone,
      password: userForm.password,
      name: userForm.name,
      email: userForm.email || undefined,
      gstNumber: companyForm.gstNumber || undefined,
      address:
        companyForm.address1
          ? {
              address1: companyForm.address1,
              address2: companyForm.address2 || undefined,
              city: companyForm.city,
              state: companyForm.state,
              pincode: companyForm.pincode,
            }
          : undefined,
    };
    if (isStateOrUnderMfr) {
      payload.licenseNumber = licenseNumber || undefined;
      payload.licenseValidUpto = licenseValidUpto || undefined;
      payload.authorizedPersons =
        authPerson.name && authPerson.phone && authPerson.password && authPerson.password.length >= 8
          ? [
              {
                name: authPerson.name,
                phone: authPerson.phone,
                email: authPerson.email || undefined,
                password: authPerson.password,
              },
            ]
          : [];
    }
    if (distType === "UNDER_MANUFACTURER") payload.manufacturerId = manufacturerId;
    if (distType === "UNDER_RETAILER") {
      payload.retailerId = retailerId;
      payload.companyName = companyForm.companyName;
      payload.companyType = companyForm.companyType;
      payload.companyPan = companyForm.companyPan || undefined;
      payload.directors = [];
      payload.licenses = [];
      payload.bankDetails = companyForm.address1
        ? undefined
        : undefined;
    }
    createDistributor.mutate(payload, { onSuccess: () => navigate("/dashboard/admin/distributors") });
  };

  const handleUploadDoc = (files: File[], docType: string) => {
    if (!id) return;
    uploadDocs.mutate({ distributorId: id, files, docType });
  };

  const handleDeleteDoc = (docId: string) => {
    if (!id) return;
    deleteDocs.mutate({ distributorId: id, docId });
  };

  const handleUpdate = () => {
    if (!id) return;
    updateDistributor.mutate(
      {
        id,
        payload: {
          gstNumber: companyForm.gstNumber || undefined,
          licenseNumber: licenseNumber || undefined,
          licenseValidUpto: licenseValidUpto || undefined,
          manufacturerId: manufacturerId || undefined,
          retailerId: retailerId || undefined,
          companyName: companyForm.companyName || undefined,
          companyType: companyForm.companyType,
          companyPan: companyForm.companyPan || undefined,
          address: companyForm.address1
            ? {
                address1: companyForm.address1,
                address2: companyForm.address2 || undefined,
                city: companyForm.city,
                state: companyForm.state,
                pincode: companyForm.pincode,
              }
            : undefined,
        },
      },
      { onSuccess: () => navigate("/dashboard/admin/distributors") }
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/admin/distributors")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {isEdit ? "Edit distributor" : "Add distributor"}
          </h1>
          {isEdit && distributor && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {distributor.companyName || distributor.user?.name} · {distributor.distributorType.replace(/_/g, " ")}
            </p>
          )}
        </div>
      </div>

      {isEdit ? (
        <Tabs defaultValue="account" className="space-y-5">
          <TabsList
            className={`w-full grid gap-1 ${
              isUnderRetailer
                ? showAuthorizedPerson
                  ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                  : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5"
                : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-4"
            }`}
          >
            <TabsTrigger value="account">Account</TabsTrigger>
            {isStateOrUnderMfr && <TabsTrigger value="license">License / GST</TabsTrigger>}
            {isUnderRetailer && (
              <>
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="licenses">Licenses</TabsTrigger>
                <TabsTrigger value="directors">{config?.tabLabel ?? "Directors"}</TabsTrigger>
                {showAuthorizedPerson && <TabsTrigger value="authorized">Authorized</TabsTrigger>}
                <TabsTrigger value="bank">Bank</TabsTrigger>
              </>
            )}
            {isStateOrUnderMfr && <TabsTrigger value="address">Address</TabsTrigger>}
            {isStateOrUnderMfr && <TabsTrigger value="authorized">Authorized</TabsTrigger>}
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
                      <Input value={primaryUser?.name ?? ""} disabled readOnly className="h-10 bg-muted/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-normal text-sm">Phone</Label>
                      <Input value={primaryPhone} disabled readOnly className="h-10 bg-muted/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-normal text-sm">Email</Label>
                      <Input value={primaryEmail} disabled readOnly className="h-10 bg-muted/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-normal text-sm">Status</Label>
                      <Input
                        value={
                          primaryUser?.status
                            ?.replace("_", " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase()) ?? ""
                        }
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

          {isStateOrUnderMfr && (
            <TabsContent value="license" className="mt-5">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <LicenseDetails
                  distributorId={id!}
                  licenseNumber={licenseNumber || null}
                  licenseValidUpto={licenseValidUpto || null}
                  documents={distributor?.documents || []}
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleUpdate} disabled={updateDistributor.isPending} className="bg-gradient-primary h-10">
                    {updateDistributor.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </motion.div>
            </TabsContent>
          )}

          {isUnderRetailer && (
            <TabsContent value="company" className="mt-5">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <CompanyDetails
                  values={companyForm}
                  onChange={handleCompanyChange}
                  documents={distributor?.documents || []}
                  onUploadDoc={handleUploadDoc}
                  onDeleteDoc={handleDeleteDoc}
                  uploading={uploadDocs.isPending}
                  deleting={deleteDocs.isPending}
                />
                <Button onClick={handleUpdate} disabled={updateDistributor.isPending} className="bg-gradient-primary h-10">
                  {updateDistributor.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </motion.div>
            </TabsContent>
          )}

          {isUnderRetailer && (
            <TabsContent value="licenses" className="mt-5">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <LicensesSection distributorId={id!} licenses={distributor?.licenses ?? []} />
              </motion.div>
            </TabsContent>
          )}

          {isUnderRetailer && (
            <TabsContent value="directors" className="mt-5">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <DirectorsSection
                  distributorId={id!}
                  directors={distributor?.directors ?? []}
                  companyType={companyForm.companyType}
                />
              </motion.div>
            </TabsContent>
          )}

          {(showAuthorizedPerson || isStateOrUnderMfr) && (
            <TabsContent value="authorized" className="mt-5">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <AuthorizedPersonsSection
                  distributorId={id!}
                  authorizedPersons={distributor?.authorizedPersons ?? []}
                />
              </motion.div>
            </TabsContent>
          )}

          {isStateOrUnderMfr && (
            <TabsContent value="address" className="mt-5">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <CompanyDetails
                  values={companyForm}
                  onChange={handleCompanyChange}
                  documents={distributor?.documents || []}
                  onUploadDoc={handleUploadDoc}
                  onDeleteDoc={handleDeleteDoc}
                  uploading={uploadDocs.isPending}
                  deleting={deleteDocs.isPending}
                />
                <Button onClick={handleUpdate} disabled={updateDistributor.isPending} className="bg-gradient-primary h-10">
                  {updateDistributor.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </motion.div>
            </TabsContent>
          )}

          {isUnderRetailer && (
            <TabsContent value="bank" className="mt-5">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <BankDetailsForm distributorId={id!} existing={distributor?.bankDetails?.[0]} />
              </motion.div>
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {!selectedType ? (
            <Card className="border-0 shadow-md bg-card">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-base font-medium">Distributor type</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DistributorType)}>
                  <SelectTrigger className="h-10 max-w-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRIBUTOR_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ) : (
            <>
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

              {selectedType === "UNDER_MANUFACTURER" && (
                <ManufacturerSelect
                  value={manufacturerId}
                  onValueChange={setManufacturerId}
                  placeholder="Select manufacturer (required)"
                />
              )}
              {selectedType === "UNDER_RETAILER" && (
                <RetailerSelect
                  value={retailerId}
                  onValueChange={setRetailerId}
                  placeholder="Select retailer (required)"
                />
              )}

              {isStateOrUnderMfr && (
                <Card className="border-0 shadow-md bg-card">
                  <CardHeader className="pb-3 pt-5 px-5">
                    <CardTitle className="text-base font-medium">License</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-normal text-sm">License number</Label>
                        <Input
                          value={licenseNumber}
                          onChange={(e) => setLicenseNumber(e.target.value)}
                          placeholder="Optional"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-normal text-sm">Valid upto</Label>
                        <Input
                          type="date"
                          value={licenseValidUpto}
                          onChange={(e) => setLicenseValidUpto(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(isStateOrUnderMfr || isUnderRetailer) && (
                <CompanyDetails values={companyForm} onChange={handleCompanyChange} />
              )}

              {isStateOrUnderMfr && (
                <Card className="border-0 shadow-md bg-card">
                  <CardHeader className="pb-3 pt-5 px-5">
                    <CardTitle className="text-base font-medium">Authorized person (required)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-normal text-sm">Name</Label>
                        <Input
                          value={authPerson.name}
                          onChange={(e) => setAuthPerson((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Full name"
                          className="h-10"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-normal text-sm">Phone</Label>
                        <Input
                          value={authPerson.phone}
                          onChange={(e) => setAuthPerson((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))}
                          placeholder="10-digit number"
                          maxLength={10}
                          className="h-10"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-normal text-sm">Email</Label>
                        <Input
                          type="email"
                          value={authPerson.email}
                          onChange={(e) => setAuthPerson((p) => ({ ...p, email: e.target.value }))}
                          placeholder="you@example.com"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-normal text-sm">Password</Label>
                        <Input
                          type="password"
                          value={authPerson.password}
                          onChange={(e) => setAuthPerson((p) => ({ ...p, password: e.target.value }))}
                          placeholder="Min. 8 characters"
                          className="h-10"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleCreate}
                disabled={createDistributor.isPending}
                className="bg-gradient-primary h-10"
              >
                {createDistributor.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Create distributor
              </Button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
