"use client";
import { useVault } from "@/lib/vault/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function VaultPage() {
  const { status, loading } = useVault();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (status === "uninitialized") router.replace("/vault/setup");
    else if (status === "locked") router.replace("/vault/unlock");
    else if (status === "unlocked") router.replace("/vault/dashboard");
  }, [status, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center animate-pulse">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p className="text-white/50 text-sm">Loading vault...</p>
      </div>
    </div>
  );
}
