"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/vault/context";
import { VaultHeader } from "@/components/vault/vault-header";
import { CredentialCard } from "@/components/vault/credential-card";

const CATEGORIES = ["all", "general", "social", "email", "finance", "work", "shopping", "development"];

export default function DashboardPage() {
  const { credentials, staleCredentials, removeCredential, status } = useVault();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const router = useRouter();

  if (status !== "unlocked") {
    router.replace("/vault");
    return null;
  }

  const filtered = useMemo(() => {
    return credentials.filter((c) => {
      const matchSearch =
        !search ||
        c.siteName.toLowerCase().includes(search.toLowerCase()) ||
        c.username.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "all" || c.category === category;
      return matchSearch && matchCategory;
    });
  }, [credentials, search, category]);

  const staleIds = new Set(staleCredentials.map((c) => c.id));

  const handleDelete = async (id: string) => {
    if (deleteConfirm === id) {
      await removeCredential(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <VaultHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Stale password banner */}
        {staleCredentials.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-yellow-400 text-xl">⚠</span>
            <div>
              <p className="text-yellow-300 text-sm font-medium">
                {staleCredentials.length} password{staleCredentials.length > 1 ? "s" : ""} older than 90 days
              </p>
              <p className="text-yellow-400/60 text-xs">Consider updating them for better security.</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search credentials..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none text-sm"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Credential count */}
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-xs">
            {filtered.length} credential{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Credentials list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="opacity-30">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">
              {search || category !== "all" ? "No matching credentials" : "No credentials yet"}
            </p>
            {!search && category === "all" && (
              <button
                onClick={() => router.push("/vault/add")}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Add your first credential
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((cred) => (
              <div key={cred.id} className="relative">
                <CredentialCard
                  credential={cred}
                  onEdit={(id) => router.push(`/vault/edit/${id}`)}
                  onDelete={handleDelete}
                  isStale={staleIds.has(cred.id)}
                />
                {deleteConfirm === cred.id && (
                  <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center gap-4 z-10">
                    <p className="text-white text-sm">Delete this credential?</p>
                    <button
                      onClick={() => handleDelete(cred.id)}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB - Add button */}
      <button
        onClick={() => router.push("/vault/add")}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 flex items-center justify-center text-white text-2xl transition-all hover:scale-105 active:scale-95 z-40"
      >
        +
      </button>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 bg-gray-900/90 backdrop-blur-lg border-t border-white/5 px-4 py-2 flex justify-around z-30">
        <button className="flex flex-col items-center gap-1 text-blue-400 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span className="text-[10px]">Vault</span>
        </button>
        <button onClick={() => router.push("/vault/generator")} className="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 py-1">
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
