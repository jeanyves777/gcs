import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Notification Settings" };

const prefs = [
  { id: "project_updates", label: "Project updates", desc: "Status changes, milestone completions", defaultChecked: true },
  { id: "ticket_replies", label: "Ticket replies", desc: "When GCS responds to your support tickets", defaultChecked: true },
  { id: "invoice_notifications", label: "Invoices", desc: "New invoices and payment reminders", defaultChecked: true },
  { id: "chat_messages", label: "Chat messages", desc: "New messages in project chats", defaultChecked: false },
  { id: "system_announcements", label: "System announcements", desc: "Maintenance windows and platform updates", defaultChecked: true },
];

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Notifications</h1>
        <Badge style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>Preferences saved in Phase 2</Badge>
      </div>
      <Card className="card-base">
        <CardContent className="p-6 space-y-5">
          {prefs.map(({ id, label, desc, defaultChecked }) => (
            <div key={id} className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor={id} className="font-medium cursor-pointer" style={{ color: "var(--text-primary)" }}>{label}</Label>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
              </div>
              <Switch id={id} defaultChecked={defaultChecked} disabled />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
