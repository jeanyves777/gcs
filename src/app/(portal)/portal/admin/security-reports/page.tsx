import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { SecurityReportsDashboard } from "./security-reports-dashboard";

export const metadata = { title: "Security Reports | GCS Admin" };

export default async function SecurityReportsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/portal");
  return <SecurityReportsDashboard />;
}
