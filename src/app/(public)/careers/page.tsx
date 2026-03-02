import type { Metadata } from "next";
import Link from "next/link";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, BookOpen, TrendingUp, Clock, Heart, Users, ArrowRight } from "lucide-react";
import { CareersIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Careers at GCS",
  description: "Join the GCS team. We're a remote-first company building innovative managed IT and software solutions.",
};

const perks = [
  { icon: Globe, title: "Remote-First", desc: "Work from anywhere. We&apos;re a fully distributed team and have been since day one." },
  { icon: BookOpen, title: "Learning Budget", desc: "Annual budget for courses, certifications, conferences, and books. We invest in your growth." },
  { icon: TrendingUp, title: "Grow with Us", desc: "As GCS scales, so do the opportunities. Early team members take on leadership roles." },
  { icon: Clock, title: "Flexible Hours", desc: "Async-first culture. Own your schedule as long as work gets done and clients are covered." },
  { icon: Heart, title: "Health Benefits", desc: "Competitive health coverage for full-time team members and their families." },
  { icon: Users, title: "Great Team", desc: "Work alongside experienced engineers, DevOps specialists, and IT professionals who care about craft." },
];

const values = [
  { title: "Ownership", desc: "We take responsibility end to end — no finger-pointing, no hand-offs to nowhere. If you own it, you see it through." },
  { title: "Clarity", desc: "Simple, direct communication. With clients, with each other, and in the code we write." },
  { title: "Client first", desc: "Every technical decision is grounded in what actually helps the client's business — not what's technically impressive." },
  { title: "Constant improvement", desc: "We review our processes, our tools, and our skills regularly. Good enough today isn&apos;t good enough tomorrow." },
];

export default function CareersPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                Careers
              </Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Build the future of{" "}
                <span className="text-gradient">managed technology</span>
              </h1>
              <p className="text-lg max-w-2xl mb-8" style={{ color: "var(--text-secondary)" }}>
                GCS is a remote-first team of engineers, DevOps specialists, and IT professionals
                solving real problems for real businesses. We&apos;re growing and always looking for great people.
              </p>
              <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                <Link href="#open-roles">See open roles <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <CareersIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Why work at GCS</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              We&apos;re building a company where talented people can do their best work — from anywhere.
            </p>
          </FadeUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {perks.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title}>
                <div className="card-base p-6">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--bg-tertiary)" }}>
                    <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: desc }} />
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Our values</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              The principles that guide how we work — with clients and with each other.
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map(({ title, desc }) => (
              <FadeUp key={title}>
                <div className="card-base p-6">
                  <h3 className="font-semibold mb-2 text-lg" style={{ color: "var(--text-primary)" }}>{title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: desc }} />
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section id="open-roles" className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Open roles</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              We&apos;re a growing team. Check back here for new openings.
            </p>
          </FadeUp>
          <FadeUp>
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: "var(--bg-primary)", border: "2px dashed var(--border)" }}
            >
              <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                No open roles right now
              </p>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                We&apos;re not actively hiring at the moment, but we&apos;re always interested in meeting talented engineers,
                IT specialists, and DevOps professionals. Send us a note.
              </p>
              <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                <Link href="/contact">Get in touch <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
