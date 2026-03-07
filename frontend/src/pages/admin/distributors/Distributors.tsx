import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Truck, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDistributorList, useUpdateDistributorStatus } from "@/hooks/useDistributors";
import { useDeleteUser } from "@/hooks/useUsers";
import type { UserStatus } from "@/types/auth";
import type { Distributor, DistributorType } from "@/types/distributor";

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-green-600/10 text-green-700 border-green-200",
  INACTIVE: "bg-muted/80 text-muted-foreground border-border",
  PENDING: "bg-amber-500/10 text-amber-800 border-amber-200",
  DRAFT: "bg-blue-500/10 text-blue-700 border-blue-200",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
};

const distributorTypeLabels: Record<DistributorType, string> = {
  STATE_DISTRIBUTOR: "State",
  UNDER_MANUFACTURER: "Under Mfr",
  UNDER_RETAILER: "Under Retailer",
};

const distributorTypeBadgeStyles: Record<DistributorType, string> = {
  STATE_DISTRIBUTOR: "bg-slate-500/10 text-slate-700 border-slate-200",
  UNDER_MANUFACTURER: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  UNDER_RETAILER: "bg-teal-500/10 text-teal-700 border-teal-200",
};

function displayName(d: Distributor): string {
  if (d.distributorType === "UNDER_RETAILER" && d.companyName) return d.companyName;
  return d.user.name;
}

function linkedTo(d: Distributor): string {
  if (d.distributorType === "UNDER_MANUFACTURER" && d.manufacturer?.companyName) return d.manufacturer.companyName;
  if (d.distributorType === "UNDER_RETAILER" && d.retailer?.companyName) return d.retailer.companyName;
  return "—";
}

export default function Distributors() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [deleteTarget, setDeleteTarget] = useState<Distributor | null>(null);

  const queryParams = {
    page,
    limit,
    ...(search && { search }),
    ...(statusFilter !== "all" && { status: statusFilter as UserStatus }),
    ...(typeFilter !== "all" && { distributorType: typeFilter as DistributorType }),
  };

  const { data: response, isLoading } = useDistributorList(queryParams);
  const deleteUser = useDeleteUser();
  const updateStatus = useUpdateDistributorStatus();

  const distributors: Distributor[] = response?.data ?? [];
  const meta = response?.meta;

  const hasFilters = search || statusFilter !== "all" || typeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.userId, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleStatusToggle = (dist: Distributor) => {
    const newStatus: UserStatus = dist.user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateStatus.mutate({ id: dist.id, status: newStatus });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Distributors</h1>
        <Button
          className="bg-gradient-primary h-10"
          onClick={() => navigate("/dashboard/admin/distributors/add")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add distributor
        </Button>
      </div>

      <Card className="border-0 shadow-md bg-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
            <div className="flex flex-1 flex-wrap gap-2 min-w-0">
              <div className="relative flex-1 min-w-[180px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search name, phone, company..."
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Distributor type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="STATE_DISTRIBUTOR">State Distributor</SelectItem>
                  <SelectItem value="UNDER_MANUFACTURER">Under Manufacturer</SelectItem>
                  <SelectItem value="UNDER_RETAILER">Under Retailer</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 shrink-0" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {meta && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {meta.total === 0
                  ? "No results"
                  : `Showing ${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total}`}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Company / Name</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Contact</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Phone</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">GST</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Type</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Linked To</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-14">
                        <div className="flex flex-col items-center gap-2">
                          <Truck className="h-9 w-9 text-muted-foreground/40" />
                          <p className="text-sm font-medium">No distributors found</p>
                          {hasFilters && (
                            <Button variant="link" size="sm" className="h-auto p-0" onClick={clearFilters}>
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    distributors.map((dist) => (
                      <TableRow key={dist.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium py-3">{displayName(dist)}</TableCell>
                        <TableCell className="py-3 text-muted-foreground">{dist.user.name}</TableCell>
                        <TableCell className="py-3 font-mono text-sm">{dist.user.phone ?? "—"}</TableCell>
                        <TableCell className="py-3 font-mono text-sm text-muted-foreground">
                          {dist.gstNumber || "—"}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${distributorTypeBadgeStyles[dist.distributorType] ?? "bg-muted/80"}`}
                          >
                            {distributorTypeLabels[dist.distributorType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-muted-foreground text-sm max-w-[140px] truncate" title={linkedTo(dist)}>
                          {linkedTo(dist)}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={`cursor-pointer text-xs font-medium ${statusStyles[dist.user.status] ?? "bg-muted/80 text-muted-foreground"}`}
                            onClick={() => handleStatusToggle(dist)}
                          >
                            {updateStatus.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              dist.user.status
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/dashboard/admin/distributors/edit/${dist.id}`)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(dist)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Distributor</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget && displayName(deleteTarget)}</strong> and the
              associated user account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
