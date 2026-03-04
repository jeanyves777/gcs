"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Headphones,
  Receipt,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  ShieldCheck,
  FolderOpen,
  MessageCircle,
  Users,
  Sparkles,
  Server,
  AlertTriangle,
  Package,
  Activity,
  Rocket,
  FileText,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const clientNavItems = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/projects", label: "Projects", icon: FolderKanban },
  { href: "/portal/support", label: "Support", icon: Headphones },
  { href: "/portal/invoices", label: "Invoices", icon: Receipt },
  { href: "/portal/notifications", label: "Notifications", icon: Bell },
  { href: "/portal/settings", label: "Settings", icon: Settings },
];

const adminNavItems = [
  { href: "/portal/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/portal/admin/pitch-board", label: "Pitch Board", icon: Sparkles },
  { href: "/portal/admin/projects", label: "Projects", icon: FolderOpen },
  { href: "/portal/admin/tickets", label: "Tickets", icon: MessageCircle },
  { href: "/portal/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/portal/admin/users", label: "Users", icon: Users },
];

const guardNavItems = [
  { href: "/portal/admin/guard", label: "Dashboard", icon: ShieldCheck, exact: true },
  { href: "/portal/admin/guard/agents", label: "Agents", icon: Server },
  { href: "/portal/admin/guard/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/portal/admin/guard/patches", label: "Patches", icon: Package },
  { href: "/portal/admin/guard/config", label: "Config", icon: FileText },
  { href: "/portal/admin/guard/monitoring", label: "Monitoring", icon: Activity },
  { href: "/portal/admin/guard/deploy", label: "Deploy", icon: Rocket },
];

interface SidebarProps {
  role: string;
}

export function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isAdmin = role === "ADMIN" || role === "STAFF";
  const isGuardSection = pathname.startsWith("/portal/admin/guard");
  const [guardOpen, setGuardOpen] = useState(true);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const renderItem = (item: { href: string; label: string; icon: React.ElementType; exact?: boolean }, indent = false) => {
    const active = isActive(item.href, item.exact);
    const Icon = item.icon;

    if (collapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                "flex items-center justify-center w-full h-10 rounded-lg transition-colors",
                active
                  ? "bg-[var(--brand-primary)] text-white"
                  : "hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
          indent ? "px-3 py-1.5 pl-9" : "px-3 py-2.5",
          active
            ? "bg-[var(--brand-primary)] text-white"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
        )}
      >
        <Icon className={cn("flex-shrink-0", indent ? "h-3.5 w-3.5" : "h-4.5 w-4.5")} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside
      className="hidden md:flex flex-col h-screen sticky top-0 border-r transition-all duration-200 flex-shrink-0"
      style={{
        width: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
        background: "var(--bg-primary)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center border-b px-4"
        style={{ height: "var(--header-height)", borderColor: "var(--border)", minHeight: "var(--header-height)" }}
      >
        {collapsed ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm flex-shrink-0"
            style={{ background: "var(--brand-primary)" }}
          >
            G
          </div>
        ) : (
          <Logo size="sm" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {clientNavItems.map((item) => renderItem(item))}

        {isAdmin && (
          <>
            <div className={cn("pt-3 pb-1", collapsed ? "hidden" : "block")}>
              <div className="flex items-center gap-2 px-3">
                <Shield className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Admin
                </span>
              </div>
            </div>
            {collapsed && <div className="border-t my-1" style={{ borderColor: "var(--border)" }} />}
            {adminNavItems.map((item) => renderItem(item))}

            {/* GcsGuard Section */}
            {collapsed ? (
              <>
                <div className="border-t my-1" style={{ borderColor: "var(--border)" }} />
                {guardNavItems.map((item) => renderItem(item))}
              </>
            ) : (
              <>
                <div className="pt-3 pb-1">
                  <button
                    onClick={() => setGuardOpen(!guardOpen)}
                    className="flex items-center gap-2 px-3 w-full group"
                  >
                    <ShieldCheck
                      className="h-3.5 w-3.5 flex-shrink-0 transition-colors"
                      style={{ color: isGuardSection ? "var(--brand-primary)" : "var(--text-muted)" }}
                    />
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider flex-1 text-left transition-colors"
                      style={{ color: isGuardSection ? "var(--brand-primary)" : "var(--text-muted)" }}
                    >
                      GcsGuard
                    </span>
                    <ChevronDown
                      className={cn("h-3 w-3 transition-transform", guardOpen ? "" : "-rotate-90")}
                      style={{ color: "var(--text-muted)" }}
                    />
                  </button>
                </div>
                {guardOpen && (
                  <div className="space-y-0.5">
                    {guardNavItems.map((item) => renderItem(item, true))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center rounded-lg p-2 text-sm transition-colors hover:bg-[var(--bg-secondary)]",
            collapsed ? "justify-center" : "gap-2"
          )}
          style={{ color: "var(--text-muted)" }}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
