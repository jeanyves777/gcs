import type { Metadata } from "next";
import Link from "next/link";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ScanSearch, Laptop, KeyRound, GraduationCap, AlertTriangle, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { CybersecurityIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Cybersecurity",
  description: "Protect your business with vulnerability assessments, endpoint protection, MFA enforcement, and incident response from GCS.",
};

const features = [
  { icon: ScanSearch, title: "Vulnerability Assessments", desc: "Regular scans and penetration tests to find weaknesses in your network, applications, and infrastructure before attackers do." },
  { icon: Laptop, title: "Endpoint Protection", desc: "Deploy and manage EDR solutions across all devices — laptops, servers, and mobile — with centralized visibility and threat response." },
  { icon: KeyRound, title: "Identity & MFA Enforcement", desc: "Implement Zero Trust principles: MFA, conditional access policies, and least-privilege access across all your systems and cloud platforms." },
  { icon: GraduationCap, title: "Security Awareness Training", desc: "Phishing simulations and training programs that turn your team into a human firewall — the most effective layer of defense." },
  { icon: AlertTriangle, title: "Incident Response", desc: "Fast response when a breach occurs. Contain, investigate, remediate, and recover — with a documented post-incident report." },
  { icon: ClipboardCheck, title: "Compliance & Reporting", desc: "Map your controls to NIST, ISO 27001, SOC 2, HIPAA, or GDPR. Monthly security reports keeping you audit-ready at all times." },
];

const threatAreas = [
  "Ransomware & Malware", "Phishing & Social Engineering", "Insider Threats",
  "Cloud Misconfigurations", "Unpatched Vulnerabilities", "Credential Theft",
  "Supply Chain Attacks", "DDoS & Availability Threats",
];

export default function CybersecurityPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                Cybersecurity
              </Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Protect what matters —{" "}
                <span className="text-gradient">before it&apos;s at risk</span>
              </h1>
              <p className="text-lg max-w-2xl mb-8" style={{ color: "var(--text-secondary)" }}>
                Vulnerability assessments, endpoint protection, MFA enforcement, security awareness
                training, and incident response — a layered security program that keeps your business safe.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                  <Link href="/get-quote">Get a security assessment <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <Link href="/contact">Talk to us first</Link>
                </Button>
              </div>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <CybersecurityIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Our security services</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              A layered approach — covering people, processes, and technology across your entire environment.
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

      {/* Threat coverage */}
      <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeUp>
              <h2 className="font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Threats we protect against
              </h2>
              <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
                The threat landscape evolves constantly. Our security program is built to address the most
                common and costly attack vectors facing small and mid-sized businesses today.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {threatAreas.map((threat) => (
                  <li key={threat} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "var(--success)" }} />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{threat}</span>
                  </li>
                ))}
              </ul>
            </FadeUp>
            <FadeUp delay={0.15}>
              <div className="rounded-2xl p-8" style={{ background: "linear-gradient(135deg, var(--brand-secondary) 0%, var(--brand-primary) 100%)" }}>
                <p className="text-2xl font-black text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  60%
                </p>
                <p className="text-sm font-semibold text-white mb-4">
                  of small businesses close within 6 months of a cyberattack.
                </p>
                <p className="text-sm text-white mb-6" style={{ opacity: 0.85 }}>
                  A proactive security program costs a fraction of incident recovery. GCS helps you build
                  the right defenses before a breach — not after.
                </p>
                <Button asChild size="sm" className="font-semibold" style={{ background: "white", color: "var(--brand-primary)" }}>
                  <Link href="/get-quote">Start with a free risk assessment</Link>
                </Button>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding text-white" style={{ background: "var(--brand-primary)" }}>
        <div className="container-gcs text-center">
          <h2 className="font-bold mb-4 text-white" style={{ fontFamily: "var(--font-display)" }}>
            Don&apos;t wait for an incident to act
          </h2>
          <p className="mb-8 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>
            Get a free security assessment and let us identify gaps in your current setup — with no obligation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="font-semibold px-8" style={{ background: "white", color: "var(--brand-primary)" }}>
              <Link href="/get-quote">Request a free assessment</Link>
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
