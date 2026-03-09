"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/vault/context";
import { VaultHeader } from "@/components/vault/vault-header";
import { PinPad } from "@/components/vault/pin-pad";

export default function SettingsPage() {
  const { resetVault, lockVault, credentials, status } = useVault();
  const router = useRouter();
  const [showChangePin, setShowChangePin] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState("");
  const [exportDone, setExportDone] = useState(false);

  if (status !== "unlocked") {
    router.replace("/vault");
    return null;
  }

  const handleExport = () => {
    const data = credentials.map(({ id, createdAt, updatedAt, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gcs-vault-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  };

  const handleReset = async () => {
    if (resetText !== "DELETE") return;
    await resetVault();
    router.replace("/vault");
  };

  if (showChangePin) {
    return (
      <div className="min-h-screen flex flex-col">
        <VaultHeader title="Change PIN" showBack={false} showLock={false} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="space-y-6">
            <PinPad
              label="Enter new PIN"
              onSubmit={() => {
                setShowChangePin(false);
              }}
            />
            <button
              onClick={() => setShowChangePin(false)}
              className="w-full text-center text-white/40 hover:text-white/60 text-sm transition-colors"
            >
              Cancel
            </button>
            <p className="text-white/30 text-xs text-center max-w-xs mx-auto">
              To change your PIN, lock the vault and use &quot;Forgot PIN? Use recovery key&quot; on the unlock screen.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <VaultHeader title="Settings" showBack />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-3">
        {/* Vault stats */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
          <h3 className="text-white/50 text-xs font-medium uppercase tracking-wider">Vault Info</h3>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Stored credentials</span>
            <span className="text-white font-mono">{credentials.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Encryption</span>
            <span className="text-white text-xs">AES-256-GCM</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Key derivation</span>
            <span className="text-white text-xs">PBKDF2 600K</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Storage</span>
            <span className="text-white text-xs">Local (IndexedDB)</span>
          </div>
        </div>

        {/* Change PIN */}
        <button
          onClick={() => {
            lockVault();
            router.replace("/vault/unlock");
          }}
          className="w-full bg-white/5 rounded-xl px-4 py-4 border border-white/10 flex items-center justify-between hover:bg-white/8 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-medium">Change PIN</p>
              <p className="text-white/40 text-xs">Use recovery key to set a new PIN</p>
            </div>
          </div>
          <span className="text-white/20">&#8250;</span>
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="w-full bg-white/5 rounded-xl px-4 py-4 border border-white/10 flex items-center justify-between hover:bg-white/8 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-medium">
                {exportDone ? "Exported!" : "Export Credentials"}
              </p>
              <p className="text-white/40 text-xs">Download decrypted JSON backup</p>
            </div>
          </div>
          <span className="text-white/20">&#8250;</span>
        </button>

        {/* Lock Vault */}
        <button
          onClick={() => {
            lockVault();
            router.replace("/vault");
          }}
          className="w-full bg-white/5 rounded-xl px-4 py-4 border border-white/10 flex items-center justify-between hover:bg-white/8 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-medium">Lock Vault</p>
              <p className="text-white/40 text-xs">Clear encryption key from memory</p>
            </div>
          </div>
          <span className="text-white/20">&#8250;</span>
        </button>

        {/* Danger zone */}
        <div className="pt-6">
          <h3 className="text-red-400/60 text-xs font-medium uppercase tracking-wider mb-3">Danger Zone</h3>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full bg-red-500/5 rounded-xl px-4 py-4 border border-red-500/10 flex items-center justify-between hover:bg-red-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-red-400 text-sm font-medium">Reset Vault</p>
                  <p className="text-red-400/40 text-xs">Delete all data permanently</p>
                </div>
              </div>
              <span className="text-red-400/20">&#8250;</span>
            </button>
          ) : (
            <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20 space-y-3">
              <p className="text-red-400 text-sm">
                This will permanently delete all {credentials.length} credentials and your encryption keys.
                This cannot be undone.
              </p>
              <p className="text-white/40 text-xs">Type DELETE to confirm:</p>
              <input
                type="text"
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-black/30 border border-red-500/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500/50 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={resetText !== "DELETE"}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-sm font-medium transition-colors"
                >
                  Delete Everything
                </button>
                <button
                  onClick={() => { setShowResetConfirm(false); setResetText(""); }}
                  className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 bg-gray-900/90 backdrop-blur-lg border-t border-white/5 px-4 py-2 flex justify-around z-30">
        <button onClick={() => router.push("/vault/dashboard")} className="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span className="text-[10px]">Vault</span>
        </button>
        <button onClick={() => router.push("/vault/generator")} className="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
          <span className="text-[10px]">Generate</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-blue-400 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>
    </div>
  );
}
