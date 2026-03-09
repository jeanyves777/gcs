"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { VaultHeader } from "@/components/vault/vault-header";
import { generatePassword, getPasswordStrength } from "@/lib/vault/password-generator";

export default function GeneratorPage() {
  const router = useRouter();
  const [password, setPassword] = useState(() =>
    generatePassword({ length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true })
  );
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const strength = getPasswordStrength(password);

  const handleGenerate = () => {
    setPassword(generatePassword(options));
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <VaultHeader title="Password Generator" showBack />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
        {/* Generated password display */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center space-y-4">
          <p className="text-white font-mono text-lg break-all leading-relaxed select-all">
            {password}
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 max-w-[200px] h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(strength.score / 6) * 100}%`, backgroundColor: strength.color }}
              />
            </div>
            <span className="text-sm font-medium" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors text-sm"
          >
            Regenerate
          </button>
          <button
            onClick={handleCopy}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors text-sm ${
              copied
                ? "bg-green-600 text-white"
                : "bg-white/10 hover:bg-white/15 text-white"
            }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Length</span>
              <span className="text-white font-mono text-sm bg-white/5 px-2 py-0.5 rounded">
                {options.length}
              </span>
            </div>
            <input
              type="range"
              min={4}
              max={64}
              value={options.length}
              onChange={(e) => {
                const length = Number(e.target.value);
                setOptions((p) => ({ ...p, length }));
                setPassword(generatePassword({ ...options, length }));
              }}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>4</span>
              <span>64</span>
            </div>
          </div>

          {(["uppercase", "lowercase", "numbers", "symbols"] as const).map((opt) => (
            <label
              key={opt}
              className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/8 transition-colors"
            >
              <div>
                <span className="text-white text-sm capitalize">{opt}</span>
                <p className="text-white/30 text-xs">
                  {opt === "uppercase" && "A B C D E F"}
                  {opt === "lowercase" && "a b c d e f"}
                  {opt === "numbers" && "0 1 2 3 4 5"}
                  {opt === "symbols" && "! @ # $ % ^"}
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={options[opt]}
                  onChange={(e) => {
                    const newOptions = { ...options, [opt]: e.target.checked };
                    setOptions(newOptions);
                    setPassword(generatePassword(newOptions));
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-white/10 rounded-full peer-checked:bg-blue-600 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
              </div>
            </label>
          ))}
        </div>

        {/* Password stats */}
        <div className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/10">
          <h3 className="text-white/50 text-xs font-medium uppercase tracking-wider">Password Info</h3>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Characters</span>
            <span className="text-white font-mono">{password.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Entropy</span>
            <span className="text-white font-mono">
              {Math.round(
                password.length *
                  Math.log2(
                    (options.uppercase ? 26 : 0) +
                      (options.lowercase ? 26 : 0) +
                      (options.numbers ? 10 : 0) +
                      (options.symbols ? 26 : 0) || 62
                  )
              )}{" "}
              bits
            </span>
          </div>
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 bg-gray-900/90 backdrop-blur-lg border-t border-white/5 px-4 py-2 flex justify-around z-30">
        <button onClick={() => router.push("/vault/dashboard")} className="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span className="text-[10px]">Vault</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-blue-400 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
          <span className="text-[10px]">Generate</span>
        </button>
        <button onClick={() => router.push("/vault/settings")} className="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>
    </div>
  );
}
