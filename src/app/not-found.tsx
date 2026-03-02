import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={{ background: "var(--bg-primary)" }}>
      <svg viewBox="0 0 160 120" className="w-48 h-36 mb-8" fill="none">
        <text x="8" y="90" fontSize="80" fontWeight="900" fill="var(--bg-tertiary)" fontFamily="var(--font-display)">404</text>
        <circle cx="80" cy="45" r="30" stroke="var(--brand-primary)" strokeWidth="2" opacity="0.3" strokeDasharray="6 3" />
        <circle cx="80" cy="45" r="18" fill="var(--brand-primary)" opacity="0.1" />
        <text x="73" y="51" fontSize="18" fill="var(--brand-primary)" opacity="0.7">?</text>
      </svg>
      <h1 className="font-black text-4xl mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Page not found</h1>
      <p className="mb-8 max-w-sm" style={{ color: "var(--text-secondary)" }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to home</Link>
      </Button>
    </div>
  );
}
