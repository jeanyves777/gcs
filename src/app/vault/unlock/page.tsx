"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/vault/context";
import { PinPad } from "@/components/vault/pin-pad";

export default function UnlockPage() {
  const [mode, setMode] = useState<"pin" | "recovery">("pin");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"key" | "newpin" | "confirm">("key");
  const [loading, setLoading] = useState(false);
  const { unlockVault, resetWithRecovery, error } = useVault();
  const [localError, setLocalError] = useState<string | null>(null);
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
        <button
          onClick={() => { setMode("recovery"); setLocalError(null); }}
          className="w-full text-center text-white/40 hover:text-white/60 text-sm transition-colors"
        >
          Forgot PIN? Use recovery key
        </button>
      </div>
    </div>
  );
}
