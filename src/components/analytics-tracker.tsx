"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * GCS Analytics Tracker
 * Lightweight client-side tracking: fingerprinting, page views, sessions, UTM, referrer.
 * Collects data and sends to /api/analytics/collect via beacon/fetch.
 */

const COLLECT_URL = "/api/analytics/collect";
const SESSION_KEY = "gcs_sid";
const VISITOR_KEY = "gcs_vid";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min

// ─── Fingerprint ─────────────────────────────────────────────────────────────

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 100, 50);
    ctx.fillStyle = "#069";
    ctx.fillText("GCS-fp", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("GCS-fp", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "";
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "";
  } catch {
    return "";
  }
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() || "",
    (navigator as { deviceMemory?: number }).deviceMemory?.toString() || "",
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    navigator.platform || "",
  ].join("|");
  return hashString(components);
}

// ─── UTM & Referrer ──────────────────────────────────────────────────────────

function getUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function parseBrowser(): { browser: string; version: string } {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let version = "";

  if (/Edg\//.test(ua)) { browser = "Edge"; version = ua.match(/Edg\/([\d.]+)/)?.[1] || ""; }
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) { browser = "Chrome"; version = ua.match(/Chrome\/([\d.]+)/)?.[1] || ""; }
  else if (/Firefox\//.test(ua)) { browser = "Firefox"; version = ua.match(/Firefox\/([\d.]+)/)?.[1] || ""; }
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) { browser = "Safari"; version = ua.match(/Version\/([\d.]+)/)?.[1] || ""; }

  return { browser, version };
}

function parseOS(): { os: string; version: string } {
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua)) return { os: "Windows", version: "10/11" };
  if (/Windows NT/.test(ua)) return { os: "Windows", version: ua.match(/Windows NT ([\d.]+)/)?.[1] || "" };
  if (/Mac OS X/.test(ua)) return { os: "macOS", version: ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, ".") || "" };
  if (/Android/.test(ua)) return { os: "Android", version: ua.match(/Android ([\d.]+)/)?.[1] || "" };
  if (/iPhone|iPad/.test(ua)) return { os: "iOS", version: ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "" };
  if (/Linux/.test(ua)) return { os: "Linux", version: "" };
  return { os: "Unknown", version: "" };
}

// ─── Session Management ──────────────────────────────────────────────────────

function getOrCreateSession(): { sessionId: string; isNew: boolean } {
  const now = Date.now();
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (now - parsed.lastActivity < SESSION_TIMEOUT) {
        parsed.lastActivity = now;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        return { sessionId: parsed.id, isNew: false };
      }
    } catch { /* expired or invalid */ }
  }

  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastActivity: now }));
  return { sessionId: id, isNew: true };
}

// ─── Send Data ───────────────────────────────────────────────────────────────

function sendBeacon(data: Record<string, unknown>): void {
  const payload = JSON.stringify(data);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(COLLECT_URL, payload);
  } else {
    fetch(COLLECT_URL, { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AnalyticsTracker() {
  const pathname = usePathname();
  const pageStartRef = useRef(Date.now());
  const scrollMaxRef = useRef(0);
  const lastPathRef = useRef("");
  const fingerprintRef = useRef("");
  const initRef = useRef(false);

  // Track scroll depth
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const depth = Math.round((scrollTop / docHeight) * 100);
        scrollMaxRef.current = Math.max(scrollMaxRef.current, depth);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Page view tracking
  useEffect(() => {
    if (!pathname || pathname === lastPathRef.current) return;

    // Send page leave for previous page
    if (lastPathRef.current && fingerprintRef.current) {
      const duration = Math.round((Date.now() - pageStartRef.current) / 1000);
      sendBeacon({
        type: "page_leave",
        fingerprint: fingerprintRef.current,
        sessionId: getOrCreateSession().sessionId,
        path: lastPathRef.current,
        duration,
        scrollDepth: scrollMaxRef.current,
      });
    }

    lastPathRef.current = pathname;
    pageStartRef.current = Date.now();
    scrollMaxRef.current = 0;

    // Generate fingerprint + send page view
    (async () => {
      if (!fingerprintRef.current) {
        fingerprintRef.current = await generateFingerprint();
      }

      const { sessionId, isNew } = getOrCreateSession();
      const { browser, version: browserVersion } = parseBrowser();
      const { os, version: osVersion } = parseOS();
      const utm = getUTMParams();

      const data: Record<string, unknown> = {
        type: "page_view",
        fingerprint: fingerprintRef.current,
        sessionId,
        isNewSession: isNew,
        path: pathname,
        title: document.title,
        referrer: document.referrer || undefined,
        browser,
        browserVersion,
        os,
        osVersion,
        deviceType: getDeviceType(),
        screenWidth: screen.width,
        screenHeight: screen.height,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...utm,
      };

      sendBeacon(data);

      // First-time init: register visitor
      if (!initRef.current) {
        initRef.current = true;
        // Store visitor fingerprint
        try { localStorage.setItem(VISITOR_KEY, fingerprintRef.current); } catch { }
      }
    })();
  }, [pathname]);

  // Send page leave on unload
  useEffect(() => {
    const onUnload = () => {
      if (fingerprintRef.current && lastPathRef.current) {
        const duration = Math.round((Date.now() - pageStartRef.current) / 1000);
        sendBeacon({
          type: "page_leave",
          fingerprint: fingerprintRef.current,
          sessionId: getOrCreateSession().sessionId,
          path: lastPathRef.current,
          duration,
          scrollDepth: scrollMaxRef.current,
        });
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  return null; // No UI
}
