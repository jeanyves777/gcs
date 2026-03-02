"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, Search, LogOut, User, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/layout/logo";

interface TopbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
}

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const labels: Record<string, string> = {
    portal: "Portal",
    projects: "Projects",
    support: "Support",
    invoices: "Invoices",
    notifications: "Notifications",
    settings: "Settings",
    profile: "Profile",
    security: "Security",
    new: "New Ticket",
    tasks: "Tasks",
    files: "Files",
    chat: "Chat",
  };

  return (
    <nav className="flex items-center gap-1.5 text-sm overflow-hidden">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const label = labels[seg] ?? seg;

        return (
          <span key={seg} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            )}
            <span
              className={
                isLast
                  ? "font-semibold truncate"
                  : "truncate"
              }
              style={{ color: isLast ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

export function Topbar({ user }: TopbarProps) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "?";

  const roleLabel: Record<string, string> = {
    ADMIN: "GCS Admin",
    STAFF: "GCS Staff",
    CLIENT_ADMIN: "Client Admin",
    CLIENT_USER: "Client",
  };

  return (
    <header
      className="flex items-center justify-between px-4 border-b flex-shrink-0"
      style={{
        height: "var(--header-height)",
        background: "var(--bg-primary)",
        borderColor: "var(--border)",
      }}
    >
      {/* Mobile logo (shown when sidebar is hidden) */}
      <div className="md:hidden">
        <Logo size="sm" />
      </div>

      {/* Breadcrumbs — desktop */}
      <div className="hidden md:flex flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Search — placeholder */}
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Search (Ctrl+K)">
          <Search className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
        </Button>

        {/* Notifications */}
        <Link href="/portal/notifications">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            {/* Unread badge — placeholder */}
            <Badge
              className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] text-white border-0"
              style={{ background: "var(--brand-primary)" }}
            >
              3
            </Badge>
          </Button>
        </Link>

        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-secondary)] transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{ background: "var(--brand-primary)" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-medium leading-none" style={{ color: "var(--text-primary)" }}>
                  {user.name ?? user.email}
                </span>
                <span className="text-[10px] mt-0.5 leading-none" style={{ color: "var(--text-muted)" }}>
                  {roleLabel[user.role] ?? user.role}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {user.name}
              </p>
              <p className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                {user.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/portal/settings/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/portal/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              style={{ color: "var(--error)" }}
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
