import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-secondary)" }}
    >
      {/* Top bar */}
      <header className="p-6">
        <Logo />
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          © {new Date().getFullYear()} General Computing Solutions.{" "}
          <Link href="/privacy" className="hover:underline" style={{ color: "var(--brand-primary)" }}>
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:underline" style={{ color: "var(--brand-primary)" }}>
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
