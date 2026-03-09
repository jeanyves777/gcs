"use client";
import { useState, useEffect } from "react";
import { Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
        <Check className="w-4 h-4" />
        Installed
      </div>
    );
  }

  if (!deferredPrompt) {
    return (
      <div className="text-center space-y-1">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Open <a href="/vault" style={{ color: "var(--brand-primary)", textDecoration: "underline" }}>/vault</a> in your browser to install as an app.
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
          iOS: Open /vault &rarr; Share &rarr; Add to Home Screen
        </p>
      </div>
    );
  }

  return (
    <Button onClick={handleInstall} variant="outline" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
      <Download className="mr-2 h-4 w-4" />
      Install Password Vault
    </Button>
  );
}
