import { NavLink } from "react-router-dom";
import {
  User,
  Factory,
  Store,
  Truck,
  Package,
  Warehouse,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/hooks/useAuth";

const mainItems = [
  { icon: User, label: "My Profile", path: "/dashboard/profile" },
];

const adminItems = [
  { icon: Factory, label: "Manufacturers", path: "/dashboard/admin/manufacturers" },
  { icon: Store, label: "Retailers", path: "/dashboard/admin/retailers" },
  { icon: Truck, label: "Distributors", path: "/dashboard/admin/distributors" },
  { icon: Package, label: "Products", path: "/dashboard/admin/products" },
  { icon: Warehouse, label: "Inventory", path: "/dashboard/admin/inventory" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
    isActive
      ? "bg-primary text-primary-foreground shadow-md"
      : "text-sidebar-foreground hover:bg-sidebar-accent"
  }`;

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-hero flex items-center justify-center text-white font-bold text-lg">
            B
          </div>
          <div>
            <h2 className="font-bold text-lg text-sidebar-foreground">BuchiFin</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {user?.role === "SUPER_ADMIN" && (
            <>
              <div className="pb-2">
                <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  User Management
                </p>
              </div>
              {adminItems.map((item) => (
                <NavLink key={item.path} to={item.path} className={linkClass} onClick={onNavigate}>
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}

          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Account
            </p>
          </div>
          {mainItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={linkClass} onClick={onNavigate}>
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}
