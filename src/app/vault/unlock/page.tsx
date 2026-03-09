"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/vault/context";
import { useSync } from "@/lib/vault/sync/context";
import { PinPad } from "@/components/vault/pin-pad";

export default function UnlockPage() {
  const [mode, setMode] = useState<"pin" | "recovery">("pin");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"key" | "newpin" | "confirm">("key");
  const [loading, setLoading] = useState(false);
  const { unlockVault, resetWithRecovery, error } = useVault();
  const { connectGoogleDrive, restoreFromCloud, lastError: syncError } = useSync();
  const [localError, setLocalError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const router = useRouter();

  const handlePinSubmit = async (pin: string) => {
    setLoading(true);
    setLocalError(null);
    try {
      await unlockVault(pin);
      router.replace("/vault/dashboard");
    } catch {
      setLocalError("Incorrect PIN. Please try again.");
    }
    setLoading(false);
  };

  const handleRecoverySubmit = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await resetWithRecovery(recoveryInput.trim(), newPin);
      router.replace("/vault/dashboard");
    } catch {
      setLocalError("Invalid recovery key.");
    }
    setLoading(false);
  };

  const handleGoogleRestore = async () => {
    setGoogleLoading(true);
    setLocalError(null);
    try {
      const exists = await connectGoogleDrive();
      if (exists) {
        setShowRestorePrompt(true);
      } else {
        setLocalError("No vault backup found in your Google Drive.");
      }
    } catch (err: any) {
      setLocalError(err?.message || "Failed to connect to Google Drive");
    }
    setGoogleLoading(false);
  };

  const handleRestore = async () => {
    setGoogleLoading(true);
    try {
      await restoreFromCloud();
      // restoreFromCloud reloads the page
    } catch (err: any) {
      setLocalError(err?.message || "Failed to restore vault");
      setGoogleLoading(false);
    }
  };

  if (showRestorePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Restore Vault?</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Found an encrypted vault in your Google Drive. This will replace any local data. You&apos;ll need your PIN to unlock after restore.
            </p>
          </div>
          {localError && <p className="text-red-400 text-xs">{localError}</p>}
          <button
            onClick={handleRestore}
            disabled={googleLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {googleLoading ? "Restoring..." : "Restore My Vault"}
          </button>
          <button
            onClick={() => { setShowRestorePrompt(false); }}
            className="w-full text-center text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === "recovery") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Reset PIN</h2>
            <p className="text-white/60 text-sm">Enter your recovery key to reset your PIN.</p>
          </div>

          {recoveryStep === "key" && (
            <div className="space-y-4">
              <textarea
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-mono text-center resize-none h-24 placeholder:text-white/20 focus:border-blue-500/50 focus:outline-none"
              />
              {localError && <p className="text-red-400 text-sm text-center">{localError}</p>}
              <button
                onClick={() => {
                  if (recoveryInput.trim().length > 0) setRecoveryStep("newpin");
                  else setLocalError("Please enter your recovery key.");
                }}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {recoveryStep === "newpin" && (
            <PinPad
              key="newpin"
              label="Create new PIN"
              onSubmit={(p) => { setNewPin(p); setRecoveryStep("confirm"); }}
            />
          )}

          {recoveryStep === "confirm" && (
            <PinPad
              key="confirm-recovery"
              label="Confirm new PIN"
              error={localError}
              loading={loading}
              onSubmit={(p) => {
                if (p !== newPin) {
                  setLocalError("PINs don't match.");
                  setRecoveryStep("newpin");
                  return;
                }
                handleRecoverySubmit();
              }}
            />
          )}

          <button
            onClick={() => { setMode("pin"); setLocalError(null); }}
            className="w-full text-center text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            Back to PIN entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="space-y-8">
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>
        <PinPad
          onSubmit={handlePinSubmit}
          label="Unlock Vault"
          error={localError || error}
          loading={loading}
        />
        <div className="space-y-3">
          <button
            onClick={() => { setMode("recovery"); setLocalError(null); }}
            className="w-full text-center text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            Forgot PIN? Use recovery key
          </button>
          <div className="flex items-center gap-3 text-white/15">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px]">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <button
            onClick={handleGoogleRestore}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Connecting..." : "Restore from Google Drive"}
          </button>
          {localError && <p className="text-red-400 text-xs text-center">{localError}</p>}
        </div>
      </div>
    </div>
  );
}
