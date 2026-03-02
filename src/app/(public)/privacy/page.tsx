import type { Metadata } from "next";
import { FadeUp } from "@/components/shared/motion";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "GCS Privacy Policy — how General Computing Solutions collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs max-w-3xl mx-auto">
        <FadeUp>
          <h1 className="font-black mb-2" style={{ fontFamily: "var(--font-display)" }}>Privacy Policy</h1>
          <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>Last updated: March 2025 &nbsp;·&nbsp; Effective date: March 1, 2025</p>

          <div className="space-y-10" style={{ color: "var(--text-secondary)" }}>

            <div>
              <p className="leading-relaxed">
                General Computing Solutions (&quot;GCS&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting
                the privacy of our clients, prospective clients, and website visitors. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you visit{" "}
                <span style={{ color: "var(--text-primary)" }}>itatgcs.com</span> or use the GCS Client Portal.
                Please read this policy carefully. By using our website or services, you consent to the practices described here.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>1. Information We Collect</h2>
              <p className="leading-relaxed mb-3 font-medium" style={{ color: "var(--text-primary)" }}>Information you provide directly:</p>
              <ul className="list-disc list-inside space-y-2 leading-relaxed ml-2 mb-4">
                <li>Name, email address, phone number, and company name when you contact us or submit a quote request</li>
                <li>Account credentials when you register for the client portal</li>
                <li>Project details, support ticket content, messages, and files you submit through the portal</li>
                <li>Billing information (name, address) provided in connection with invoices — payment details are processed by third-party payment providers and not stored by GCS</li>
              </ul>
              <p className="leading-relaxed mb-3 font-medium" style={{ color: "var(--text-primary)" }}>Information collected automatically:</p>
              <ul className="list-disc list-inside space-y-2 leading-relaxed ml-2">
                <li>IP address, browser type, device type, and operating system</li>
                <li>Pages visited, time spent on pages, and navigation paths</li>
                <li>Referring URLs and search terms used to find our website</li>
                <li>Cookies and similar tracking technologies (see Section 6)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>2. How We Use Your Information</h2>
              <p className="leading-relaxed mb-3">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 leading-relaxed ml-2">
                <li>Provide, operate, and improve our managed IT services, software development, and related offerings</li>
                <li>Create and manage your client portal account and deliver project updates</li>
                <li>Respond to inquiries, support requests, and quote requests</li>
                <li>Send service-related communications (invoices, project milestones, scheduled maintenance notices)</li>
                <li>Analyze usage patterns to improve the website and portal experience</li>
                <li>Detect, prevent, and address technical issues or security threats</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
              </ul>
              <p className="leading-relaxed mt-3">
                <strong style={{ color: "var(--text-primary)" }}>We do not sell, rent, or trade your personal information to third parties.</strong>
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>3. How We Share Your Information</h2>
              <p className="leading-relaxed mb-3">We may share your information only in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 leading-relaxed ml-2">
                <li><strong style={{ color: "var(--text-primary)" }}>Service providers:</strong> Trusted third parties who assist in operating our website, portal, or services (e.g., hosting providers, email delivery, analytics). They are contractually bound to keep your data confidential.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Legal requirements:</strong> When required by law, court order, or governmental authority.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction, subject to the same privacy protections.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>With your consent:</strong> Any other sharing we communicate to you and you approve.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>4. Data Retention</h2>
              <p className="leading-relaxed">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy,
                maintain our business relationship with you, comply with legal obligations, resolve disputes, and enforce our
                agreements. Client portal data is retained for the duration of the active service relationship and for a
                period of 24 months after termination, unless a shorter period is required by law or agreed upon in writing.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>5. Data Security</h2>
              <p className="leading-relaxed mb-3">
                We implement technical and organizational measures to protect your personal information against unauthorized
                access, alteration, disclosure, or destruction. These include:
              </p>
              <ul className="list-disc list-inside space-y-2 leading-relaxed ml-2">
                <li>TLS/SSL encryption for all data in transit</li>
                <li>Encryption at rest for sensitive data in our databases</li>
                <li>Role-based access controls limiting data access to authorized personnel only</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Multi-factor authentication for internal systems</li>
              </ul>
              <p className="leading-relaxed mt-3">
                No method of transmission over the internet is 100% secure. While we strive to use commercially acceptable
                means to protect your information, we cannot guarantee its absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>6. Cookies & Tracking</h2>
              <p className="leading-relaxed mb-3">
                We use cookies and similar technologies to enhance your experience on our website and portal. Cookies are
                small text files stored on your device. We use:
              </p>
              <ul className="list-disc list-inside space-y-2 leading-relaxed ml-2">
                <li><strong style={{ color: "var(--text-primary)" }}>Essential cookies:</strong> Required for the website and portal to function correctly (e.g., authentication session tokens).</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Preference cookies:</strong> Remember your settings such as theme preference (light/dark mode).</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Analytics cookies:</strong> Help us understand how visitors use our site so we can improve it. We use privacy-respecting analytics that do not track individuals across sites.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                You can control cookies through your browser settings. Disabling certain cookies may affect functionality.
                See our <a href="/cookies" style={{ color: "var(--brand-primary)" }}>Cookie Policy</a> for more details.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>7. Your Rights</h2>
              <p className="leading-relaxed mb-3">Depending on your location, you may have the following rights regarding your personal data:</p>
              <ul className="list-disc list-inside space-y-2 leading-relaxed ml-2">
                <li><strong style={{ color: "var(--text-primary)" }}>Access:</strong> Request a copy of the personal information we hold about you.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Correction:</strong> Request correction of inaccurate or incomplete information.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Portability:</strong> Request your data in a structured, machine-readable format.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Objection:</strong> Object to processing of your data for certain purposes, including direct marketing.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                To exercise these rights, contact us at{" "}
                <a href="mailto:info@itatgcs.com" style={{ color: "var(--brand-primary)" }}>info@itatgcs.com</a>.
                We will respond within 30 days.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>8. Third-Party Links</h2>
              <p className="leading-relaxed">
                Our website may contain links to third-party websites. These sites operate independently and are not
                covered by this Privacy Policy. We encourage you to review the privacy policies of any third-party sites
                you visit. GCS is not responsible for the content or privacy practices of external websites.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>9. Children&apos;s Privacy</h2>
              <p className="leading-relaxed">
                Our website and services are not directed at children under the age of 16. We do not knowingly collect
                personal information from children. If you believe we have inadvertently collected such information,
                please contact us immediately so we can delete it.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>10. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. When we make material changes, we will update the
                &quot;Last updated&quot; date at the top of this page and, where appropriate, notify you by email or through a
                notice on the client portal. We encourage you to review this policy periodically.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>11. Contact Us</h2>
              <p className="leading-relaxed mb-3">
                If you have questions, concerns, or requests regarding this Privacy Policy, please contact our privacy team:
              </p>
              <div className="space-y-1">
                <p>General Computing Solutions</p>
                <p>Email: <a href="mailto:info@itatgcs.com" style={{ color: "var(--brand-primary)" }}>info@itatgcs.com</a></p>
                <p>Website: <span style={{ color: "var(--brand-primary)" }}>www.itatgcs.com</span></p>
              </div>
            </div>

          </div>
        </FadeUp>
      </div>
    </section>
  );
}
