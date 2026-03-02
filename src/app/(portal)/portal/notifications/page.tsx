import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireAuth();
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Notifications</h1>
      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const content = (
              <Card key={n.id} className={`card-base transition-all ${!n.readAt ? "border-l-2" : ""}`} style={{ borderLeftColor: !n.readAt ? "var(--brand-primary)" : undefined }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: !n.readAt ? "var(--brand-primary)" : "var(--border)" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{n.title}</p>
                      {n.content && <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{n.content}</p>}
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            return n.link ? <Link key={n.id} href={n.link}>{content}</Link> : <div key={n.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
