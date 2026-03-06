import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runFullScan } from "@/lib/internal-scanner";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = await db.guardAgent.findUnique({
      where: { id: "INTERNAL_GCS_SERVER" },
      include: {
        metrics: { orderBy: { timestamp: "desc" }, take: 100 },
        alerts: { orderBy: { createdAt: "desc" }, take: 50 },
        devices: true,
        serviceStatuses: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ success: false, agent: null });
    }

    return NextResponse.json({ success: true, agent, lastUpdate: agent.lastHeartbeat });
  } catch (error) {
    console.error("[GuardInternal] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "scan") {
      const scanResults = await runFullScan();
      return NextResponse.json({ success: true, scan: scanResults, timestamp: new Date() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[GuardInternal] POST error:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
