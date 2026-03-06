import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { User, Shield, Bell, ChevronRight, Settings as SettingsIcon } from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

const items = [
  {
    href: "/portal/settings/profile",
    icon: User,
    label: "Profile",
    desc: "Update your name, job title, and avatar",
    color: "var(--brand-primary)",
    bg: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
  },
  {
    href: "/portal/settings/security",
    icon: Shield,
    label: "Security",
    desc: "Password, two-factor authentication, and active sessions",
    color: "var(--error)",
    bg: "var(--error-bg)",
  },
  {
    href: "/portal/settings/notifications",
    icon: Bell,
    label: "Notifications",
    desc: "Choose what updates you receive and how",
    color: "var(--warning)",
    bg: "var(--warning-bg)",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold flex items-center gap-2.5"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          <div
            className="p-1.5 rounded-lg"
            style={{ background: "var(--brand-primary)", color: "white" }}
          >
            <SettingsIcon className="h-5 w-5" />
          </div>
          Settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Manage your account preferences
        </p>
      </div>

      <div className="space-y-3">
        {items.map(({ href, icon: Icon, label, desc, color, bg }) => (
          <Link key={href} href={href}>
            <Card className="card-base hover:border-[var(--brand-primary)] hover:shadow-sm transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: bg }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-sm group-hover:text-[var(--brand-primary)] transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {desc}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                  style={{ color: "var(--brand-primary)" }}
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
