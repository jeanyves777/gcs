import type { Metadata } from "next";
export const metadata: Metadata = { title: "Enterprise Solutions", description: "Scalable enterprise systems — ERP integrations, data pipelines, and workflow automation." };
import Link from "next/link";
import { FadeUp, FadeIn } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { EnterpriseIllustration } from "@/components/shared/illustrations";
export default function EnterprisePage() {
  return (
    <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeUp>
            <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>Enterprise Solutions</Badge>
            <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>Scale your operations <span className="text-gradient">without limits</span></h1>
            <p className="text-lg mb-8" style={{ color: "var(--text-secondary)" }}>ERP integrations, data pipelines, workflow automation, and custom enterprise software that connects every part of your business.</p>
            <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}><Link href="/get-quote">Discuss your project <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </FadeUp>
          <div className="hidden sm:block">
            <FadeIn delay={0.2}>
              <EnterpriseIllustration />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
