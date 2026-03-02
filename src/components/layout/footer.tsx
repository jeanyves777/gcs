import Link from "next/link";
import { Mail, Phone, MapPin, Linkedin, Twitter, Github } from "lucide-react";
import { Logo } from "./logo";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  company: [
    { href: "/about", label: "About GCS" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/blog", label: "Blog" },
    { href: "/careers", label: "Careers" },
    { href: "/contact", label: "Contact Us" },
  ],
  services: [
    { href: "/services/managed-it", label: "Managed IT Services" },
    { href: "/services/software-dev", label: "Custom Software" },
    { href: "/services/enterprise", label: "Enterprise Solutions" },
    { href: "/services/cloud", label: "Cloud Management" },
    { href: "/services/cybersecurity", label: "Cybersecurity" },
    { href: "/services/ai-integration", label: "AI Integration" },
  ],
  support: [
    { href: "/auth/login", label: "Client Portal" },
    { href: "/get-quote", label: "Get a Quote" },
    { href: "/contact", label: "Contact Support" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/cookies", label: "Cookie Policy" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      <div className="container-gcs py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Logo showTagline size="lg" />
            <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: "var(--text-secondary)" }}>
              We help businesses run smarter by managing their technology end to end — from day-to-day IT operations to custom software that drives growth.
            </p>

            {/* Contact */}
            <div className="mt-6 space-y-2">
              {[
                { icon: Mail, text: "info@itatgcs.com", href: "mailto:info@itatgcs.com" },
                { icon: Phone, text: "+1 (555) 123-4567", href: "tel:+15551234567" },
                { icon: MapPin, text: "Available Worldwide, Remote-First", href: null },
              ].map(({ icon: Icon, text, href }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color: "var(--brand-primary)" }} />
                  {href ? (
                    <a
                      href={href}
                      className="text-sm hover:underline transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {text}
                    </a>
                  ) : (
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{text}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              {[
                { icon: Linkedin, href: "#", label: "LinkedIn" },
                { icon: Twitter, href: "#", label: "Twitter/X" },
                { icon: Github, href: "#", label: "GitHub" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {[
            { title: "Company", links: footerLinks.company },
            { title: "Services", links: footerLinks.services },
            { title: "Legal", links: footerLinks.legal },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-[var(--brand-primary)]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" style={{ background: "var(--border)" }} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            © {currentYear} GCS — General Computing Solutions. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Managed IT Services & Custom Software Provider
          </p>
        </div>
      </div>
    </footer>
  );
}
