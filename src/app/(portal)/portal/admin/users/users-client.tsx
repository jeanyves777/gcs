"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type Role = "ADMIN" | "STAFF" | "CLIENT_ADMIN" | "CLIENT_USER";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  organization: { name: string } | null;
};

const ROLES: Role[] = ["ADMIN", "STAFF", "CLIENT_ADMIN", "CLIENT_USER"];

const roleStyle: Record<string, { bg: string; color: string }> = {
  ADMIN: { bg: "var(--error-bg)", color: "var(--error)" },
  STAFF: { bg: "var(--info-bg)", color: "var(--info)" },
  CLIENT_ADMIN: { bg: "var(--warning-bg)", color: "var(--warning)" },
  CLIENT_USER: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  STAFF: "Staff",
  CLIENT_ADMIN: "Client Admin",
  CLIENT_USER: "Client User",
};

export function UsersClient({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState<User[]>(initial);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.organization?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (user: User) => {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update user");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u))
      );
      toast.success(`${user.name ?? user.email} ${!user.isActive ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setTogglingId(null);
    }
  };

  const handleRoleChange = async (user: User, newRole: Role) => {
    if (newRole === user.role) return;
    setChangingRoleId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update role");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      toast.success(`Role updated to ${roleLabel[newRole]}`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setChangingRoleId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            Users
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {users.length} total user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
          <Input
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
          />
        </div>
      </div>

      <Card className="card-base overflow-hidden">
        <CardHeader
          className="px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <CardTitle className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center">
              <span>Name / Email</span>
              <span>Role</span>
              <span>Organization</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users
                className="h-10 w-10 mx-auto mb-3 opacity-30"
                style={{ color: "var(--text-muted)" }}
              />
              <p style={{ color: "var(--text-muted)" }}>
                {search ? "No users match your search." : "No users found."}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filtered.map((user) => {
                const rStyle = roleStyle[user.role] ?? roleStyle.CLIENT_USER;
                const isTogglingThis = togglingId === user.id;
                const isChangingRoleThis = changingRoleId === user.id;

                return (
                  <div
                    key={user.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {/* Name / Email */}
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {user.name ?? <span style={{ color: "var(--text-muted)" }}>No name</span>}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {user.email}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Joined {formatDate(user.createdAt)}
                      </p>
                    </div>

                    {/* Role */}
                    <div>
                      {isChangingRoleThis ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          style={{ color: "var(--text-muted)" }}
                        />
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value as Role)}
                          className="text-xs rounded-md px-2 py-1 border outline-none focus:ring-1 appearance-none w-full"
                          style={{
                            background: rStyle.bg,
                            color: rStyle.color,
                            borderColor: `${rStyle.color}30`,
                            cursor: "pointer",
                          }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {roleLabel[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Organization */}
                    <div>
                      {user.organization ? (
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          {user.organization.name}
                        </p>
                      ) : (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          —
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <Badge
                        className="text-xs"
                        style={{
                          background: user.isActive ? "var(--success-bg)" : "var(--bg-tertiary)",
                          color: user.isActive ? "var(--success)" : "var(--text-muted)",
                          border: `1px solid ${user.isActive ? "var(--success)" : "var(--border)"}30`,
                        }}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isTogglingThis}
                        onClick={() => handleToggleActive(user)}
                        className="text-xs h-7 gap-1.5"
                        style={{
                          borderColor: user.isActive ? "var(--error)" : "var(--success)",
                          color: user.isActive ? "var(--error)" : "var(--success)",
                        }}
                      >
                        {isTogglingThis ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : user.isActive ? (
                          <>
                            <UserX className="h-3 w-3" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
