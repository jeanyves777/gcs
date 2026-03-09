"use client";

export function VaultDemo() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Phone frame */}
      <div className="relative bg-[#0A1929] rounded-[2.5rem] border-4 border-gray-700 shadow-2xl shadow-blue-500/10 overflow-hidden aspect-[9/19]">
        {/* Status bar */}
        <div className="h-8 bg-gray-900/80 flex items-center justify-between px-6">
          <span className="text-white/40 text-[10px]">9:41</span>
          <div className="flex gap-1">
            <div className="w-3 h-2 rounded-sm bg-white/30" />
            <div className="w-3 h-2 rounded-sm bg-white/30" />
            <div className="w-5 h-2 rounded-sm bg-green-400/60" />
          </div>
        </div>

        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl" />

        {/* App content */}
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center vault-demo-pulse">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span className="text-white font-semibold text-sm">GCS Vault</span>
            </div>
            <div className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-[9px]">Unlocked</div>
          </div>

          {/* Search bar */}
          <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2 vault-demo-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="w-3 h-3 rounded-full border border-white/20" />
            <span className="text-white/20 text-xs">Search credentials...</span>
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 vault-demo-fade-in" style={{ animationDelay: "0.8s" }}>
            <div className="px-2 py-1 rounded-md bg-blue-600 text-white text-[9px]">All</div>
            <div className="px-2 py-1 rounded-md bg-white/5 text-white/40 text-[9px]">Social</div>
            <div className="px-2 py-1 rounded-md bg-white/5 text-white/40 text-[9px]">Finance</div>
            <div className="px-2 py-1 rounded-md bg-white/5 text-white/40 text-[9px]">Work</div>
          </div>

          {/* Credential cards */}
          <div className="space-y-2">
            {/* Card 1 */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 vault-demo-slide-up" style={{ animationDelay: "1s" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-red-500/20 flex items-center justify-center text-[8px] text-red-400 font-bold">G</div>
                <div>
                  <p className="text-white text-xs font-medium">Google</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">email</span>
                </div>
              </div>
              <div className="bg-black/20 rounded-md px-2 py-1.5 flex justify-between items-center">
                <div>
                  <p className="text-white/30 text-[8px]">Password</p>
                  <p className="text-white/70 text-[10px] font-mono vault-demo-type">••••••••••••</p>
                </div>
                <div className="flex gap-1">
                  <div className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[8px]">Show</div>
                  <div className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[8px]">Copy</div>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 vault-demo-slide-up" style={{ animationDelay: "1.3s" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-gray-500/20 flex items-center justify-center text-[8px] text-gray-300 font-bold">GH</div>
                <div>
                  <p className="text-white text-xs font-medium">GitHub</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300">development</span>
                </div>
              </div>
              <div className="bg-black/20 rounded-md px-2 py-1.5 flex justify-between items-center">
                <div>
                  <p className="text-white/30 text-[8px]">Password</p>
                  <p className="text-white/70 text-[10px] font-mono">••••••••••••</p>
                </div>
                <div className="flex gap-1">
                  <div className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[8px]">Show</div>
                  <div className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[8px]">Copy</div>
                </div>
              </div>
            </div>

            {/* Card 3 - stale warning */}
            <div className="bg-white/5 rounded-xl p-3 border border-yellow-500/20 vault-demo-slide-up" style={{ animationDelay: "1.6s" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-green-500/20 flex items-center justify-center text-[8px] text-green-400 font-bold">$</div>
                <div>
                  <p className="text-white text-xs font-medium">Chase Bank</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">finance</span>
                </div>
              </div>
              <div className="bg-yellow-500/5 rounded-md px-2 py-1 flex items-center gap-1 vault-demo-pulse-slow">
                <span className="text-yellow-400 text-[8px]">⚠</span>
                <span className="text-yellow-400/80 text-[8px]">Password 93 days old — update recommended</span>
              </div>
            </div>
          </div>

          {/* FAB */}
          <div className="absolute bottom-16 right-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg shadow-lg shadow-blue-600/30 vault-demo-bounce">
              +
            </div>
          </div>

          {/* Bottom nav */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 border-t border-white/5 px-4 py-2 flex justify-around">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-4 h-4 rounded-sm bg-blue-400/20" />
              <span className="text-blue-400 text-[7px]">Vault</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-4 h-4 rounded-sm bg-white/5" />
              <span className="text-white/30 text-[7px]">Generate</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-4 h-4 rounded-sm bg-white/5" />
              <span className="text-white/30 text-[7px]">Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating encryption indicators */}
      <div className="absolute -left-8 top-1/4 vault-demo-float-left">
        <div className="bg-blue-500/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-500/20 text-[10px] text-blue-300">
          AES-256-GCM
        </div>
      </div>
      <div className="absolute -right-6 top-1/3 vault-demo-float-right">
        <div className="bg-green-500/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-green-500/20 text-[10px] text-green-300">
          PBKDF2 600K
        </div>
      </div>
      <div className="absolute -left-4 bottom-1/3 vault-demo-float-left" style={{ animationDelay: "1s" }}>
        <div className="bg-purple-500/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/20 text-[10px] text-purple-300">
          Zero-Knowledge
        </div>
      </div>
      <div className="absolute -right-10 bottom-1/4 vault-demo-float-right" style={{ animationDelay: "1.5s" }}>
        <div className="bg-yellow-500/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-yellow-500/20 text-[10px] text-yellow-300">
          Local Only
        </div>
      </div>
    </div>
  );
}
