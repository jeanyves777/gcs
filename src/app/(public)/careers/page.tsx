import type { Metadata } from "next";
export const metadata: Metadata = { title: "Careers", description: "Join the GCS team. We're a remote-first company building innovative managed IT and software solutions." };
import Link from "next/link";
import { FadeUp, FadeIn } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CareersIllustration } from "@/components/shared/illustrations";
export default function CareersPage() {
  return (
    <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeUp>
            <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>Careers</Badge>
            <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>Build the future of <span className="text-gradient">managed technology</span></h1>
            <p className="text-lg mb-8" style={{ color: "var(--text-secondary)" }}>GCS is a remote-first team of engineers, DevOps specialists, and IT professionals solving real problems for real businesses. We&apos;re growing and always looking for great people.</p>
            <p className="text-base mb-8" style={{ color: "var(--text-muted)" }}>No open roles at the moment — but we&apos;re always interested in meeting talented people. Send us a note.</p>
            <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}><Link href="/contact">Get in touch</Link></Button>
          </FadeUp>
          <div className="hidden sm:block">
            <FadeIn delay={0.2}>
              <CareersIllustration />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
