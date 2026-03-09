"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/vault/context";
import { PinPad } from "@/components/vault/pin-pad";

type Step = "welcome" | "pin" | "confirm" | "recovery";

export default function SetupPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [pin, setPin] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setupVault } = useVault();
  const router = useRouter();

  const handleFirstPin = (p: string) => {
    setPin(p);
    setStep("confirm");
  };

  const handleConfirmPin = async (confirmPin: string) => {
    if (confirmPin !== pin) {
      setError("PINs don't match. Try again.");
      setStep("pin");
      return;
    }
    setLoading(true);
    try {
      const key = await setupVault(pin);
      setRecoveryKey(key);
      setStep("recovery");
    } catch {
      setError("Failed to set up vault.");
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (step === "welcome") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-3">GCS Password Vault</h1>
            <p className="text-white/60 leading-relaxed">
              Your passwords are encrypted with AES-256-GCM and never leave your device.
              Zero-knowledge — we can&apos;t see your data.
            </p>
          </div>
          <button
            onClick={() => setStep("pin")}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98]"
          >
            Create Your Vault
          </button>
          <p className="text-white/30 text-xs">
            AES-256-GCM · PBKDF2 600K iterations · Zero-knowledge
          </p>
        </div>
      </div>
    );
  }

  if (step === "pin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <PinPad onSubmit={handleFirstPin} label="Create a 6-digit PIN" error={error} />
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <PinPad
          onSubmit={handleConfirmPin}
          label="Confirm your PIN"
          error={error}
          loading={loading}
        />
      </div>
    );
  }

  // Recovery key display
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Save Your Recovery Key</h2>
          <p className="text-white/60 text-sm">
            Write this down and store it safely. If you forget your PIN, this is the ONLY way to recover your vault.
          </p>
        </div>
        <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
          <p className="font-mono text-lg text-blue-400 tracking-wider leading-relaxed break-all select-all">
            {recoveryKey}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <p className="text-red-400 text-sm font-medium">
            If you lose this key AND forget your PIN, your data is gone forever. There is no recovery.
          </p>
        </div>
        <button
          onClick={() => router.replace("/vault/dashboard")}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all"
        >
          I&apos;ve Saved My Recovery Key
        </button>
      </div>
    </div>
  );
}
