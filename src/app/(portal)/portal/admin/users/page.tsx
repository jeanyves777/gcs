import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { UsersClient } from "./users-client";

export const metadata: Metadata = { title: "Admin — Users" };

export default async function AdminUsersPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { organization: { select: { name: true } } },
  });

  return <UsersClient users={users} />;
}
