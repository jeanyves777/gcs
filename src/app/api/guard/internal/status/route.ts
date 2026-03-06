import { NextResponse } from "next/server";
import { getSystemMetrics } from "@/lib/internal-scanner";
import { getCurrentUser } from "@/lib/auth-utils";

/**
 * GET /api/guard/internal/status
 * Lightweight real-time system metrics — no DB, no full scan.
 * Returns current CPU, memory, disk, load, network I/O.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = getSystemMetrics();

    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GuardInternal] Status error:", error);
    return NextResponse.json({ error: "Failed to get metrics" }, { status: 500 });
  }
}
