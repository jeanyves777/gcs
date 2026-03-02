import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/portal/sidebar";
import { Topbar } from "@/components/portal/topbar";
import { AIChatWidget } from "@/components/portal/ai-chat-widget";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const unreadCount = await db.notification.count({
    where: { userId: session.user.id, readAt: null },
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
      <Sidebar role={session.user.role} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar user={session.user} unreadCount={unreadCount} />

        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ background: "var(--bg-secondary)" }}
        >
          {children}
        </main>
      </div>

      <AIChatWidget />
    </div>
  );
}
