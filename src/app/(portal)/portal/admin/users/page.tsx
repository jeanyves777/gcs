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

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    staff: users.filter((u) => u.role === "STAFF").length,
    clientAdmins: users.filter((u) => u.role === "CLIENT_ADMIN").length,
    clientUsers: users.filter((u) => u.role === "CLIENT_USER").length,
  };

  return <UsersClient users={users} stats={stats} />;
}
