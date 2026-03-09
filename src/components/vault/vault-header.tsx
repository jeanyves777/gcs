"use client";
import { useVault } from "@/lib/vault/context";
import { useRouter } from "next/navigation";

interface VaultHeaderProps {
  title?: string;
  showBack?: boolean;
  showLock?: boolean;
}

export function VaultHeader({ title = "Password Vault", showBack = false, showLock = true }: VaultHeaderProps) {
  const { lockVault, status } = useVault();
  const router = useRouter();

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur-lg border-b border-white/5 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            ←
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg">{title}</span>
        </div>
      </div>
      {showLock && status === "unlocked" && (
        <button
          onClick={lockVault}
          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
        >
          Lock
        </button>
      )}
    </header>
  );
}
