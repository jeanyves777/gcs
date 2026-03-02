import type { Metadata } from "next";
import Link from "next/link";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BrainCircuit, Bot, FileSearch, Workflow, MessageSquare, BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Integration Services",
  description: "GCS embeds AI automation into your business workflows — from intelligent document processing to custom LLM-powered tools and AI-driven analytics.",
};

const features = [
  { icon: Bot, title: "Custom AI Assistants", desc: "LLM-powered chatbots and virtual agents trained on your business data and processes." },
  { icon: FileSearch, title: "Intelligent Document Processing", desc: "Automate extraction, classification, and routing of contracts, invoices, and forms." },
  { icon: Workflow, title: "AI Workflow Automation", desc: "Replace manual, repetitive tasks with intelligent automation pipelines." },
  { icon: MessageSquare, title: "Natural Language Interfaces", desc: "Let your team query systems, generate reports, and take actions using plain English." },
  { icon: BarChart3, title: "Predictive Analytics", desc: "Surface insights and forecasts from your existing data without a data science team." },
  { icon: BrainCircuit, title: "LLM Integration & Fine-tuning", desc: "Connect your products to frontier models (Claude, GPT-4, Gemini) or fine-tune your own." },
];

const useCases = [
  { industry: "Healthcare", example: "Automated patient intake forms, appointment scheduling, and clinical document summarization." },
  { industry: "Finance", example: "Invoice processing, fraud pattern detection, and automated financial report generation." },
  { industry: "Legal", example: "Contract review, clause extraction, and compliance document analysis at scale." },
  { industry: "Operations", example: "Supply chain anomaly detection, warehouse query bots, and automated reporting." },
];

export default function AIIntegrationPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                AI Integration
              </Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                AI built into your workflows, <span className="text-gradient">not bolted on top</span>
              </h1>
              <p className="text-lg max-w-2xl mb-8" style={{ color: "var(--text-secondary)" }}>
                GCS integrates frontier AI models directly into your business processes. We build custom AI tools, automate document-heavy workflows, and surface actionable insights — without requiring an in-house AI team.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                  <Link href="/get-quote">Start an AI project <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <Link href="/contact">Book a demo</Link>
                </Button>
              </div>
            </FadeUp>

            {/* AI visual mockup */}
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <div className="relative w-full max-w-[460px] mx-auto mt-6 mb-10">
                  <div className="absolute -inset-6 rounded-3xl opacity-[0.12] blur-3xl pointer-events-none" style={{ background: "radial-gradient(ellipse at center, var(--brand-primary) 0%, transparent 70%)" }} />
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-1.5 px-4 py-3 border-b flex-shrink-0" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28CA41" }} />
                      <span className="ml-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>GCS AI Assistant</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {[
                        { role: "user",  msg: "Summarize Q3 contracts with renewal risk" },
                        { role: "ai",    msg: "Found 12 contracts expiring in 90 days. 3 flagged as high-risk based on clause analysis. Shall I generate a full report?" },
                        { role: "user",  msg: "Yes, and email it to the legal team" },
                        { role: "ai",    msg: "Report generated and sent to legal@company.com. 📎 Q3-Contract-Risk-Report.pdf" },
                      ].map(({ role, msg }, i) => (
                        <div key={i} className={`flex items-start gap-2.5 ${role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: role === "ai" ? "var(--brand-primary)" : "var(--bg-tertiary)", color: role === "ai" ? "white" : "var(--text-muted)" }}>
                            {role === "ai" ? "AI" : "U"}
                          </div>
                          <div className={`rounded-2xl ${role === "user" ? "rounded-tr-none" : "rounded-tl-none"} p-3 max-w-[78%] text-xs`} style={{ background: role === "user" ? "var(--brand-primary)" : "var(--bg-secondary)", color: role === "user" ? "white" : "var(--text-primary)" }}>
                            {msg}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t p-3 flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                      <div className="flex-1 rounded-xl px-3 py-2 text-xs" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>Ask anything about your data…</div>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--brand-primary)" }}>
                        <span className="text-white text-xs">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>What we build</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              From off-the-shelf LLM integrations to fully custom AI pipelines — we handle the full stack.
            </p>
          </FadeUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title}>
                <div className="card-base p-6 h-full">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--bg-tertiary)" }}>
                    <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Use cases */}
      <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Industry use cases</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              AI automation that solves real business problems across industries.
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {useCases.map(({ industry, example }) => (
              <FadeUp key={industry}>
                <div className="card-base p-6">
                  <div className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3" style={{ background: "rgba(21,101,192,0.1)", color: "var(--brand-primary)" }}>
                    {industry}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{example}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding text-white" style={{ background: "var(--brand-primary)" }}>
        <div className="container-gcs text-center">
          <FadeUp>
            <h2 className="font-bold mb-4 text-white" style={{ fontFamily: "var(--font-display)" }}>Ready to add AI to your business?</h2>
            <p className="mb-8 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>
              Book a free discovery call. We&apos;ll identify the highest-ROI AI opportunities in your workflows and scope a pilot project.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="font-semibold px-8" style={{ background: "white", color: "var(--brand-primary)" }}>
                <Link href="/get-quote">Book a discovery call</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-semibold px-8" style={{ background: "transparent", color: "white", borderColor: "rgba(255,255,255,0.4)" }}>
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
