"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "./mobile-nav";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const services = [
  {
    href: "/services/managed-it",
    label: "Managed IT Services",
    description: "Your outsourced IT department — monitoring, security, and helpdesk.",
  },
  {
    href: "/services/software-dev",
    label: "Custom Software",
    description: "Tailor-made web apps, mobile apps, and enterprise systems.",
  },
  {
    href: "/services/enterprise",
    label: "Enterprise Solutions",
    description: "Scalable systems designed around your specific workflows.",
  },
  {
    href: "/services/cloud",
    label: "Cloud Management",
    description: "Cloud migration, optimization, and ongoing management.",
  },
  {
    href: "/services/cybersecurity",
    label: "Cybersecurity",
    description: "Protect your business with comprehensive security services.",
  },
  {
    href: "/services/ai-integration",
    label: "AI Integration",
    description: "Embed AI automation into your workflows and products.",
  },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-200",
        scrolled
          ? "border-b shadow-sm"
          : "border-b border-transparent"
      )}
      style={{
        height: "var(--header-height)",
        background: scrolled ? "var(--bg-primary)" : "var(--bg-primary)",
        borderColor: scrolled ? "var(--border)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div className="container-gcs h-full flex items-center justify-between gap-4">
        {/* Logo */}
        <Logo showTagline size="lg" />

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList className="gap-1">
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href="/"
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive("/")
                      ? "text-[var(--brand-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  )}
                >
                  Home
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href="/about"
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive("/about")
                      ? "text-[var(--brand-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  )}
                >
                  About
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Services dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors h-auto bg-transparent hover:bg-[var(--bg-secondary)]",
                  isActive("/services")
                    ? "text-[var(--brand-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                Services
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div
                  className="w-[480px] p-4 grid grid-cols-1 gap-1"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}
                >
                  <div className="px-2 py-1.5 mb-1">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Our Services
                    </p>
                  </div>
                  {services.map((service) => (
                    <NavigationMenuLink asChild key={service.href}>
                      <Link
                        href={service.href}
                        className={cn(
                          "group block px-3 py-2.5 rounded-lg transition-colors",
                          "hover:bg-[var(--bg-secondary)]"
                        )}
                      >
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {service.label}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {service.description}
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  ))}
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/services"
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-[var(--bg-secondary)]"
                        style={{ color: "var(--brand-primary)" }}
                      >
                        View all services
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </NavigationMenuLink>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {[
              { href: "/portfolio", label: "Portfolio" },
              { href: "/blog", label: "Blog" },
              { href: "/contact", label: "Contact" },
            ].map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive(link.href)
                        ? "text-[var(--brand-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    )}
                  >
                    {link.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            <Link href="/auth/login">Client Portal</Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="hidden md:inline-flex text-white text-sm font-medium"
            style={{ background: "var(--brand-primary)" }}
          >
            <Link href="/get-quote">Get a Quote</Link>
          </Button>

          {/* Mobile hamburger */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
