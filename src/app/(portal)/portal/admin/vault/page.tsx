import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { VaultClient } from "./vault-client";

export const metadata: Metadata = { title: "Admin — Credential Vault" };

export default async function AdminVaultPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const entries = await db.vaultEntry.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      label: true,
      category: true,
      url: true,
      description: true,
      encUsername: true,
      encPassword: true,
      encApiKey: true,
      encNotes: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
    },
  });

  const serialized = entries.map((e) => ({
    id: e.id,
    label: e.label,
    category: e.category,
    url: e.url,
    description: e.description,
    hasUsername: !!e.encUsername,
    hasPassword: !!e.encPassword,
    hasApiKey: !!e.encApiKey,
    hasNotes: !!e.encNotes,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    createdByName: e.createdBy.name,
  }));

  return <VaultClient initialEntries={serialized} />;
}
