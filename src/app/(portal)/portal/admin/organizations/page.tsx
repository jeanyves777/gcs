import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FolderOpen, Receipt, Headphones } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin — Organizations" };

const tierStyle: Record<string, { bg: string; color: string }> = {
  BASIC: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  PROFESSIONAL: { bg: "var(--info-bg)", color: "var(--info)" },
  ENTERPRISE: { bg: "var(--warning-bg)", color: "var(--warning)" },
};

export default async function AdminOrgsPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const orgs = await db.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          users: true,
          projects: true,
          invoices: true,
          tickets: true,
        },
      },
    },
  });

  const totalUsers = orgs.reduce((sum, o) => sum + o._count.users, 0);
  const totalProjects = orgs.reduce((sum, o) => sum + o._count.projects, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          Organizations
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {orgs.length} organization{orgs.length !== 1 ? "s" : ""} &middot; {totalUsers} users &middot;{" "}
          {totalProjects} projects
        </p>
      </div>

      {orgs.length === 0 ? (
        <div className="text-center py-20">
          <Building2
            className="h-12 w-12 mx-auto mb-4 opacity-30"
            style={{ color: "var(--text-muted)" }}
          />
          <p style={{ color: "var(--text-muted)" }}>No organizations yet.</p>
        </div>
      ) : (
        <Card className="card-base overflow-hidden">
          <CardHeader
            className="px-5 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <CardTitle
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center">
                <span>Organization</span>
                <span>Tier</span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Users
                </span>
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Projects
                </span>
                <span className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  Invoices
                </span>
                <span className="flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5" />
                  Tickets
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {orgs.map((org) => {
                const tier = tierStyle[org.subscriptionTier] ?? tierStyle.BASIC;
                return (
                  <div
                    key={org.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-4 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {/* Organization info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <Building2
                            className="h-3.5 w-3.5"
                            style={{ color: "var(--text-muted)" }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {org.name}
                          </p>
                          {org.domain && (
                            <p
                              className="text-xs truncate"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {org.domain}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs mt-1.5 pl-9" style={{ color: "var(--text-muted)" }}>
                        Created {formatDate(org.createdAt)}
                      </p>
                    </div>

                    {/* Tier */}
                    <div>
                      <Badge
                        className="text-xs"
                        style={{
                          background: tier.bg,
                          color: tier.color,
                          border: `1px solid ${tier.color}30`,
                        }}
                      >
                        {org.subscriptionTier}
                      </Badge>
                      <div className="mt-1.5">
                        <Badge
                          className="text-xs"
                          style={{
                            background: org.isActive ? "var(--success-bg)" : "var(--bg-tertiary)",
                            color: org.isActive ? "var(--success)" : "var(--text-muted)",
                            border: `1px solid ${org.isActive ? "var(--success)" : "var(--border)"}30`,
                          }}
                        >
                          {org.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    {/* Users */}
                    <div>
                      <p
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {org._count.users}
                      </p>
                    </div>

                    {/* Projects */}
                    <div>
                      <p
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {org._count.projects}
                      </p>
                    </div>

                    {/* Invoices */}
                    <div>
                      <p
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {org._count.invoices}
                      </p>
                    </div>

                    {/* Tickets */}
                    <div>
                      <p
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {org._count.tickets}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
