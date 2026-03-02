import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Service", description: "GCS Terms of Service — your agreement with General Computing Solutions." };
import { FadeUp } from "@/components/shared/motion";
export default function TermsPage() {
  return (
    <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs max-w-3xl mx-auto">
        <FadeUp>
          <h1 className="font-black mb-4" style={{ fontFamily: "var(--font-display)" }}>Terms of Service</h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Last updated: March 2024</p>
          <div className="space-y-6" style={{ color: "var(--text-secondary)" }}>
            <p>By using GCS services or accessing the client portal, you agree to these terms. Please read them carefully.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Services</h2>
            <p>GCS provides managed IT services and custom software development under separate service agreements. These terms apply to use of the website and client portal.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Acceptable Use</h2>
            <p>You may not use our services for unlawful purposes, to transmit harmful content, or to attempt unauthorized access to our systems.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Intellectual Property</h2>
            <p>All content on this website is owned by GCS unless otherwise noted. Custom software developed for clients belongs to the client upon final payment unless otherwise agreed.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Limitation of Liability</h2>
            <p>GCS&apos;s liability is limited to fees paid in the prior 3 months for services in dispute. We are not liable for indirect or consequential damages.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Contact</h2>
            <p>Questions? Email <a href="mailto:info@itatgcs.com" style={{ color: "var(--brand-primary)" }}>info@itatgcs.com</a></p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
