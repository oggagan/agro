import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory, useCreateInventory, useUpdateInventory } from "@/hooks/useInventory";
import { useManufacturerList } from "@/hooks/useManufacturers";
import { useRetailerList } from "@/hooks/useRetailers";
import { useDistributorList } from "@/hooks/useDistributors";
import { INDIAN_STATES } from "@/constants/indianStates";
import type { InventoryType, CreateInventoryPayload } from "@/types/inventory";

const OWNER_TYPES = ["MANUFACTURER", "RETAILER", "DISTRIBUTOR"] as const;
const INVENTORY_TYPES: InventoryType[] = ["WAREHOUSE", "SHOP", "GODOWN", "DISTRIBUTION_CENTER"];

export default function InventoryForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [step, setStep] = useState(1);

  const { data: inventory, isLoading } = useInventory(id);
  const { data: manufacturersRes } = useManufacturerList({ limit: 500 });
  const { data: retailersRes } = useRetailerList({ limit: 500 });
  const { data: distributorsRes } = useDistributorList({ limit: 500 });
  const createInv = useCreateInventory();
  const updateInv = useUpdateInventory();

  const manufacturers = manufacturersRes?.data ?? [];
  const retailers = retailersRes?.data ?? [];
  const distributors = distributorsRes?.data ?? [];

  const [ownerType, setOwnerType] = useState<"MANUFACTURER" | "RETAILER" | "DISTRIBUTOR">("MANUFACTURER");
  const [manufacturerId, setManufacturerId] = useState("");
  const [retailerId, setRetailerId] = useState("");
  const [distributorId, setDistributorId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<InventoryType>("WAREHOUSE");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isEdit && inventory && !initialized) {
      setOwnerType(inventory.ownerType as "MANUFACTURER" | "RETAILER" | "DISTRIBUTOR");
      setManufacturerId((inventory as { manufacturerId?: string }).manufacturerId ?? "");
      setRetailerId((inventory as { retailerId?: string }).retailerId ?? "");
      setDistributorId((inventory as { distributorId?: string }).distributorId ?? "");
      setName(inventory.name);
      setType(inventory.type);
      setDescription(inventory.description ?? "");
      setStatus(inventory.status);
      setAddress1(inventory.address1);
      setAddress2(inventory.address2 ?? "");
      setCity(inventory.city);
      setState(inventory.state);
      setPincode(inventory.pincode);
      setContactName(inventory.contactName ?? "");
      setContactPhone(inventory.contactPhone ?? "");
      setContactEmail(inventory.contactEmail ?? "");
      setInitialized(true);
    }
  }, [isEdit, inventory, initialized]);

  const ownerId = ownerType === "MANUFACTURER" ? manufacturerId : ownerType === "RETAILER" ? retailerId : distributorId;
  const ownerName =
    ownerType === "MANUFACTURER"
      ? manufacturers.find((m) => m.id === manufacturerId)?.companyName
      : ownerType === "RETAILER"
        ? retailers.find((r) => r.id === retailerId)?.companyName
        : distributors.find((d) => d.id === distributorId)?.companyName;

  const handleSubmit = () => {
    const payload: CreateInventoryPayload = {
      ownerType,
      manufacturerId: ownerType === "MANUFACTURER" ? manufacturerId || undefined : undefined,
      retailerId: ownerType === "RETAILER" ? retailerId || undefined : undefined,
      distributorId: ownerType === "DISTRIBUTOR" ? distributorId || undefined : undefined,
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      status,
      address1: address1.trim(),
      address2: address2.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
    };

    if (isEdit) {
      updateInv.mutate(
        {
          id: id!,
          payload: {
            name: payload.name,
            type: payload.type,
            description: payload.description,
            status: payload.status,
            address1: payload.address1,
            address2: payload.address2,
            city: payload.city,
            state: payload.state,
            pincode: payload.pincode,
            contactName: payload.contactName,
            contactPhone: payload.contactPhone,
            contactEmail: payload.contactEmail,
          },
        },
        { onSuccess: () => navigate("/dashboard/admin/inventory") }
      );
    } else {
      createInv.mutate(payload, { onSuccess: () => navigate("/dashboard/admin/inventory") });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="h-9 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/dashboard/admin/inventory")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {isEdit ? "Edit Inventory" : "Add Inventory"}
        </h1>
      </div>

      {!isEdit && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
          <span className="text-sm font-medium">Step {step} of 3</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8" disabled={step <= 1} onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" disabled={step >= 3} onClick={() => setStep((s) => s + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {(step === 1 || isEdit) && (
        <Card className="border-0 shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-base">Owner Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-normal text-sm">Owner Type</Label>
              <Select value={ownerType} onValueChange={(v) => setOwnerType(v as typeof ownerType)}>
                <SelectTrigger className="h-9 max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OWNER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ownerType === "MANUFACTURER" && (
              <div className="space-y-2">
                <Label className="text-muted-foreground font-normal text-sm">Manufacturer</Label>
                <Select value={manufacturerId} onValueChange={setManufacturerId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {ownerType === "RETAILER" && (
              <div className="space-y-2">
                <Label className="text-muted-foreground font-normal text-sm">Retailer</Label>
                <Select value={retailerId} onValueChange={setRetailerId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select retailer" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {ownerType === "DISTRIBUTOR" && (
              <div className="space-y-2">
                <Label className="text-muted-foreground font-normal text-sm">Distributor</Label>
                <Select value={distributorId} onValueChange={setDistributorId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {ownerName && (
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-sm font-medium">{ownerName}</p>
                <p className="text-xs text-muted-foreground">Selected owner</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(step === 2 || isEdit) && (
        <Card className="border-0 shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal text-sm">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Warehouse" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal text-sm">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as InventoryType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-muted-foreground font-normal text-sm">Description (optional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" rows={2} />
              </div>
              {isEdit && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-normal text-sm">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "INACTIVE")}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(step === 3 || isEdit) && (
        <Card className="border-0 shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-base">Location Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-muted-foreground font-normal text-sm">Address Line 1</Label>
                <Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Street, building" className="h-9" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-muted-foreground font-normal text-sm">Address Line 2 (optional)</Label>
                <Input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Area, landmark" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal text-sm">City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal text-sm">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal text-sm">Pincode</Label>
                <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="6-digit pincode" className="h-9" maxLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal text-sm">Contact Name (optional)</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal text-sm">Contact Phone (optional)</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="10 digits" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal text-sm">Contact Email (optional)</Label>
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="h-9" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {!isEdit && step < 3 && (
          <Button onClick={() => setStep((s) => s + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
        {!isEdit && step > 1 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
        )}
        {((!isEdit && step === 3) || isEdit) && (
          <Button
            className="bg-gradient-primary"
            onClick={handleSubmit}
            disabled={createInv.isPending || updateInv.isPending || (!isEdit && !ownerId)}
          >
            {(createInv.isPending || updateInv.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? "Save" : "Create Inventory"}
          </Button>
        )}
      </div>
    </div>
  );
}
