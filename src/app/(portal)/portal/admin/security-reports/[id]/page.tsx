import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { SecurityReportDetail } from "./report-detail";

export const metadata = { title: "Security Report | GCS Admin" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/portal");
  const { id } = await params;
  return <SecurityReportDetail reportId={id} />;
}
