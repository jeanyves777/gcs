import type { Metadata } from "next";
export const metadata: Metadata = { title: "Cloud Management", description: "AWS, Azure & GCP management. Cloud migration, cost optimization, and DevOps." };
import Link from "next/link";
import { FadeUp, FadeIn } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { CloudIllustration } from "@/components/shared/illustrations";
export default function CloudPage() {
  return (
    <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeUp>
            <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>Cloud Management</Badge>
            <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>Optimize your cloud — <span className="text-gradient">reduce costs, increase reliability</span></h1>
            <p className="text-lg mb-8" style={{ color: "var(--text-secondary)" }}>AWS, Azure, and GCP management including cloud migration strategy, cost optimization, and full DevOps/CI-CD pipeline setup.</p>
            <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}><Link href="/get-quote">Get cloud consultation <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </FadeUp>
          <div className="hidden sm:block">
            <FadeIn delay={0.2}>
              <CloudIllustration />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
