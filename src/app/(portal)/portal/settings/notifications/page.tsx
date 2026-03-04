"use client";

import { useEffect, useState } from "react";
import { Loader2, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PREF_DEFS = [
  { id: "project_updates", label: "Project updates", desc: "Status changes, milestone completions" },
  { id: "ticket_replies", label: "Ticket replies", desc: "When GCS responds to your support tickets" },
  { id: "invoice_notifications", label: "Invoices", desc: "New invoices and payment reminders" },
  { id: "chat_messages", label: "Chat messages", desc: "New messages in project chats" },
  { id: "system_announcements", label: "System announcements", desc: "Maintenance windows and platform updates" },
];

type Prefs = Record<string, boolean>;

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/portal/notifications/preferences")
      .then((r) => r.json())
      .then((data: Prefs) => {
        setPrefs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/portal/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Notification preferences saved");
    } else {
      toast.error("Failed to save preferences");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
            <Bell className="h-5 w-5" />
          </div>
          Notifications
        </h1>
        <Button
          onClick={save}
          disabled={saving || loading}
          className="text-white text-sm"
          style={{ background: "var(--brand-primary)" }}
        >
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save preferences"}
        </Button>
      </div>

      <Card className="card-base">
        <CardContent className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : (
            PREF_DEFS.map(({ id, label, desc }) => (
              <div key={id} className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor={id} className="font-medium cursor-pointer" style={{ color: "var(--text-primary)" }}>
                    {label}
                  </Label>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
                <Switch
                  id={id}
                  checked={!!prefs[id]}
                  onCheckedChange={() => toggle(id)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
