import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacy Policy", description: "GCS Privacy Policy — how we collect, use, and protect your information." };
import { FadeUp } from "@/components/shared/motion";
export default function PrivacyPage() {
  return (
    <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs max-w-3xl mx-auto">
        <FadeUp>
          <h1 className="font-black mb-4" style={{ fontFamily: "var(--font-display)" }}>Privacy Policy</h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Last updated: March 2024</p>
          <div className="prose-sm space-y-6" style={{ color: "var(--text-secondary)" }}>
            <p>General Computing Solutions (&quot;GCS&quot;, &quot;we&quot;, &quot;our&quot;) is committed to protecting your personal information. This policy explains how we collect, use, and safeguard data when you use our services or visit our website.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Information We Collect</h2>
            <p>We collect information you provide directly (name, email, company) when you contact us, request a quote, or use the client portal. We also collect usage data automatically through cookies and analytics.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>How We Use Your Information</h2>
            <p>We use your information to provide services, respond to inquiries, send project updates, and improve our products. We never sell your data to third parties.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Data Security</h2>
            <p>We use industry-standard encryption and security practices to protect your data. Access is limited to authorized personnel only.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Contact Us</h2>
            <p>Questions? Email us at <a href="mailto:info@itatgcs.com" style={{ color: "var(--brand-primary)" }}>info@itatgcs.com</a></p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
