import type { Metadata } from "next";
export const metadata: Metadata = { title: "Maintenance" };
export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={{ background: "var(--bg-primary)" }}>
      <svg viewBox="0 0 120 120" className="w-32 h-32 mb-8" fill="none">
        <circle cx="60" cy="60" r="56" stroke="var(--border)" strokeWidth="3" />
        <path d="M40 60 Q60 40 80 60 Q60 80 40 60Z" fill="var(--brand-primary)" opacity="0.2" />
        <circle cx="60" cy="60" r="12" fill="var(--brand-primary)" opacity="0.8" />
        <line x1="60" y1="20" x2="60" y2="35" stroke="var(--brand-accent)" strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="85" x2="60" y2="100" stroke="var(--brand-accent)" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="60" x2="35" y2="60" stroke="var(--brand-accent)" strokeWidth="3" strokeLinecap="round" />
        <line x1="85" y1="60" x2="100" y2="60" stroke="var(--brand-accent)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h1 className="font-black mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>We&apos;ll be back shortly</h1>
      <p className="max-w-md" style={{ color: "var(--text-secondary)" }}>We&apos;re performing scheduled maintenance to improve our services. This won&apos;t take long — thank you for your patience.</p>
    </div>
  );
}
