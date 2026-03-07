import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/authStore";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const user = useAuthStore((s) => s.user);

  const nameParts = (user?.name || "").trim().split(/\s+/);
  const initials = nameParts.length >= 2
    ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`
    : nameParts[0]?.charAt(0) || "?";

  return (
    <header className="bg-card border-b border-border px-4 lg:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-6 w-6" />
        </Button>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full" />
        </Button>

        <div className="hidden sm:flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{user?.name || ""}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ").toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
