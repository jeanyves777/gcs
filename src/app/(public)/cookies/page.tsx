import type { Metadata } from "next";
export const metadata: Metadata = { title: "Cookie Policy", description: "How GCS uses cookies and tracking technologies." };
import { FadeUp } from "@/components/shared/motion";
export default function CookiesPage() {
  return (
    <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs max-w-3xl mx-auto">
        <FadeUp>
          <h1 className="font-black mb-4" style={{ fontFamily: "var(--font-display)" }}>Cookie Policy</h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Last updated: March 2024</p>
          <div className="space-y-6" style={{ color: "var(--text-secondary)" }}>
            <p>This page explains what cookies are, how GCS uses them, and your choices.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>What Are Cookies?</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your experience.</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Cookies We Use</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Essential cookies:</strong> Required for authentication and security (session tokens).</li>
              <li><strong>Preference cookies:</strong> Remember your theme (dark/light) and other settings.</li>
              <li><strong>Analytics cookies:</strong> Anonymous usage data to improve our site (opt-out available).</li>
            </ul>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Your Choices</h2>
            <p>You can disable non-essential cookies in your browser settings at any time. Note that some features may not work correctly without essential cookies.</p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
