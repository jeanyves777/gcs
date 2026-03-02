import type { Metadata } from "next";
import Link from "next/link";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, GitMerge, Database, Zap, RefreshCw, BarChart2, Network } from "lucide-react";
import { EnterpriseIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Enterprise Solutions",
  description: "Scalable enterprise systems — ERP integrations, data pipelines, workflow automation, and custom software built around your business.",
};

const features = [
  { icon: GitMerge, title: "ERP & CRM Integration", desc: "Connect your ERP, CRM, and third-party tools into a single unified workflow. No more manual data transfers between systems." },
  { icon: Database, title: "Data Pipelines & Warehousing", desc: "Automated data ingestion, transformation, and storage. Turn raw operational data into reliable business intelligence." },
  { icon: Zap, title: "Workflow Automation", desc: "Eliminate repetitive manual processes with custom automation across your operations, approvals, and reporting flows." },
  { icon: RefreshCw, title: "Legacy System Modernization", desc: "Migrate legacy applications to modern stacks without disrupting daily operations. Progressive, risk-managed rollouts." },
  { icon: BarChart2, title: "Custom Dashboards & Reporting", desc: "Real-time dashboards and scheduled reports tailored to your KPIs, roles, and decision-making workflows." },
  { icon: Network, title: "API Design & Integrations", desc: "RESTful and GraphQL APIs that connect your internal systems and third-party services cleanly and securely." },
];

const process = [
  { step: "01", title: "Discovery", desc: "We map your existing systems, data flows, and pain points to understand the full scope before writing a line of code." },
  { step: "02", title: "Architecture", desc: "We design a scalable solution blueprint — tech stack, integration points, data models — reviewed and approved by your team." },
  { step: "03", title: "Build & Integrate", desc: "Iterative delivery in short sprints. You see working software early and provide feedback throughout the build." },
  { step: "04", title: "Deploy & Support", desc: "Production rollout with full documentation and ongoing support. We stay engaged long after go-live." },
];

export default function EnterprisePage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                Enterprise Solutions
              </Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Scale your operations{" "}
                <span className="text-gradient">without limits</span>
              </h1>
              <p className="text-lg max-w-2xl mb-8" style={{ color: "var(--text-secondary)" }}>
                ERP integrations, data pipelines, workflow automation, and custom enterprise software
                that connects every part of your business — built for the way you actually work.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                  <Link href="/get-quote">Discuss your project <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <Link href="/contact">Talk to us first</Link>
                </Button>
              </div>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <EnterpriseIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>What we build</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              End-to-end enterprise solutions that reduce manual work, improve data visibility, and scale with your business.
            </p>
          </FadeUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title}>
                <div className="card-base p-6">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--bg-tertiary)" }}>
                    <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Process */}
      <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>How we work</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              A structured process that keeps your project on track — from discovery through go-live.
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {process.map(({ step, title, desc }) => (
              <FadeUp key={step}>
                <div className="card-base p-6">
                  <div
                    className="text-3xl font-black mb-4"
                    style={{ color: "var(--brand-primary)", opacity: 0.25, fontFamily: "var(--font-display)" }}
                  >
                    {step}
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding text-white" style={{ background: "var(--brand-primary)" }}>
        <div className="container-gcs text-center">
          <h2 className="font-bold mb-4 text-white" style={{ fontFamily: "var(--font-display)" }}>
            Ready to modernize your operations?
          </h2>
          <p className="mb-8 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>
            Tell us about your systems and goals. We&apos;ll put together a practical roadmap — no fluff, no over-engineering.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="font-semibold px-8" style={{ background: "white", color: "var(--brand-primary)" }}>
              <Link href="/get-quote">Get a free assessment</Link>
            </Button>
            <Button
              asChild variant="outline" size="lg" className="font-semibold px-8"
              style={{ background: "transparent", color: "white", borderColor: "rgba(255,255,255,0.4)" }}
            >
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
