import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Profile Settings" };

export default async function ProfileSettingsPage() {
  const user = await requireAuth();
  const initials = user.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Profile</h1>
      <Card className="card-base">
        <CardContent className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-xl font-bold text-white" style={{ background: "var(--brand-primary)" }}>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{user.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</p>
              <Button variant="outline" size="sm" className="mt-2 text-xs h-7" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }} disabled>Change photo</Button>
            </div>
          </div>
          {/* Fields */}
          {[{ id: "name", label: "Full name", value: user.name ?? "" }, { id: "email", label: "Email", value: user.email ?? "" }].map(({ id, label, value }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id} style={{ color: "var(--text-primary)" }}>{label}</Label>
              <Input id={id} defaultValue={value} style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} readOnly />
            </div>
          ))}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Profile editing will be enabled in Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
