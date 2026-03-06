import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Shield,
  Bell,
  ChevronRight,
  Settings as SettingsIcon,
  Mail,
  Building2,
  Briefcase,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

const settingCards = [
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
    desc: "Password, two-factor authentication, and sessions",
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

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  STAFF: "Staff",
  CLIENT_ADMIN: "Client Admin",
  CLIENT_USER: "Client User",
};

const roleStyle: Record<string, { bg: string; color: string }> = {
  ADMIN: { bg: "var(--error-bg)", color: "var(--error)" },
  STAFF: { bg: "var(--info-bg)", color: "var(--info)" },
  CLIENT_ADMIN: { bg: "var(--warning-bg)", color: "var(--warning)" },
  CLIENT_USER: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

export default async function SettingsPage() {
  const sessionUser = await getCurrentUser();

  const user = sessionUser
    ? await db.user.findUnique({
        where: { id: sessionUser.id },
        include: { organization: { select: { name: true } } },
      })
    : null;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const rStyle = roleStyle[user?.role ?? ""] ?? roleStyle.CLIENT_USER;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold flex items-center gap-2.5"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
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

      {/* Account overview card */}
      {user && (
        <Card className="card-base overflow-hidden">
          <div
            className="h-20"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 70%, #000))",
            }}
          />
          <CardContent className="px-6 pb-6 -mt-10">
            <div className="flex items-end gap-4 mb-5">
              <Avatar
                className="h-20 w-20 border-4 flex-shrink-0"
                style={{ borderColor: "var(--bg-primary)" }}
              >
                <AvatarFallback
                  className="text-2xl font-bold text-white"
                  style={{ background: "var(--brand-primary)" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1 min-w-0">
                <p
                  className="font-semibold text-lg truncate"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {user.name ?? "Unnamed User"}
                </p>
                <Badge
                  className="text-[10px] font-semibold border-0 mt-0.5"
                  style={{ background: rStyle.bg, color: rStyle.color }}
                >
                  {roleLabel[user.role] ?? user.role}
                </Badge>
              </div>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2.5">
                <Mail
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: "var(--text-muted)" }}
                />
                <span
                  className="text-sm truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {user.email}
                </span>
              </div>
              {user.organization && (
                <div className="flex items-center gap-2.5">
                  <Building2
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <span
                    className="text-sm truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {user.organization.name}
                  </span>
                </div>
              )}
              {user.jobTitle && (
                <div className="flex items-center gap-2.5">
                  <Briefcase
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <span
                    className="text-sm truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {user.jobTitle}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {settingCards.map(({ href, icon: Icon, label, desc, color, bg }) => (
          <Link key={href} href={href}>
            <Card className="card-base h-full hover:border-[var(--brand-primary)] hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-6 flex flex-col gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: bg }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="flex-1">
                  <p
                    className="font-semibold text-sm group-hover:text-[var(--brand-primary)] transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-xs mt-1 leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {desc}
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-auto">
                  <span
                    className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    Manage
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                    style={{ color: "var(--brand-primary)" }}
                  />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
