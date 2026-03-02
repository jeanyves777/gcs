import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/portal/sidebar";
import { Topbar } from "@/components/portal/topbar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar user={session.user} />

        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ background: "var(--bg-secondary)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
