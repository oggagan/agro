import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UserPlus, Pencil, FileUp, Trash2 } from "lucide-react";
import AuthorizedPersonForm from "./AuthorizedPersonForm";
import { useRemoveDistributorAuthorizedPerson } from "@/hooks/useDistributors";
import type { DistributorAuthorizedPerson } from "@/types/distributor";

interface AuthorizedPersonsSectionProps {
  distributorId: string;
  authorizedPersons: DistributorAuthorizedPerson[];
}

export default function AuthorizedPersonsSection({
  distributorId,
  authorizedPersons,
}: AuthorizedPersonsSectionProps) {
  const [selectedAp, setSelectedAp] = useState<DistributorAuthorizedPerson | null | undefined>(undefined);
  const [addMode, setAddMode] = useState(false);
  const removeAp = useRemoveDistributorAuthorizedPerson();

  const showForm = addMode || selectedAp !== undefined;
  const formExisting = addMode ? null : selectedAp ?? null;

  const displayName = (ap: DistributorAuthorizedPerson) =>
    ap.displayName ?? ap.user?.name ?? "—";
  const displayPhone = (ap: DistributorAuthorizedPerson) =>
    ap.displayPhone ?? ap.user?.phones?.[0]?.number ?? "—";
  const displayEmail = (ap: DistributorAuthorizedPerson) =>
    ap.displayEmail ?? ap.user?.emails?.[0]?.address ?? null;

  const handleRemove = (ap: DistributorAuthorizedPerson) => {
    if (!confirm(`Remove ${displayName(ap)}?`)) return;
    removeAp.mutate(
      { distributorId, apId: ap.id },
      { onSuccess: () => setSelectedAp(undefined) }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Authorized persons</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={() => {
            setAddMode(true);
            setSelectedAp(undefined);
          }}
        >
          <UserPlus className="h-4 w-4" />
          Add person
        </Button>
      </div>

      {authorizedPersons.length > 0 && (
        <div className="grid gap-3">
          {authorizedPersons.map((ap) => (
            <Card key={ap.id} className="overflow-hidden">
              <CardHeader className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{displayName(ap)}</span>
                    <span className="text-muted-foreground text-sm">{displayPhone(ap)}</span>
                    {displayEmail(ap) && (
                      <span className="text-muted-foreground text-sm">{displayEmail(ap)}</span>
                    )}
                    {ap.canLogin ? (
                      <Badge variant="default" className="bg-green-600">Can login</Badge>
                    ) : (
                      <Badge variant="secondary">No login</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        setSelectedAp(ap);
                        setAddMode(false);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive"
                      onClick={() => handleRemove(ap)}
                      disabled={removeAp.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <AuthorizedPersonForm
              distributorId={distributorId}
              apId={formExisting?.id}
              existing={formExisting}
              onClose={() => {
                setSelectedAp(undefined);
                setAddMode(false);
              }}
            />
          </CardContent>
        </Card>
      )}

      {authorizedPersons.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No authorized persons. Add one above.</p>
      )}
    </div>
  );
}
