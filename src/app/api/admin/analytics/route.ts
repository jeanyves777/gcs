import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";

/**
 * GET /api/admin/analytics?range=7d|30d|90d|all&page=1
 * Returns aggregated analytics data for the admin dashboard.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = req.nextUrl.searchParams.get("range") || "7d";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const perPage = 20;

  // Calculate date range
  const now = new Date();
  let since: Date;
  switch (range) {
    case "24h": since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case "7d": since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case "30d": since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case "90d": since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    default: since = new Date(0);
  }

  const [
    totalVisitors,
    totalPageViews,
    totalSessions,
    newVisitors,
    topPages,
    topReferrers,
    deviceBreakdown,
    browserBreakdown,
    osBreakdown,
    countryBreakdown,
    recentVisitors,
    visitorCount,
    dailyPageViews,
    avgSessionDuration,
    bounceRate,
  ] = await Promise.all([
    // Total unique visitors in range
    db.analyticsVisitor.count({ where: { lastSeen: { gte: since } } }),

    // Total page views in range
    db.analyticsPageView.count({ where: { timestamp: { gte: since } } }),

    // Total sessions in range
    db.analyticsSession.count({ where: { startedAt: { gte: since } } }),

    // New visitors in range
    db.analyticsVisitor.count({ where: { firstSeen: { gte: since } } }),

    // Top pages
    db.$queryRawUnsafe<{ path: string; views: bigint }[]>(
      `SELECT path, COUNT(*) as views FROM "AnalyticsPageView" WHERE timestamp >= $1 GROUP BY path ORDER BY views DESC LIMIT 10`,
      since
    ).catch(() => [] as { path: string; views: bigint }[]),

    // Top referrers
    db.$queryRawUnsafe<{ referrer: string; count: bigint }[]>(
      `SELECT referrer, COUNT(*) as count FROM "AnalyticsSession" WHERE "startedAt" >= $1 AND referrer IS NOT NULL AND referrer != '' GROUP BY referrer ORDER BY count DESC LIMIT 10`,
      since
    ).catch(() => [] as { referrer: string; count: bigint }[]),

    // Device breakdown
    db.$queryRawUnsafe<{ deviceType: string; count: bigint }[]>(
      `SELECT "deviceType", COUNT(*) as count FROM "AnalyticsVisitor" WHERE "lastSeen" >= $1 AND "deviceType" IS NOT NULL GROUP BY "deviceType" ORDER BY count DESC`,
      since
    ).catch(() => [] as { deviceType: string; count: bigint }[]),

    // Browser breakdown
    db.$queryRawUnsafe<{ browser: string; count: bigint }[]>(
      `SELECT browser, COUNT(*) as count FROM "AnalyticsVisitor" WHERE "lastSeen" >= $1 AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC LIMIT 8`,
      since
    ).catch(() => [] as { browser: string; count: bigint }[]),

    // OS breakdown
    db.$queryRawUnsafe<{ os: string; count: bigint }[]>(
      `SELECT os, COUNT(*) as count FROM "AnalyticsVisitor" WHERE "lastSeen" >= $1 AND os IS NOT NULL GROUP BY os ORDER BY count DESC LIMIT 8`,
      since
    ).catch(() => [] as { os: string; count: bigint }[]),

    // Country breakdown
    db.$queryRawUnsafe<{ country: string; countryCode: string; count: bigint }[]>(
      `SELECT country, "countryCode", COUNT(*) as count FROM "AnalyticsVisitor" WHERE "lastSeen" >= $1 AND country IS NOT NULL GROUP BY country, "countryCode" ORDER BY count DESC LIMIT 15`,
      since
    ).catch(() => [] as { country: string; countryCode: string; count: bigint }[]),

    // Recent visitors (paginated)
    db.analyticsVisitor.findMany({
      where: { lastSeen: { gte: since } },
      orderBy: { lastSeen: "desc" },
      take: perPage,
      skip: (page - 1) * perPage,
      include: {
        sessions: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { ip: true, startedAt: true, entryPage: true, duration: true, pageCount: true, referrer: true, utmSource: true },
        },
      },
    }),

    // Total visitor count for pagination
    db.analyticsVisitor.count({ where: { lastSeen: { gte: since } } }),

    // Daily page views for chart (last N days based on range)
    db.$queryRawUnsafe<{ day: string; views: bigint }[]>(
      `SELECT DATE(timestamp) as day, COUNT(*) as views FROM "AnalyticsPageView" WHERE timestamp >= $1 GROUP BY DATE(timestamp) ORDER BY day ASC`,
      since
    ).catch(() => [] as { day: string; views: bigint }[]),

    // Average session duration
    db.$queryRawUnsafe<{ avg: number | null }[]>(
      `SELECT AVG(duration) as avg FROM "AnalyticsSession" WHERE "startedAt" >= $1 AND duration > 0`,
      since
    ).catch(() => [{ avg: null }] as { avg: number | null }[]),

    // Bounce rate
    db.$queryRawUnsafe<{ total: bigint; bounced: bigint }[]>(
      `SELECT COUNT(*) as total, SUM(CASE WHEN "isBounce" = true THEN 1 ELSE 0 END) as bounced FROM "AnalyticsSession" WHERE "startedAt" >= $1`,
      since
    ).catch(() => [{ total: BigInt(0), bounced: BigInt(0) }] as { total: bigint; bounced: bigint }[]),
  ]);

  // Serialize bigints
  const serialize = (arr: { [key: string]: unknown }[]) =>
    arr.map(item => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(item)) {
        out[k] = typeof v === "bigint" ? Number(v) : v;
      }
      return out;
    });

  const totalSessionsNum = bounceRate[0] ? Number(bounceRate[0].total) : 0;
  const bouncedNum = bounceRate[0] ? Number(bounceRate[0].bounced) : 0;

  return NextResponse.json({
    overview: {
      totalVisitors,
      totalPageViews,
      totalSessions,
      newVisitors,
      returningVisitors: totalVisitors - newVisitors,
      avgSessionDuration: Math.round(avgSessionDuration[0]?.avg || 0),
      bounceRate: totalSessionsNum > 0 ? Math.round((bouncedNum / totalSessionsNum) * 100) : 0,
    },
    topPages: serialize(topPages),
    topReferrers: serialize(topReferrers),
    devices: serialize(deviceBreakdown),
    browsers: serialize(browserBreakdown),
    operatingSystems: serialize(osBreakdown),
    countries: serialize(countryBreakdown),
    dailyPageViews: serialize(dailyPageViews),
    visitors: recentVisitors.map(v => ({
      ...v,
      lastSession: v.sessions[0] || null,
      sessions: undefined,
    })),
    pagination: {
      page,
      perPage,
      total: visitorCount,
      totalPages: Math.ceil(visitorCount / perPage),
    },
    range,
  });
}
