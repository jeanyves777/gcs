import type { Metadata } from "next";
import { FadeUp, FadeIn } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { ContactForm } from "./contact-form";
import { ContactIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the GCS team. We respond within one business day.",
};

const contactInfo = [
  { icon: Mail, label: "Email us", value: "info@itatgcs.com", href: "mailto:info@itatgcs.com" },
  { icon: Phone, label: "Call us", value: "+1 (555) 123-4567", href: "tel:+15551234567" },
  { icon: MapPin, label: "Location", value: "Remote-First · Available Worldwide", href: null },
  { icon: Clock, label: "Response time", value: "Within 1 business day", href: null },
];

export default function ContactPage() {
  return (
    <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs">
        {/* Hero row: illustration left on lg, text/intro centred on smaller */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
          <FadeUp>
            <Badge className="mb-4" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
              Contact Us
            </Badge>
            <h1 className="font-black mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Let&apos;s talk about your <span className="text-gradient">technology needs</span>
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Whether you need IT support, a software quote, or just want to explore options — we&apos;re here to help.
            </p>
          </FadeUp>
          <div className="hidden sm:block">
            <FadeIn delay={0.2}>
              <ContactIllustration />
            </FadeIn>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact info */}
          <div className="space-y-4">
            {contactInfo.map(({ icon: Icon, label, value, href }) => (
              <FadeUp key={label}>
                <Card className="card-base">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-tertiary)" }}>
                      <Icon className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
                      {href ? (
                        <a href={href} className="text-sm mt-0.5 hover:underline" style={{ color: "var(--text-primary)" }}>{value}</a>
                      ) : (
                        <p className="text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>{value}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </FadeUp>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <FadeUp delay={0.1}>
              <Card className="card-base">
                <CardContent className="p-6">
                  <ContactForm />
                </CardContent>
              </Card>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  );
}
