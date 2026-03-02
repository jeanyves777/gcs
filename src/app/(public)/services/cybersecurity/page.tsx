import type { Metadata } from "next";
export const metadata: Metadata = { title: "Cybersecurity", description: "Protect your business with vulnerability assessments, endpoint protection, and incident response." };
import Link from "next/link";
import { FadeUp, FadeIn } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { CybersecurityIllustration } from "@/components/shared/illustrations";
export default function CybersecurityPage() {
  return (
    <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeUp>
            <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>Cybersecurity</Badge>
            <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>Protect what matters — <span className="text-gradient">before it&apos;s at risk</span></h1>
            <p className="text-lg mb-8" style={{ color: "var(--text-secondary)" }}>Vulnerability assessments, endpoint protection, MFA enforcement, security awareness training, and incident response — we help you stay ahead of threats.</p>
            <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}><Link href="/get-quote">Get a security assessment <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </FadeUp>
          <div className="hidden sm:block">
            <FadeIn delay={0.2}>
              <CybersecurityIllustration />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
