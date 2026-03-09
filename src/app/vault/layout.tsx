import type { Metadata, Viewport } from "next";
import { VaultProvider } from "@/lib/vault/context";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "GCS Password Vault",
  description: "Secure, encrypted password manager. Zero-knowledge. Your data never leaves your device.",
  manifest: "/vault-manifest.json",
  appleWebApp: {
    capable: true,
    title: "GCS Vault",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1929",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A1929] text-white">
      <VaultProvider>{children}</VaultProvider>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/vault-sw.js', { scope: '/vault' }).catch(() => {});
            }
          `,
        }}
      />
    </div>
  );
}
