import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/analytics/collect
 * Receives tracking beacons from the client-side AnalyticsTracker.
 * Handles: page_view (creates/updates visitor + session + pageview)
 *          page_leave (updates duration + scroll depth)
 *          event (custom events)
 */

// Simple IP geo lookup (free, no API key)
async function geoLookup(ip: string): Promise<{ country?: string; countryCode?: string; region?: string; city?: string }> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return {};
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,regionName,city`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return {};
    const data = await res.json();
    return { country: data.country, countryCode: data.countryCode, region: data.regionName, city: data.city };
  } catch {
    return {};
  }
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, fingerprint, sessionId } = body;

    if (!fingerprint || !sessionId) {
      return new NextResponse(null, { status: 204 });
    }

    const ip = getClientIP(req);

    if (type === "page_view") {
      // Upsert visitor
      let visitor = await db.analyticsVisitor.findUnique({ where: { fingerprint } });

      if (!visitor) {
        // New visitor — do geo lookup
        const geo = await geoLookup(ip);
        visitor = await db.analyticsVisitor.create({
          data: {
            fingerprint,
            browser: body.browser,
            browserVersion: body.browserVersion,
            os: body.os,
            osVersion: body.osVersion,
            deviceType: body.deviceType,
            screenWidth: body.screenWidth,
            screenHeight: body.screenHeight,
            language: body.language,
            timezone: body.timezone,
            country: geo.country,
            countryCode: geo.countryCode,
            region: geo.region,
            city: geo.city,
            firstReferrer: body.referrer || null,
            firstUtmSource: body.utm_source || null,
            firstUtmMedium: body.utm_medium || null,
            firstUtmCampaign: body.utm_campaign || null,
          },
        });
      } else {
        // Update last seen + visit count
        await db.analyticsVisitor.update({
          where: { fingerprint },
          data: {
            lastSeen: new Date(),
            totalVisits: { increment: body.isNewSession ? 1 : 0 },
            totalPageViews: { increment: 1 },
          },
        });
      }

      // Upsert session
      const existingSession = await db.analyticsSession.findUnique({ where: { id: sessionId } });
      if (!existingSession) {
        await db.analyticsSession.create({
          data: {
            id: sessionId,
            visitorId: visitor.id,
            ip,
            entryPage: body.path,
            referrer: body.referrer || null,
            utmSource: body.utm_source || null,
            utmMedium: body.utm_medium || null,
            utmCampaign: body.utm_campaign || null,
            utmTerm: body.utm_term || null,
            utmContent: body.utm_content || null,
            userAgent: req.headers.get("user-agent") || null,
            pageCount: 1,
          },
        });
      } else {
        await db.analyticsSession.update({
          where: { id: sessionId },
          data: {
            exitPage: body.path,
            pageCount: { increment: 1 },
            isBounce: false,
            endedAt: new Date(),
          },
        });
      }

      // Create page view
      await db.analyticsPageView.create({
        data: {
          visitorId: visitor.id,
          sessionId,
          path: body.path,
          title: body.title || null,
          referrer: body.referrer || null,
        },
      });

    } else if (type === "page_leave") {
      // Update page view duration + scroll depth
      const pv = await db.analyticsPageView.findFirst({
        where: { sessionId, path: body.path },
        orderBy: { timestamp: "desc" },
      });
      if (pv) {
        await db.analyticsPageView.update({
          where: { id: pv.id },
          data: {
            duration: body.duration || 0,
            scrollDepth: body.scrollDepth || 0,
          },
        });
      }

      // Update session duration
      const session = await db.analyticsSession.findUnique({ where: { id: sessionId } });
      if (session) {
        const totalDuration = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000);
        await db.analyticsSession.update({
          where: { id: sessionId },
          data: { duration: totalDuration, endedAt: new Date(), exitPage: body.path },
        });
      }

    } else if (type === "event") {
      await db.analyticsEvent.create({
        data: {
          visitorId: fingerprint,
          sessionId,
          eventName: body.eventName || "unknown",
          eventData: body.eventData ? JSON.stringify(body.eventData) : null,
          path: body.path || "/",
        },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Analytics] Collection error:", error);
    // Never fail the beacon — always return 204
    return new NextResponse(null, { status: 204 });
  }
}
