"use client";
import Link from "next/link";
import { VaultDemo } from "@/components/vault/vault-demo";
import { InstallPrompt } from "@/components/vault/install-prompt";

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "AES-256-GCM Encryption",
    desc: "Military-grade encryption. Every credential is individually encrypted with a unique IV. Even if someone accesses your device, they can't read your passwords without your PIN.",
    color: "blue",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Zero-Knowledge Architecture",
    desc: "Your data never leaves your device. No server, no cloud, no account. We literally cannot see your passwords — the encryption key exists only in your browser's memory.",
    color: "green",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "90-Day Rotation Reminders",
    desc: "GCS Vault tracks password age and alerts you when credentials are older than 90 days. One-click password regeneration with our built-in cryptographic generator.",
    color: "yellow",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    title: "PBKDF2 Key Derivation",
    desc: "Your PIN goes through 600,000 rounds of PBKDF2 before deriving the encryption key. This makes brute-force attacks computationally infeasible — even with specialized hardware.",
    color: "purple",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: "Auto-Lock Protection",
    desc: "Vault automatically locks after 5 minutes of inactivity or 30 seconds when you switch tabs. The encryption key is wiped from memory — not just hidden, actually deleted.",
    color: "red",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
      </svg>
    ),
    title: "Recovery Key System",
    desc: "During setup, you receive a 32-character recovery key. If you forget your PIN, this key can decrypt your vault and let you set a new one. Keep it safe — it's your only backup.",
    color: "cyan",
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  green: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
};

export function VaultLandingClient() {
  return (
    <div className="bg-[#0A1929] min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                100% Free &middot; No Account Required
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Your Passwords,
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  Your Device Only.
                </span>
              </h1>
              <p className="text-white/60 text-lg max-w-md leading-relaxed">
                GCS Vault is a free, installable web app that encrypts your credentials with
                AES-256-GCM and stores them locally. No server. No cloud. No account. Just security.
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                <Link
                  href="/vault"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-600/20"
                >
                  Launch GCS Vault
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <InstallPrompt />
              </div>
            </div>

            {/* Demo */}
            <div className="hidden md:block">
              <VaultDemo />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Three simple steps to complete security. No registration, no email, no phone number.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
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
          ].map((item) => (
            <div key={item.step} className="relative bg-white/[0.02] rounded-2xl p-6 border border-white/5 hover:border-blue-500/20 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-lg mb-4 group-hover:bg-blue-600/30 transition-colors">
                {item.step}
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Security, Not Marketing
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            We don&apos;t just say it&apos;s secure — here&apos;s exactly how every layer of protection works.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const c = COLOR_MAP[f.color];
            return (
              <div
                key={f.title}
                className={`rounded-2xl p-6 border ${c.border} bg-white/[0.02] hover:bg-white/[0.04] transition-colors`}
              >
                <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.text} flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Technical details */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-2xl font-bold text-white">Under the Hood</h2>
            <p className="text-white/40 text-sm mt-1">Complete transparency on our encryption architecture</p>
          </div>
          <div className="p-6 space-y-6 font-mono text-sm">
            <div>
              <p className="text-blue-400 mb-1">// Key Derivation</p>
              <p className="text-white/70">
                PIN &rarr; <span className="text-green-400">PBKDF2</span>(SHA-256, 600,000 iterations, random salt) &rarr; 256-bit wrapping key
              </p>
            </div>
            <div>
              <p className="text-blue-400 mb-1">// Master Key</p>
              <p className="text-white/70">
                <span className="text-green-400">crypto.subtle.generateKey</span>(&quot;AES-GCM&quot;, 256) &rarr; random master key
              </p>
              <p className="text-white/70">
                Master key <span className="text-green-400">wrapped</span> with PIN-derived key via AES-KW
              </p>
            </div>
            <div>
              <p className="text-blue-400 mb-1">// Per-Credential Encryption</p>
              <p className="text-white/70">
                credential &rarr; JSON &rarr; <span className="text-green-400">AES-256-GCM</span>(master key, random 12-byte IV) &rarr; ciphertext
              </p>
            </div>
            <div>
              <p className="text-blue-400 mb-1">// Recovery</p>
              <p className="text-white/70">
                Recovery key (32 chars) &rarr; <span className="text-green-400">PBKDF2</span>(separate salt) &rarr; unwraps same master key
              </p>
            </div>
            <div>
              <p className="text-blue-400 mb-1">// Storage</p>
              <p className="text-white/70">
                <span className="text-green-400">IndexedDB</span> (browser-local) &rarr; encrypted blobs only &rarr; no server calls
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-b from-blue-600/10 to-transparent rounded-3xl border border-blue-500/10 p-12 space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to take control of your passwords?
          </h2>
          <p className="text-white/50 max-w-md mx-auto">
            Free forever. No ads. No tracking. No server. Just you and your encrypted vault.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-lg transition-all hover:scale-105 shadow-xl shadow-blue-600/20"
            >
              Get Started Free
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <p className="text-white/20 text-xs">
            Works in Chrome, Edge, Firefox, Safari &middot; Install as a standalone app
          </p>
        </div>
      </section>
    </div>
  );
}
