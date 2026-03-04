import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { User, Shield, Bell, ChevronRight, Settings as SettingsIcon } from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

const items = [
  { href: "/portal/settings/profile", icon: User, label: "Profile", desc: "Update your name, job title, and avatar" },
  { href: "/portal/settings/security", icon: Shield, label: "Security", desc: "Password, two-factor authentication, and active sessions" },
  { href: "/portal/settings/notifications", icon: Bell, label: "Notifications", desc: "Choose what updates you receive and how" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
        <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
          <SettingsIcon className="h-5 w-5" />
        </div>
        Settings
      </h1>
      <div className="space-y-2">
        {items.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="card-base hover:border-[var(--brand-primary)] hover:shadow-sm transition-all cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
                  <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--text-muted)" }} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
