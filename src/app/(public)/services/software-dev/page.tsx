import type { Metadata } from "next";
import Link from "next/link";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Smartphone, Puzzle, RefreshCw, BarChart3, Layers } from "lucide-react";
import { SoftwareDevIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Custom Software Development",
  description: "Tailor-made web apps, mobile apps, and enterprise systems designed around your specific workflows.",
};

const capabilities = [
  { icon: Globe, title: "Web Applications", desc: "Full-stack web apps built with modern frameworks like Next.js, React, and Node.js." },
  { icon: Smartphone, title: "Mobile Apps", desc: "iOS and Android apps using React Native — one codebase, native performance." },
  { icon: Puzzle, title: "API & Integrations", desc: "Connect your tools and systems with robust, well-documented REST and GraphQL APIs." },
  { icon: RefreshCw, title: "Legacy Modernization", desc: "Migrate outdated systems to modern stacks without disrupting business operations." },
  { icon: BarChart3, title: "Dashboards & Analytics", desc: "Custom BI dashboards that surface the data your team actually needs." },
  { icon: Layers, title: "SaaS Products", desc: "Multi-tenant SaaS platforms with subscription billing, auth, and customer portals." },
];

export default function SoftwareDevPage() {
  return (
    <>
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>Custom Software</Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Built precisely for <span className="text-gradient">your workflows</span>
              </h1>
              <p className="text-lg max-w-2xl mb-8" style={{ color: "var(--text-secondary)" }}>
                When off-the-shelf tools fall short, we build tailor-made applications that increase revenue, reduce costs, and connect your entire business.
              </p>
              <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                <Link href="/get-quote">Start a project <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <SoftwareDevIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>What we build</h2>
          </FadeUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title}>
                <div className="card-base p-6">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--bg-tertiary)" }}>
                    <Icon className="h-5 w-5" style={{ color: "var(--brand-accent)" }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </>
  );
}
