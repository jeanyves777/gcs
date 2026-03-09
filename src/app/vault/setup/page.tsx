"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/vault/context";
import { useSync } from "@/lib/vault/sync/context";
import { PinPad } from "@/components/vault/pin-pad";

type Step = "welcome" | "pin" | "confirm" | "recovery";

export default function SetupPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [pin, setPin] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [backupExists, setBackupExists] = useState(false);
  const { setupVault } = useVault();
  const { connectGoogleDrive, restoreFromCloud, lastError: syncError } = useSync();
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const exists = await connectGoogleDrive();
      setBackupExists(exists);
      setShowRestorePrompt(true);
    } catch (err: any) {
      setError(err?.message || "Failed to connect to Google Drive");
    }
    setGoogleLoading(false);
  };

  const handleRestore = async () => {
    setGoogleLoading(true);
    try {
      await restoreFromCloud();
      // restoreFromCloud reloads the page
    } catch (err: any) {
      setError(err?.message || "Failed to restore vault");
      setGoogleLoading(false);
    }
  };

  if (showRestorePrompt && backupExists) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Vault Found!</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              We found an existing encrypted vault in your Google Drive. Would you like to restore it, or start fresh?
            </p>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleRestore}
            disabled={googleLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {googleLoading ? "Restoring..." : "Restore My Vault"}
          </button>
          <button
            onClick={() => { setShowRestorePrompt(false); setStep("pin"); }}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 font-medium transition-colors"
          >
            Start Fresh Instead
          </button>
        </div>
      </div>
    );
  }

  if (showRestorePrompt && !backupExists) {
    // Connected to Google but no backup exists — proceed to create vault
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-2xl shadow-green-500/30">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Google Connected!</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              No existing vault backup found. Let&apos;s create a new vault — it will automatically back up to your Google Drive.
            </p>
          </div>
          <button
            onClick={() => { setShowRestorePrompt(false); setStep("pin"); }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98]"
          >
            Create Vault
          </button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-white mb-3">Password Vault</h1>
            <p className="text-white/60 leading-relaxed">
              Your passwords are encrypted with AES-256-GCM and never leave your device.
              Zero-knowledge — we can&apos;t see your data.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setStep("pin")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98]"
            >
              Create Your Vault
            </button>
            <div className="flex items-center gap-3 text-white/20">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? "Connecting..." : "Sign in with Google"}
            </button>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          </div>
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
        <PinPad key="create" onSubmit={handleFirstPin} label="Create a 6-digit PIN" error={error} />
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <PinPad
          key="confirm"
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
