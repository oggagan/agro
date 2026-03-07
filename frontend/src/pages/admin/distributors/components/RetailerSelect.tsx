import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRetailerList } from "@/hooks/useRetailers";
import { Skeleton } from "@/components/ui/skeleton";

interface RetailerSelectProps {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function RetailerSelect({
  value,
  onValueChange,
  disabled,
  placeholder = "Select retailer",
}: RetailerSelectProps) {
  // const { data, isLoading } = useRetailerList({ limit: 500, status: "ACTIVE" });
  const { data, isLoading } = useRetailerList({ limit: 500 });

  const retailers = data?.data ?? [];

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground font-normal text-sm">Retailer</Label>
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {retailers.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.companyName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
