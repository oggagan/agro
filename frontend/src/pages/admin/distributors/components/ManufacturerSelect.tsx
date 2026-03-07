import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useManufacturerList } from "@/hooks/useManufacturers";
import { Skeleton } from "@/components/ui/skeleton";

interface ManufacturerSelectProps {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ManufacturerSelect({
  value,
  onValueChange,
  disabled,
  placeholder = "Select manufacturer",
}: ManufacturerSelectProps) {
  const { data, isLoading } = useManufacturerList({ limit: 500, status: "ACTIVE" });
  const manufacturers = data?.data ?? [];

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground font-normal text-sm">Manufacturer</Label>
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {manufacturers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.companyName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
