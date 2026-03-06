import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { AnalyticsDashboard } from "./analytics-dashboard";

export const metadata = { title: "Analytics | GCS Admin" };

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/portal");
  return <AnalyticsDashboard />;
}
