"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Notification = {
  id: string;
  title: string;
  content: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationsClient({ notifications: initial }: { notifications: Notification[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initial);
  const [marking, setMarking] = useState(false);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setMarking(true);
    const res = await fetch("/api/portal/notifications/read-all", { method: "POST" });
    setMarking(false);
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
      toast.success("All notifications marked as read");
      router.refresh();
    } else {
      toast.error("Failed to mark notifications as read");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={marking}
            className="text-xs gap-1.5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const card = (
              <Card
                className={`card-base transition-all ${!n.readAt ? "border-l-2" : ""}`}
                style={{ borderLeftColor: !n.readAt ? "var(--brand-primary)" : undefined }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: !n.readAt ? "var(--brand-primary)" : "var(--border)" }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{n.title}</p>
                      {n.content && <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{n.content}</p>}
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            return n.link ? (
              <Link key={n.id} href={n.link}>{card}</Link>
            ) : (
              <div key={n.id}>{card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
