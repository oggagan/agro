import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe, useUpdateMe, useChangePassword } from "@/hooks/useUsers";

function getPrimaryEmail(user: { emails?: { address: string }[]; email?: string | null } | null | undefined): string {
  if (!user) return "";
  if (user.emails?.length) return user.emails[0].address ?? "";
  return user.email ?? "";
}

function getPrimaryPhone(user: { phones?: { number: string }[]; phone?: string | null } | null | undefined): string {
  if (!user) return "";
  if (user.phones?.length) return user.phones[0].number ?? "";
  return user.phone ?? "";
}

function formatStatus(status: string | undefined): string {
  if (!status) return "";
  return status.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Profile() {
  const { data: user, isLoading } = useMe();
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: getPrimaryEmail(user),
      });
    }
  }, [user]);

  const handleSave = () => {
    updateMe.mutate(
      { name: form.name, emails: form.email ? [{ address: form.email }] : [] },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }
    changePassword.mutate(
      { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
      {
        onSuccess: () => {
          setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const displayPhone = getPrimaryPhone(user);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
        <Button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="bg-gradient-primary"
          disabled={updateMe.isPending}
        >
          {updateMe.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : isEditing ? (
            <Save className="h-4 w-4 mr-2" />
          ) : null}
          {isEditing ? "Save" : "Edit"}
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card className="border-0 shadow-md bg-card">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-base font-medium">Profile</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-muted-foreground font-normal">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    disabled={!isEditing}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-muted-foreground font-normal">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    disabled={!isEditing}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-normal">Phone</Label>
                  <Input value={displayPhone} disabled className="h-10 bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-normal">Role</Label>
                  <Input value={user?.role?.replace("_", " ") || ""} disabled className="h-10 bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-normal">Status</Label>
                  <Input
                    value={formatStatus(user?.status)}
                    disabled
                    readOnly
                    className="h-10 bg-muted/50"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <Card className="border-0 shadow-md bg-card">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-muted-foreground font-normal">
                  Current password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  disabled={changePassword.isPending}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-muted-foreground font-normal">
                  New password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  disabled={changePassword.isPending}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-muted-foreground font-normal">
                  Confirm new password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  disabled={changePassword.isPending}
                  className="h-10"
                />
              </div>
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              <Button type="submit" variant="secondary" disabled={changePassword.isPending} className="mt-1">
                {changePassword.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
