import type { Metadata } from "next";
import Link from "next/link";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CloudUpload, TrendingDown, GitBranch, ShieldCheck, Activity, Layers } from "lucide-react";
import { CloudIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Cloud Management",
  description: "AWS, Azure & GCP management. Cloud migration, cost optimization, and DevOps — ongoing managed cloud operations for your business.",
};

const features = [
  { icon: CloudUpload, title: "Cloud Migration", desc: "Move workloads from on-premise or legacy hosting to AWS, Azure, or GCP — with zero downtime and a clear cutover plan." },
  { icon: TrendingDown, title: "Cost Optimization", desc: "Identify and eliminate wasted cloud spend. Right-size resources, reserve instances, and get monthly cost reports." },
  { icon: GitBranch, title: "DevOps & CI/CD Pipelines", desc: "Automated build, test, and deploy pipelines. Ship code faster and more reliably with GitHub Actions, GitLab CI, or AWS CodePipeline." },
  { icon: ShieldCheck, title: "Security & Compliance", desc: "IAM policies, network security groups, encryption at rest and in-transit, and compliance controls for SOC 2, HIPAA, or GDPR." },
  { icon: Activity, title: "Monitoring & Alerting", desc: "Full-stack observability with CloudWatch, Datadog, or Grafana. Get alerted before your users notice a problem." },
  { icon: Layers, title: "Multi-Cloud & Hybrid", desc: "Architect workloads across multiple cloud providers or bridge on-premise infrastructure with cloud resources seamlessly." },
];

const platforms = [
  {
    name: "Amazon Web Services", short: "AWS", color: "#FF9900",
    services: ["EC2, ECS, Lambda", "RDS, DynamoDB, S3", "CloudFront, Route 53", "IAM, CloudTrail"],
  },
  {
    name: "Microsoft Azure", short: "Azure", color: "#0078D4",
    services: ["App Service, AKS", "Azure SQL, Cosmos DB", "Azure DevOps, Pipelines", "Entra ID, Defender"],
  },
  {
    name: "Google Cloud Platform", short: "GCP", color: "#4285F4",
    services: ["GKE, Cloud Run", "BigQuery, Cloud SQL", "Cloud Build, Artifact Registry", "IAM, Security Command Center"],
  },
];

export default function CloudPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                Cloud Management
              </Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Optimize your cloud —{" "}
                <span className="text-gradient">reduce costs, increase reliability</span>
              </h1>
              <p className="text-lg max-w-2xl mb-8" style={{ color: "var(--text-secondary)" }}>
                AWS, Azure, and GCP management including cloud migration strategy, cost optimization,
                DevOps pipelines, and ongoing managed cloud operations — so your team ships faster and sleeps better.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                  <Link href="/get-quote">Get cloud consultation <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <Link href="/contact">Talk to us first</Link>
                </Button>
              </div>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <CloudIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>What we manage</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              From initial migration to day-to-day operations — we handle your cloud so you can focus on your product.
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

      {/* Platforms */}
      <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Platforms we work with</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Deep expertise across the three major cloud providers — so you stay on the platform that fits you best.
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platforms.map(({ name, short, color, services }) => (
              <FadeUp key={short}>
                <div className="card-base p-6">
                  <div
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-bold text-white mb-4"
                    style={{ background: color }}
                  >
                    {short}
                  </div>
                  <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{name}</h3>
                  <ul className="space-y-1.5">
                    {services.map((s) => (
                      <li key={s} className="text-sm" style={{ color: "var(--text-secondary)" }}>{s}</li>
                    ))}
                  </ul>
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
            Ready to take control of your cloud?
          </h2>
          <p className="mb-8 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>
            Start with a free cloud audit. We&apos;ll review your current setup, identify cost savings, and recommend improvements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="font-semibold px-8" style={{ background: "white", color: "var(--brand-primary)" }}>
              <Link href="/get-quote">Request a cloud audit</Link>
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
