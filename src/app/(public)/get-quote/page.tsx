import type { Metadata } from "next";
import { FadeUp, FadeIn } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { QuoteForm } from "./quote-form";
import { QuoteIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Get a Quote",
  description: "Tell us about your project or IT needs and we'll get back to you with a tailored proposal.",
};

export default function GetQuotePage() {
  return (
    <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs">
        {/* Hero row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-10">
          <FadeUp>
            <Badge className="mb-4" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>Get a Quote</Badge>
            <h1 className="font-black mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Tell us what you need — <span className="text-gradient">we&apos;ll handle the rest</span>
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Fill out the form below and we&apos;ll reach out within one business day with a tailored proposal.
            </p>
          </FadeUp>
          <div className="hidden sm:block">
            <FadeIn delay={0.2}>
              <QuoteIllustration />
            </FadeIn>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <FadeUp delay={0.1}>
            <Card className="card-base">
              <CardContent className="p-6 md:p-8">
                <QuoteForm />
              </CardContent>
            </Card>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
