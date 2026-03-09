"use client";
import { useState } from "react";
import type { VaultCredential } from "@/lib/vault/types";
import { PinPad } from "./pin-pad";

interface CredentialCardProps {
  credential: VaultCredential;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isStale?: boolean;
  onVerifyPin: (pin: string) => Promise<boolean>;
}

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-500",
  social: "bg-blue-500",
  email: "bg-green-500",
  finance: "bg-yellow-500",
  work: "bg-purple-500",
  shopping: "bg-pink-500",
  development: "bg-orange-500",
};

export function CredentialCard({ credential, onEdit, onDelete, isStale, onVerifyPin }: CredentialCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShowPassword = () => {
    if (showPassword) {
      setShowPassword(false);
      return;
    }
    setShowPinPrompt(true);
    setPinError(null);
  };

  const handlePinSubmit = async (pin: string) => {
    const valid = await onVerifyPin(pin);
    if (valid) {
      setShowPinPrompt(false);
      setShowPassword(true);
      setPinError(null);
      // Auto-hide after 30 seconds
      setTimeout(() => setShowPassword(false), 30000);
    } else {
      setPinError("Incorrect PIN");
    }
  };

  const favicon = credential.siteUrl
    ? `https://www.google.com/s2/favicons?domain=${new URL(credential.siteUrl.startsWith("http") ? credential.siteUrl : `https://${credential.siteUrl}`).hostname}&sz=32`
    : null;

  const daysOld = Math.floor((Date.now() - credential.updatedAt) / (1000 * 60 * 60 * 24));

  if (showPinPrompt) {
    return (
      <div className="bg-white/5 rounded-2xl p-4 border border-blue-500/30">
        <div className="text-center mb-3">
          <p className="text-white/60 text-sm">Enter PIN to view password for</p>
          <p className="text-white font-medium">{credential.siteName}</p>
        </div>
        <PinPad onSubmit={handlePinSubmit} label="Enter PIN" error={pinError} />
        <button
          onClick={() => { setShowPinPrompt(false); setPinError(null); }}
          className="w-full mt-3 text-center text-white/40 hover:text-white/60 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white/5 rounded-2xl p-4 border transition-all hover:bg-white/8 ${isStale ? "border-yellow-500/30" : "border-white/5"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {favicon ? (
            <img src={favicon} alt="" className="w-8 h-8 rounded-lg" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
              {credential.siteName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-white font-medium">{credential.siteName}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full text-white/80 ${CATEGORY_COLORS[credential.category] || "bg-gray-500"}`}>
              {credential.category}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(credential.id)} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors text-sm">
            Edit
          </button>
          <button onClick={() => onDelete(credential.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors text-sm">
            Del
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
          <div className="text-sm">
            <span className="text-white/40 text-xs">Username</span>
            <p className="text-white/90 font-mono text-sm">{credential.username}</p>
          </div>
          <button
            onClick={() => copyToClipboard(credential.username, "user")}
            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            {copied === "user" ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
          <div className="text-sm flex-1 min-w-0">
            <span className="text-white/40 text-xs">Password</span>
            <p className="text-white/90 font-mono text-sm truncate">
              {showPassword ? credential.password : "••••••••••••"}
            </p>
          </div>
          <div className="flex gap-1 ml-2">
            <button
              onClick={handleShowPassword}
              className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
            <button
              onClick={() => copyToClipboard(credential.password, "pass")}
              className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              {copied === "pass" ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {isStale && (
        <div className="mt-3 flex items-center gap-2 text-yellow-400 text-xs bg-yellow-500/10 px-3 py-2 rounded-lg">
          <span>⚠</span>
          <span>Password is {daysOld} days old. Consider updating.</span>
        </div>
      )}
    </div>
  );
}
