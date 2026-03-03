import type { Metadata } from "next";
import { FadeUp } from "@/components/shared/motion";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "GCS Terms of Service — your agreement with General Computing Solutions for use of our website, client portal, and services.",
};

export default function TermsPage() {
  return (
    <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
      <div className="container-gcs">
        <FadeUp>
          <h1 className="font-black mb-2" style={{ fontFamily: "var(--font-display)" }}>Terms of Service</h1>
          <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>Last updated: March 2025 &nbsp;·&nbsp; Effective date: March 1, 2025</p>

          <div className="space-y-10" style={{ color: "var(--text-secondary)" }}>

            <div>
              <p className="leading-relaxed">
                These Terms of Service (&quot;Terms&quot;) govern your access to and use of the website located at{" "}
                <span style={{ color: "var(--text-primary)" }}>itatgcs.com</span>, the GCS Client Portal, and all related services
                provided by General Computing Solutions (&quot;GCS&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing
                our website or using our services, you agree to be bound by these Terms. If you do not agree, please do not use our services.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>1. Services</h2>
              <p className="leading-relaxed mb-3">
                GCS provides managed IT services, custom software development, enterprise solutions, cloud management,
                cybersecurity services, and AI integration. Specific deliverables, timelines, pricing, and SLAs for
                each engagement are outlined in a separate Service Agreement or Statement of Work (&quot;SOW&quot;) signed
                by both parties.
              </p>
              <p className="leading-relaxed">
                These Terms apply to use of the website and the GCS Client Portal. In the event of a conflict between
                these Terms and a signed Service Agreement, the Service Agreement takes precedence.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>2. Client Portal Access</h2>
              <p className="leading-relaxed mb-3">
                Access to the GCS Client Portal is granted only to authorized users associated with an active client account.
                You are responsible for maintaining the confidentiality of your login credentials and for all activities
                that occur under your account.
              </p>
              <p className="leading-relaxed">
                You must notify GCS immediately at{" "}
                <a href="mailto:info@itatgcs.com" style={{ color: "var(--brand-primary)" }}>info@itatgcs.com</a>{" "}
                if you suspect unauthorized access to your account. GCS reserves the right to suspend or terminate access
                for accounts that violate these Terms.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>3. Acceptable Use</h2>
              <p className="leading-relaxed mb-3">You agree not to use our website, portal, or services to:</p>
              <ul className="list-disc list-inside space-y-2 leading-relaxed ml-2">
                <li>Violate any applicable local, national, or international law or regulation</li>
                <li>Transmit any unsolicited, unauthorized advertising or promotional material</li>
                <li>Attempt to gain unauthorized access to any system, server, or network</li>
                <li>Introduce viruses, Trojans, worms, or other malicious code</li>
                <li>Scrape, harvest, or collect information about other users without their consent</li>
                <li>Impersonate any person or entity, or misrepresent your affiliation</li>
                <li>Interfere with the proper functioning of our services or infrastructure</li>
              </ul>
              <p className="leading-relaxed mt-3">
                GCS reserves the right to investigate violations and may involve law enforcement authorities where appropriate.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>4. Intellectual Property</h2>
              <p className="leading-relaxed mb-3">
                All content on the GCS website — including text, graphics, logos, icons, images, and software — is the
                property of General Computing Solutions or its content suppliers and is protected by applicable intellectual
                property laws. You may not reproduce, distribute, or create derivative works without our express written consent.
              </p>
              <p className="leading-relaxed">
                Custom software developed for a client under a signed Service Agreement becomes the client&apos;s property upon
                receipt of full payment, unless otherwise specified in that agreement. GCS retains the right to use
                general methodologies, frameworks, and non-client-specific code developed during the engagement.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>5. Payment Terms</h2>
              <p className="leading-relaxed mb-3">
                Invoices are due within the period stated in the applicable Service Agreement (typically net 15 or net 30).
                Late payments may incur interest at 1.5% per month or the maximum rate permitted by law, whichever is less.
              </p>
              <p className="leading-relaxed">
                GCS reserves the right to suspend services on accounts that are more than 30 days past due, with written
                notice provided at least 5 business days in advance.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>6. Confidentiality</h2>
              <p className="leading-relaxed">
                Both parties agree to keep confidential any non-public information disclosed in connection with the services,
                including technical specifications, business processes, pricing, and client data. This obligation survives
                termination of the service relationship for a period of 3 years, unless the information becomes publicly known
                through no fault of the receiving party.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>7. Limitation of Liability</h2>
              <p className="leading-relaxed mb-3">
                To the maximum extent permitted by applicable law, GCS&apos;s total liability arising from or related to these
                Terms or the services shall not exceed the total fees paid by the client to GCS in the three (3) months
                immediately preceding the event giving rise to the claim.
              </p>
              <p className="leading-relaxed">
                GCS shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including
                but not limited to loss of profits, data, revenue, or business opportunities — even if GCS has been advised
                of the possibility of such damages.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>8. Disclaimer of Warranties</h2>
              <p className="leading-relaxed">
                Our website and portal are provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind,
                either express or implied, including but not limited to fitness for a particular purpose, non-infringement,
                or uninterrupted availability. We do not warrant that the website will be error-free or free of viruses or
                other harmful components.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>9. Termination</h2>
              <p className="leading-relaxed">
                Either party may terminate a service engagement as specified in the applicable Service Agreement. GCS may
                immediately suspend or terminate portal access if you breach these Terms. Upon termination, your right to
                access the portal ceases and GCS will retain your data for 30 days, after which it may be deleted.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>10. Governing Law</h2>
              <p className="leading-relaxed">
                These Terms are governed by and construed in accordance with applicable laws. Any disputes arising from these
                Terms or your use of our services shall be resolved through good-faith negotiation before escalating to
                formal dispute resolution proceedings.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>11. Changes to These Terms</h2>
              <p className="leading-relaxed">
                GCS reserves the right to update these Terms at any time. We will notify active clients of material changes
                via email or a prominent notice in the client portal. Continued use of our services after the effective date
                of changes constitutes acceptance of the revised Terms.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>12. Contact</h2>
              <p className="leading-relaxed">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="mt-3 space-y-1">
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
