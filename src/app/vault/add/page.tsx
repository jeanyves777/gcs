"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/vault/context";
import { VaultHeader } from "@/components/vault/vault-header";
import { generatePassword, getPasswordStrength } from "@/lib/vault/password-generator";

const CATEGORIES = ["general", "social", "email", "finance", "work", "shopping", "development"];

export default function AddCredentialPage() {
  const { addCredential, status } = useVault();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    siteName: "",
    siteUrl: "",
    username: "",
    password: "",
    notes: "",
    category: "general",
  });
  const [showGenerator, setShowGenerator] = useState(false);
  const [genOptions, setGenOptions] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  useEffect(() => {
    if (status !== "unlocked") {
      router.replace("/vault");
    }
  }, [status, router]);

  if (status !== "unlocked") {
    return null;
  }

  const strength = form.password ? getPasswordStrength(form.password) : null;

  const handleGenerate = () => {
    const pw = generatePassword(genOptions);
    setForm((prev) => ({ ...prev, password: pw }));
  };

  const handleSubmit = async () => {
    if (!form.siteName.trim() || !form.password.trim()) return;
    setSaving(true);
    try {
      await addCredential({
        siteName: form.siteName.trim(),
        siteUrl: form.siteUrl.trim(),
        username: form.username.trim(),
        password: form.password,
        notes: form.notes.trim(),
        category: form.category,
      });
      router.replace("/vault/dashboard");
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <VaultHeader title="Add Credential" showBack showLock={false} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-4">
        {/* Site Name */}
        <div>
          <label className="text-white/50 text-xs mb-1 block">Site Name *</label>
          <input
            type="text"
            value={form.siteName}
            onChange={(e) => setForm((p) => ({ ...p, siteName: e.target.value }))}
            placeholder="Google, GitHub, Netflix..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:outline-none text-sm"
          />
        </div>

        {/* Site URL */}
        <div>
          <label className="text-white/50 text-xs mb-1 block">Website URL</label>
          <input
            type="url"
            value={form.siteUrl}
            onChange={(e) => setForm((p) => ({ ...p, siteUrl: e.target.value }))}
            placeholder="https://example.com"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:outline-none text-sm"
          />
        </div>

        {/* Username */}
        <div>
          <label className="text-white/50 text-xs mb-1 block">Username / Email</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            placeholder="user@example.com"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:outline-none text-sm"
          />
        </div>

        {/* Password */}
        <div>
          <label className="text-white/50 text-xs mb-1 block">Password *</label>
          <div className="relative">
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Enter or generate a password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-24 text-white font-mono placeholder:text-white/20 focus:border-blue-500/50 focus:outline-none text-sm"
            />
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors"
            >
              Generate
            </button>
          </div>
          {strength && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(strength.score / 6) * 100}%`, backgroundColor: strength.color }}
                />
              </div>
              <span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
        </div>

        {/* Generator options */}
        {showGenerator && (
          <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">Length: {genOptions.length}</span>
              <input
                type="range"
                min={8}
                max={64}
                value={genOptions.length}
                onChange={(e) => setGenOptions((p) => ({ ...p, length: Number(e.target.value) }))}
                className="w-32 accent-blue-500"
              />
            </div>
            {(["uppercase", "lowercase", "numbers", "symbols"] as const).map((opt) => (
              <label key={opt} className="flex items-center justify-between">
                <span className="text-white/60 text-xs capitalize">{opt}</span>
                <input
                  type="checkbox"
                  checked={genOptions[opt]}
                  onChange={(e) => setGenOptions((p) => ({ ...p, [opt]: e.target.checked }))}
                  className="accent-blue-500"
                />
              </label>
            ))}
            <button
              onClick={handleGenerate}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Generate Password
            </button>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="text-white/50 text-xs mb-1 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setForm((p) => ({ ...p, category: cat }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  form.category === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-white/50 text-xs mb-1 block">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Additional notes..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:outline-none text-sm resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSubmit}
          disabled={!form.siteName.trim() || !form.password.trim() || saving}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium transition-colors"
        >
          {saving ? "Encrypting & Saving..." : "Save Credential"}
        </button>
      </main>
    </div>
  );
}
