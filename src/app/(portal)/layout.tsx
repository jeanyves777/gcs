import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { Sidebar } from "@/components/portal/sidebar";
import { Topbar } from "@/components/portal/topbar";
import { AdminAIChat } from "@/components/portal/admin-ai-chat";

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

  const showAdminAI = isGCSStaff(session.user.role);

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto" style={{ background: "var(--bg-secondary)" }}>
      <div className="print:hidden">
        <Sidebar role={session.user.role} />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0 print:overflow-visible">
        <div className="print:hidden">
          <Topbar user={session.user} unreadCount={unreadCount} />
        </div>

        <main
          className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0"
          style={{ background: "var(--bg-secondary)" }}
        >
          {children}
        </main>
      </div>

      {showAdminAI && <div className="print:hidden"><AdminAIChat /></div>}
    </div>
  );
}
