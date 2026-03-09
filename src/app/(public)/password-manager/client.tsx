"use client";
import Link from "next/link";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Shield, Clock, Key, Eye, RefreshCw, CheckCircle2, Download, Cloud } from "lucide-react";
import { VaultDemo } from "@/components/vault/vault-demo";
import { InstallPrompt } from "@/components/vault/install-prompt";

const FEATURES = [
  {
    icon: Lock,
    title: "AES-256-GCM Encryption",
    desc: "Military-grade encryption. Every credential is individually encrypted with a unique IV. Even if someone accesses your device, they can't read your passwords without your PIN.",
  },
  {
    icon: Shield,
    title: "Zero-Knowledge Architecture",
    desc: "Your data never leaves your device. No server, no cloud, no account. We literally cannot see your passwords — the encryption key exists only in your browser's memory.",
  },
  {
    icon: Clock,
    title: "90-Day Rotation Reminders",
    desc: "GCS Vault tracks password age and alerts you when credentials are older than 90 days. One-click password regeneration with our built-in cryptographic generator.",
  },
  {
    icon: Key,
    title: "PBKDF2 Key Derivation",
    desc: "Your PIN goes through 600,000 rounds of PBKDF2 before deriving the encryption key. This makes brute-force attacks computationally infeasible — even with specialized hardware.",
  },
  {
    icon: Eye,
    title: "Auto-Lock Protection",
    desc: "Vault automatically locks after 5 minutes of inactivity or 30 seconds when you switch tabs. The encryption key is wiped from memory — not just hidden, actually deleted.",
  },
  {
    icon: RefreshCw,
    title: "Recovery Key System",
    desc: "During setup, you receive a 32-character recovery key. If you forget your PIN, this key can decrypt your vault and let you set a new one. Keep it safe — it's your only backup.",
  },
  {
    icon: Cloud,
    title: "Google Drive Cloud Backup",
    desc: "Optionally back up your encrypted vault to your own Google Drive. Your data is encrypted before it ever leaves your device — Google only sees an encrypted blob. You stay in full control.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create a 6-digit PIN",
    desc: "Your PIN derives a 256-bit encryption key through 600,000 rounds of PBKDF2. This key wraps a random master key.",
  },
  {
    step: "2",
    title: "Save your recovery key",
    desc: "A 32-character recovery key is generated once. Write it down — it's your only way back if you forget your PIN.",
  },
  {
    step: "3",
    title: "Add credentials",
    desc: "Each credential is encrypted individually with AES-256-GCM and stored in your browser's IndexedDB. That's it.",
  },
];

const TRUST_POINTS = [
  "No account or registration required",
  "No unencrypted data leaves your device — ever",
  "Open encryption standards (Web Crypto API)",
  "Works offline as an installable web app",
  "Optional encrypted Google Drive backup",
  "Export your data anytime as JSON",
  "Free forever — no premium, no ads",
];

export function VaultLandingClient() {
  return (
    <>
      {/* Hero */}
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                <Download className="w-3 h-3 mr-1" /> Free Password Manager
              </Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Your Passwords,{" "}
                <span className="text-gradient">Your Device Only.</span>
              </h1>
              <p className="text-lg max-w-2xl mb-8" style={{ color: "var(--text-secondary)" }}>
                GCS Vault is a free, installable web app that encrypts your credentials with
                AES-256-GCM and stores them locally. Optionally back up to your own Google Drive — encrypted before upload. No account. Just security.
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                  <Link href="/vault">Launch GCS Vault <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <InstallPrompt />
              </div>
            </FadeUp>
            <div className="hidden lg:block">
              <FadeIn delay={0.2}>
                <VaultDemo />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp>
            <div className="text-center mb-16">
              <Badge className="mb-4" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                How It Works
              </Badge>
              <h2 className="font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Three steps to{" "}
                <span className="text-gradient">complete security</span>
              </h2>
              <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                No registration, no email, no phone number. Just open the app and set your PIN.
              </p>
            </div>
          </FadeUp>

          <StaggerContainer className="grid md:grid-cols-3 gap-8">
            {STEPS.map((item) => (
              <StaggerItem key={item.step}>
                <div className="rounded-2xl p-6 h-full border transition-colors hover:border-blue-500/30" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-4 text-white" style={{ background: "var(--brand-primary)" }}>
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Security features */}
      <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <FadeUp>
            <div className="text-center mb-16">
              <Badge className="mb-4" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                <Shield className="w-3 h-3 mr-1" /> Security
              </Badge>
              <h2 className="font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Security,{" "}
                <span className="text-gradient">Not Marketing</span>
              </h2>
              <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                We don&apos;t just say it&apos;s secure — here&apos;s exactly how every layer of protection works.
              </p>
            </div>
          </FadeUp>

          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <div className="rounded-2xl p-6 h-full border transition-colors" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(var(--brand-primary-rgb, 21,101,192), 0.1)" }}>
                    <f.icon className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Cloud Backup */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-4" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>
                <Cloud className="w-3 h-3 mr-1" /> Cloud Backup
              </Badge>
              <h2 className="font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Encrypted backup to{" "}
                <span className="text-gradient">your Google Drive</span>
              </h2>
              <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
                Worried about losing your vault if you clear browser data? Connect your Google Drive and back up your encrypted vault with one click. Your data is encrypted with AES-256-GCM before upload — Google never sees your passwords.
              </p>
              <div className="space-y-3">
                {[
                  "Encrypted before upload — zero-knowledge stays intact",
                  "Stored in a hidden app folder only GCS Vault can access",
                  "One-click backup and restore",
                  "Completely optional — works fine without it",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--brand-primary)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{point}</span>
                  </div>
                ))}
              </div>
            </FadeUp>
            <FadeIn delay={0.2}>
              <div className="rounded-2xl p-6 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(var(--brand-primary-rgb, 21,101,192), 0.1)" }}>
                      <Cloud className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Cloud Backup</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Google Drive</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Status</span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Last backup</span>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Just now</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Auto-backup</span>
                      <div className="w-9 h-5 rounded-full relative" style={{ background: "var(--brand-primary)" }}>
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                      Your vault is encrypted before upload
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Technical details */}
      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs max-w-4xl">
          <FadeUp>
            <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
              <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
                <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Under the Hood</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Complete transparency on our encryption architecture</p>
              </div>
              <div className="p-6 space-y-6 font-mono text-sm" style={{ background: "var(--bg-tertiary)" }}>
                {[
                  { label: "// Key Derivation", content: <>PIN &rarr; <span style={{ color: "var(--brand-primary)" }}>PBKDF2</span>(SHA-256, 600,000 iterations, random salt) &rarr; 256-bit wrapping key</> },
                  { label: "// Master Key", content: <><span style={{ color: "var(--brand-primary)" }}>crypto.subtle.generateKey</span>(&quot;AES-GCM&quot;, 256) &rarr; random master key<br />Master key <span style={{ color: "var(--brand-primary)" }}>wrapped</span> with PIN-derived key via AES-KW</> },
                  { label: "// Per-Credential Encryption", content: <>credential &rarr; JSON &rarr; <span style={{ color: "var(--brand-primary)" }}>AES-256-GCM</span>(master key, random 12-byte IV) &rarr; ciphertext</> },
                  { label: "// Recovery", content: <>Recovery key (32 chars) &rarr; <span style={{ color: "var(--brand-primary)" }}>PBKDF2</span>(separate salt) &rarr; unwraps same master key</> },
                  { label: "// Storage", content: <><span style={{ color: "var(--brand-primary)" }}>IndexedDB</span> (browser-local) &rarr; encrypted blobs only &rarr; no server calls</> },
                  { label: "// Cloud Backup", content: <>Vault snapshot &rarr; <span style={{ color: "var(--brand-primary)" }}>AES-256-GCM encrypted</span> &rarr; base64 JSON &rarr; Google Drive <span style={{ color: "var(--brand-primary)" }}>appDataFolder</span> (hidden, app-only)</> },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="mb-1" style={{ color: "var(--brand-primary)" }}>{item.label}</p>
                    <p style={{ color: "var(--text-secondary)" }}>{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Trust / Why GCS Vault */}
      <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs max-w-4xl">
          <FadeUp>
            <div className="text-center mb-12">
              <h2 className="font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Why trust{" "}
                <span className="text-gradient">GCS Vault</span>?
              </h2>
            </div>
          </FadeUp>
          <StaggerContainer className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {TRUST_POINTS.map((point) => (
              <StaggerItem key={point}>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--brand-primary)" }} />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{point}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding text-white" style={{ background: "var(--brand-primary)" }}>
        <div className="container-gcs text-center">
          <FadeUp>
            <h2 className="font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Ready to take control of your passwords?
            </h2>
            <p className="max-w-md mx-auto mb-8" style={{ color: "rgba(255,255,255,0.85)" }}>
              Free forever. No ads. No tracking. No server. Just you and your encrypted vault.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-white hover:bg-white/90 font-semibold" style={{ color: "var(--brand-primary)" }}>
                <Link href="/vault">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <p className="mt-6 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Works in Chrome, Edge, Firefox, Safari &middot; Install as a standalone app
            </p>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
