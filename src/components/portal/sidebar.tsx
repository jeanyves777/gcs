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
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  {
    href: "/portal",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/portal/projects",
    label: "Projects",
    icon: FolderKanban,
  },
  {
    href: "/portal/support",
    label: "Support",
    icon: Headphones,
  },
  {
    href: "/portal/invoices",
    label: "Invoices",
    icon: Receipt,
  },
  {
    href: "/portal/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/portal/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

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
        style={{
          height: "var(--header-height)",
          borderColor: "var(--border)",
          minHeight: "var(--header-height)",
        }}
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
        {navItems.map((item) => {
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--brand-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center rounded-lg p-2 text-sm transition-colors",
            "hover:bg-[var(--bg-secondary)]",
            collapsed ? "justify-center" : "gap-2"
          )}
          style={{ color: "var(--text-muted)" }}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
