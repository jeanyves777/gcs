"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const services = [
  { href: "/services/managed-it", label: "Managed IT Services" },
  { href: "/services/software-dev", label: "Custom Software" },
  { href: "/services/enterprise", label: "Enterprise Solutions" },
  { href: "/services/cloud", label: "Cloud Management" },
  { href: "/services/cybersecurity", label: "Cybersecurity" },
];

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services", children: services },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] p-0"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
            <Logo showTagline />
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navLinks.map((link) => {
              if (link.children) {
                return (
                  <div key={link.href}>
                    <button
                      onClick={() => setServicesOpen(!servicesOpen)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        "hover:bg-[var(--bg-secondary)]"
                      )}
                      style={{ color: "var(--text-primary)" }}
                    >
                      {link.label}
                      {servicesOpen ? (
                        <ChevronDown className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                      ) : (
                        <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                      )}
                    </button>
                    {servicesOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center px-3 py-2 rounded-lg text-sm transition-colors",
                              pathname === child.href
                                ? "font-medium"
                                : "hover:bg-[var(--bg-secondary)]"
                            )}
                            style={{
                              color:
                                pathname === child.href
                                  ? "var(--brand-primary)"
                                  : "var(--text-secondary)",
                            }}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-[var(--bg-tertiary)]"
                      : "hover:bg-[var(--bg-secondary)]"
                  )}
                  style={{
                    color: pathname === link.href ? "var(--brand-primary)" : "var(--text-primary)",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer CTA */}
          <div className="p-4 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
            <Button
              asChild
              variant="outline"
              className="w-full"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <Link href="/auth/login" onClick={() => setOpen(false)}>
                Client Portal
              </Link>
            </Button>
            <Button
              asChild
              className="w-full text-white"
              style={{ background: "var(--brand-primary)" }}
            >
              <Link href="/get-quote" onClick={() => setOpen(false)}>
                Get a Quote
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
