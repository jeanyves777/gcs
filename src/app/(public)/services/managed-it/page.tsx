import type { Metadata } from "next";
import Link from "next/link";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Monitor, Shield, HardDrive, HeadphonesIcon, Bell, Users } from "lucide-react";
import { ManagedITIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Managed IT Services",
  description: "GCS serves as your outsourced IT department — monitoring, security, cloud management, and responsive helpdesk.",
};

const features = [
  { icon: Monitor, title: "24/7 System Monitoring", desc: "Proactive monitoring catches issues before they impact your team." },
  { icon: Shield, title: "Network Security", desc: "Firewall management, intrusion detection, and ongoing security patching." },
  { icon: HardDrive, title: "Backup & Disaster Recovery", desc: "Automated backups with tested recovery procedures. Your data is always safe." },
  { icon: HeadphonesIcon, title: "Responsive Helpdesk", desc: "Real humans answering support tickets. Average response time under 2 hours." },
  { icon: Bell, title: "Patch Management", desc: "OS and software updates applied on a schedule that doesn't disrupt operations." },
  { icon: Users, title: "User Lifecycle Management", desc: "Onboarding, offboarding, access provisioning and MFA enrollment." },
];

export default function ManagedITPage() {
  return (
    <>
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>Managed IT Services</Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Your IT department — <span className="text-gradient">without the overhead</span>
              </h1>
              <p className="text-lg max-w-2xl mb-8" style={{ color: "var(--text-secondary)" }}>
                GCS takes full ownership of your IT operations. We monitor, secure, update, and support your technology so your team stays focused on what they do best.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                  <Link href="/get-quote">Get a quote <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <Link href="/contact">Talk to us first</Link>
                </Button>
              </div>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <ManagedITIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>What&apos;s included</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>Everything you need to keep your business running smoothly.</p>
          </FadeUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title}>
                <div className="card-base p-6">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--bg-tertiary)" }}>
                    <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </>
  );
}
