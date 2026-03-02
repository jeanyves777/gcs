import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Code2, Server, Cloud, HeadphonesIcon, CheckCircle2, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/shared/motion";
import { HeroIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "GCS — Managed IT Services & Custom Software",
  description:
    "We help businesses run smarter by managing their technology end to end — from day-to-day IT operations to custom software that drives growth.",
};

const services = [
  { icon: HeadphonesIcon, title: "Managed IT Services", desc: "Your outsourced IT department — monitoring, security, and responsive helpdesk." },
  { icon: Code2, title: "Custom Software", desc: "Tailor-made web apps, mobile apps, and enterprise systems for your workflows." },
  { icon: Server, title: "Enterprise Solutions", desc: "Scalable infrastructure designed around your business needs and data flows." },
  { icon: Cloud, title: "Cloud Management", desc: "Cloud migration, cost optimization, and ongoing multi-cloud management." },
  { icon: Shield, title: "Cybersecurity", desc: "Protect your business with vulnerability assessments, monitoring, and response." },
  { icon: BrainCircuit, title: "AI Integration", desc: "Embed AI automation into your workflows — from intelligent document processing to custom LLM-powered tools." },
];

const reasons = [
  "One team for IT operations and software development",
  "Proactive monitoring — we fix issues before they impact you",
  "Transparent project management with a dedicated client portal",
  "SLA-backed support with guaranteed response times",
  "Scalable engagement models — from hourly to fully managed",
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: text */}
            <div>
              <Badge
                className="mb-6 text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}
              >
                Managed IT Services & Software Provider
              </Badge>

              <h1 className="font-black tracking-tight mb-6" style={{ fontFamily: "var(--font-display)" }}>
                We manage your tech so{" "}
                <span className="text-gradient">you can focus on your business</span>
              </h1>

              <p className="text-lg max-w-2xl mb-10" style={{ color: "var(--text-secondary)" }}>
                GCS delivers end-to-end technology management — from day-to-day IT operations to custom
                software that drives growth. One team, complete coverage.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Button
                  asChild
                  size="lg"
                  className="text-white font-semibold px-8"
                  style={{ background: "var(--brand-primary)" }}
                >
                  <Link href="/get-quote">
                    Get a free consultation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="font-semibold px-8"
                  style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <Link href="/services">Explore our services</Link>
                </Button>
              </div>
            </div>
            {/* Right: illustration */}
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <HeroIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <div className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Everything your business needs
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              From keeping your infrastructure running to building your next product — we do both.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(({ icon: Icon, title, desc }) => (
              <Card
                key={title}
                className="card-base hover:shadow-md transition-all cursor-pointer group"
              >
                <CardContent className="p-6">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: "var(--bg-tertiary)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why GCS */}
      <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Why teams choose GCS
              </h2>
              <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
                We combine the reliability of a managed services partner with the creativity of a
                software studio — giving you one team that handles both keeping the lights on and
                building what&apos;s next.
              </p>
              <ul className="space-y-3">
                {reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-3">
                    <CheckCircle2
                      className="h-5 w-5 mt-0.5 flex-shrink-0"
                      style={{ color: "var(--success)" }}
                    />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {reason}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 text-white"
                style={{ background: "var(--brand-primary)" }}
              >
                <Link href="/about">
                  Learn about GCS
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div
              className="rounded-2xl p-8"
              style={{ background: "linear-gradient(135deg, var(--brand-secondary) 0%, var(--brand-primary) 100%)" }}
            >
              <p className="text-lg font-semibold leading-relaxed mb-6 text-white">
                &ldquo;We serve as your outsourced IT department — monitoring your systems, securing your
                network, managing your cloud environment, and keeping your team productive with
                responsive helpdesk support.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  G
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">General Computing Solutions</p>
                  <p className="text-xs text-white" style={{ opacity: 0.7 }}>Our promise to every client</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="section-padding text-white"
        style={{ background: "var(--brand-primary)" }}
      >
        <div className="container-gcs text-center">
          <h2 className="font-bold mb-4 text-white" style={{ fontFamily: "var(--font-display)" }}>
            Ready to simplify your IT?
          </h2>
          <p className="mb-8 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>
            Schedule a free consultation and let&apos;s talk about how GCS can take technology off your
            plate — and drive your business forward.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="font-semibold px-8"
              style={{ background: "white", color: "var(--brand-primary)" }}
            >
              <Link href="/get-quote">Book a free consultation</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="font-semibold px-8"
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
