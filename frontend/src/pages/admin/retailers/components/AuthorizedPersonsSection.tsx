import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Pencil, FileUp, Trash2 } from "lucide-react";
import AuthorizedPersonForm from "./AuthorizedPersonForm";
import { useRemoveRetailerAuthorizedPerson } from "@/hooks/useRetailers";
import type { RetailerAuthorizedPerson } from "@/types/retailer";

interface AuthorizedPersonsSectionProps {
  retailerId: string;
  authorizedPersons: RetailerAuthorizedPerson[];
}

export default function AuthorizedPersonsSection({
  retailerId,
  authorizedPersons,
}: AuthorizedPersonsSectionProps) {
  const [selectedAp, setSelectedAp] = useState<RetailerAuthorizedPerson | null | undefined>(undefined);
  const [addMode, setAddMode] = useState(false);
  const removeAp = useRemoveRetailerAuthorizedPerson();

  const showForm = addMode || selectedAp !== undefined;
  const formExisting = addMode ? null : selectedAp ?? null;

  const displayName = (ap: RetailerAuthorizedPerson) =>
    ap.displayName ?? ap.user?.name ?? "—";
  const displayPhone = (ap: RetailerAuthorizedPerson) =>
    ap.displayPhone ?? ap.user?.phones?.[0]?.number ?? "—";
  const displayEmail = (ap: RetailerAuthorizedPerson) =>
    ap.displayEmail ?? ap.user?.emails?.[0]?.address ?? null;

  const handleRemove = (ap: RetailerAuthorizedPerson) => {
    if (!confirm(`Remove ${displayName(ap)}?`)) return;
    removeAp.mutate(
      { retailerId, apId: ap.id },
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
                      onClick={() => {
                        setSelectedAp(ap);
                        setAddMode(false);
                      }}
                      className="gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAp(ap);
                        setAddMode(false);
                      }}
                      className="gap-1"
                    >
                      <FileUp className="h-3 w-3" />
                      Documents
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(ap)}
                      disabled={removeAp.isPending}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {selectedAp && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Edit authorized person</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedAp(undefined)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <AuthorizedPersonForm
              retailerId={retailerId}
              apId={selectedAp.id}
              existing={selectedAp}
              onClose={() => setSelectedAp(undefined)}
            />
          </CardContent>
        </Card>
      )}

      {addMode && (
        <Card>
          <CardHeader>
            <CardTitle>Add authorized person</CardTitle>
          </CardHeader>
          <CardContent>
            <AuthorizedPersonForm
              retailerId={retailerId}
              existing={null}
              onClose={() => setAddMode(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
