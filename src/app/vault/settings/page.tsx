"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/vault/context";
import { useSync } from "@/lib/vault/sync/context";
import { VaultHeader } from "@/components/vault/vault-header";
import { PinPad } from "@/components/vault/pin-pad";

export default function SettingsPage() {
  const { resetVault, lockVault, credentials, status } = useVault();
  const { config, syncStatus, lastError, connectGoogleDrive, disconnectCloud, syncNow, toggleAutoSync } = useSync();
  const router = useRouter();
  const [showChangePin, setShowChangePin] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState("");
  const [exportDone, setExportDone] = useState(false);
  const [connecting, setConnecting] = useState(false);

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

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      await connectGoogleDrive();
    } catch {
      // error is in lastError
    }
    setConnecting(false);
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

  const lastSyncFormatted = config?.lastSyncAt
    ? new Date(config.lastSyncAt).toLocaleString()
    : null;

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

        {/* Cloud Backup */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-wider">Cloud Backup</h3>
            {config?.enabled && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Connected</span>
            )}
          </div>

          {!config?.enabled ? (
            <>
              <p className="text-white/40 text-xs leading-relaxed">
                Backup your encrypted vault to your own Google Drive. Your data is encrypted before upload — Google only sees encrypted noise.
              </p>
              <button
                onClick={handleConnectGoogle}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {connecting ? "Connecting..." : "Connect Google Drive"}
              </button>
              {lastError && (
                <p className="text-red-400 text-xs text-center">{lastError}</p>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Account</span>
                  <span className="text-white text-xs">{config.connectedEmail}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Last backup</span>
                  <span className="text-white text-xs">{lastSyncFormatted || "Never"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/40">Auto-backup</span>
                  <button
                    onClick={() => toggleAutoSync(!config.autoSync)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${config.autoSync ? "bg-blue-600" : "bg-white/10"}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${config.autoSync ? "translate-x-4" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Sync status */}
              {syncStatus === "syncing" && (
                <div className="flex items-center gap-2 text-blue-400 text-xs bg-blue-500/10 px-3 py-2 rounded-lg">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Backing up encrypted vault...
                </div>
              )}
              {syncStatus === "success" && (
                <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 px-3 py-2 rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Backup complete
                </div>
              )}
              {syncStatus === "error" && lastError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {lastError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={syncNow}
                  disabled={syncStatus === "syncing"}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  Backup Now
                </button>
                <button
                  onClick={disconnectCloud}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                >
                  Disconnect
                </button>
              </div>

              <p className="text-white/20 text-[10px] text-center">
                Your vault is encrypted with AES-256-GCM before upload. Google cannot read your passwords.
              </p>
            </>
          )}
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
