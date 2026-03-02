import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeadphonesIcon, Code2, Server, Cloud, Shield } from "lucide-react";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServicesIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Comprehensive managed IT services and custom software development. From helpdesk to enterprise systems — GCS covers it all.",
};

const services = [
  {
    icon: HeadphonesIcon,
    title: "Managed IT Services",
    href: "/services/managed-it",
    tagline: "Your full outsourced IT department",
    features: ["24/7 monitoring & alerting", "Helpdesk & user support", "Network & security management", "Patch management & updates"],
    color: "var(--brand-primary)",
  },
  {
    icon: Code2,
    title: "Custom Software Development",
    href: "/services/software-dev",
    tagline: "Built precisely for your business",
    features: ["Web & mobile applications", "API development & integrations", "SaaS product development", "Legacy system modernization"],
    color: "var(--brand-accent)",
  },
  {
    icon: Server,
    title: "Enterprise Solutions",
    href: "/services/enterprise",
    tagline: "Scale without limits",
    features: ["ERP & CRM integrations", "Data pipelines & warehousing", "Workflow automation", "Business intelligence dashboards"],
    color: "var(--success)",
  },
  {
    icon: Cloud,
    title: "Cloud Management",
    href: "/services/cloud",
    tagline: "Optimize your cloud spend",
    features: ["AWS, Azure & GCP management", "Cloud migration & strategy", "Cost optimization", "DevOps & CI/CD pipelines"],
    color: "var(--info)",
  },
  {
    icon: Shield,
    title: "Cybersecurity",
    href: "/services/cybersecurity",
    tagline: "Protect what matters",
    features: ["Vulnerability assessments", "Endpoint protection", "Security awareness training", "Incident response"],
    color: "var(--warning)",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                Our Services
              </Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Everything your business needs —{" "}
                <span className="text-gradient">under one roof</span>
              </h1>
              <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
                From keeping your systems running to building your next product, GCS combines managed
                services with software expertise so you never need more than one technology partner.
              </p>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <ServicesIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {services.map(({ icon: Icon, title, href, tagline, features, color }) => (
              <StaggerItem key={href}>
                <Link href={href} className="block group">
                  <div className="card-base p-6 h-full hover:border-[var(--brand-primary)] transition-all">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}18` }}>
                      <Icon className="h-6 w-6" style={{ color }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h3>
                    <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{tagline}</p>
                    <ul className="space-y-2">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                          <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1.5 mt-5 text-sm font-medium" style={{ color }}>
                      Learn more <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="section-padding text-white" style={{ background: "var(--brand-primary)" }}>
        <div className="container-gcs text-center max-w-2xl mx-auto">
          <FadeUp>
            <h2 className="font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>Not sure where to start?</h2>
            <p className="mb-8" style={{ color: "rgba(255,255,255,0.85)" }}>Let us understand your needs and recommend the right combination of services for your business.</p>
            <Button asChild size="lg" className="font-semibold px-8" style={{ background: "white", color: "var(--brand-primary)" }}>
              <Link href="/get-quote">Book a free consultation</Link>
            </Button>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
