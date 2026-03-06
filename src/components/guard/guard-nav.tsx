"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Dashboard", href: "/portal/admin/guard" },
  { label: "Internal", href: "/portal/admin/guard/internal" },
  { label: "Agents", href: "/portal/admin/guard/agents" },
  { label: "Alerts", href: "/portal/admin/guard/alerts" },
  { label: "Patches", href: "/portal/admin/guard/patches" },
  { label: "Config", href: "/portal/admin/guard/config" },
  { label: "Monitoring", href: "/portal/admin/guard/monitoring" },
  { label: "Deploy", href: "/portal/admin/guard/deploy" },
];

export function GuardNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/portal/admin/guard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: "var(--bg-secondary)" }}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            isActive(link.href)
              ? "bg-[var(--bg-primary)] shadow-sm font-medium text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
