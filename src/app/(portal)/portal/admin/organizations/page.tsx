import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { OrganizationsClient } from "./organizations-client";

export const metadata: Metadata = { title: "Admin — Organizations" };

export default async function AdminOrgsPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const orgs = await db.organization.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          users: true,
          projects: true,
          invoices: true,
          tickets: true,
          guardAgents: true,
        },
      },
    },
  });

  // Serialize Date objects to strings for client component
  const serialized = orgs.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    deletedAt: o.deletedAt?.toISOString() ?? null,
    trialEndsAt: o.trialEndsAt?.toISOString() ?? null,
  }));

  return <OrganizationsClient initialOrgs={serialized} />;
}
