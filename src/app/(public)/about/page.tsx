import type { Metadata } from "next";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Users, Target, Zap, HeartHandshake } from "lucide-react";
import { AboutIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "About GCS",
  description:
    "Learn about General Computing Solutions — our mission, team, and approach to managed IT services and custom software development.",
};

const values = [
  { icon: Target, title: "Proactive, not reactive", desc: "We monitor and prevent issues before they disrupt your operations." },
  { icon: Zap, title: "Fast, reliable execution", desc: "Committed timelines, clear communication, no surprises." },
  { icon: HeartHandshake, title: "True partnership", desc: "We measure our success by the success of your business." },
  { icon: Users, title: "One team, full coverage", desc: "IT ops and software dev under one roof — no vendor juggling." },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                About GCS
              </Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Technology managed end to end —{" "}
                <span className="text-gradient">so your team can focus on growth</span>
              </h1>
              <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
                General Computing Solutions was founded to bridge the gap between reliable IT operations
                and innovative software development. We serve as a single trusted partner for businesses
                that want both.
              </p>
            </FadeUp>
            {/* Right: illustration */}
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <AboutIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Our values</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Everything we do at GCS is guided by these core principles.
            </p>
          </FadeUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title}>
                <div className="card-base p-6 flex gap-4">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-tertiary)" }}>
                    <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </>
  );
}
