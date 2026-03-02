import type { Metadata } from "next";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PortfolioIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "See how GCS has helped businesses transform their technology operations and build powerful software.",
};

const projects = [
  { title: "ERP Integration Platform", client: "Manufacturing Co.", category: "Enterprise", desc: "Connected CRM, inventory, and billing with real-time sync across 5 systems. 60% reduction in manual data entry.", tags: ["Node.js", "PostgreSQL", "React"] },
  { title: "Managed IT for 200-person firm", client: "Legal Services Ltd.", category: "Managed IT", desc: "Migrated 200 users to cloud, deployed endpoint protection, and reduced IT ticket backlog by 80%.", tags: ["Azure", "Intune", "Helpdesk"] },
  { title: "Field Service Mobile App", client: "Facilities Group", category: "Software Dev", desc: "iOS/Android app for 150 field technicians with offline sync, GPS tracking, and work order management.", tags: ["React Native", "SQLite", "API"] },
  { title: "Cloud Cost Optimization", client: "E-commerce Platform", category: "Cloud", desc: "Reduced AWS spend by 43% through reserved instances, right-sizing, and architecture improvements.", tags: ["AWS", "Terraform", "Monitoring"] },
  { title: "Security Hardening Program", client: "Financial Services", category: "Cybersecurity", desc: "Full security audit, MFA rollout, phishing training, and SOC 2 readiness across a 50-person org.", tags: ["SOC 2", "MFA", "Training"] },
  { title: "Customer Portal SaaS", client: "SaaS Startup", category: "Software Dev", desc: "Built a multi-tenant client portal with project tracking, invoicing, and real-time chat from scratch.", tags: ["Next.js", "Prisma", "WebSockets"] },
];

export default function PortfolioPage() {
  return (
    <>
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>Portfolio</Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Work that <span className="text-gradient">drives real results</span>
              </h1>
              <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
                From small business IT to enterprise integrations — here&apos;s a selection of what we&apos;ve built and managed.
              </p>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <PortfolioIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <StaggerItem key={p.title}>
                <Card className="card-base h-full">
                  <CardContent className="p-6">
                    <Badge className="mb-3 text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>{p.category}</Badge>
                    <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
                    <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{p.client}</p>
                    <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{p.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{t}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="section-padding" style={{ background: "var(--brand-primary)" }}>
        <div className="container-gcs text-center max-w-2xl mx-auto">
          <FadeUp>
            <h2 className="font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>Ready to be our next success story?</h2>
            <Link href="/get-quote" className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-colors hover:opacity-90" style={{ background: "white", color: "var(--brand-primary)" }}>
              Start a project <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
