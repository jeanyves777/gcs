import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Smartphone, Key } from "lucide-react";

export const metadata: Metadata = { title: "Security Settings" };

export default function SecuritySettingsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Security</h1>
      <div className="space-y-4">
        {[
          { icon: Key, title: "Password", desc: "Last changed: never", action: "Change password", available: false },
          { icon: Smartphone, title: "Two-Factor Authentication", desc: "Add an extra layer of security with TOTP.", action: "Enable 2FA", available: false },
          { icon: Shield, title: "Active Sessions", desc: "Manage where you're signed in.", action: "View sessions", available: false },
        ].map(({ icon: Icon, title, desc, action, available }) => (
          <Card key={title} className="card-base">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-tertiary)" }}>
                <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{title}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
              </div>
              <Button variant="outline" size="sm" disabled={!available} className="text-xs h-7" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                {action}
                {!available && <Badge className="ml-2 text-[9px] h-4 px-1.5" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>Phase 2</Badge>}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
