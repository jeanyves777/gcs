"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={{ background: "var(--bg-primary)" }}>
      <svg viewBox="0 0 120 100" className="w-36 h-28 mb-8" fill="none">
        <rect x="10" y="20" width="100" height="65" rx="8" stroke="var(--error)" strokeWidth="2" opacity="0.3" />
        <path d="M10 32 H110" stroke="var(--error)" strokeWidth="2" opacity="0.3" />
        <circle cx="22" cy="26" r="3" fill="var(--error)" opacity="0.5" />
        <circle cx="32" cy="26" r="3" fill="var(--warning)" opacity="0.5" />
        <circle cx="42" cy="26" r="3" fill="var(--success)" opacity="0.5" />
        <text x="48" y="70" fontSize="28" fontWeight="900" fill="var(--error)" opacity="0.4" fontFamily="monospace">!</text>
      </svg>
      <h1 className="font-black text-3xl mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Something went wrong</h1>
      <p className="mb-8 max-w-sm" style={{ color: "var(--text-secondary)" }}>
        An unexpected error occurred. Our team has been notified.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} className="text-white" style={{ background: "var(--brand-primary)" }}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
        <Button asChild variant="outline" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Go home</Link>
        </Button>
      </div>
    </div>
  );
}
