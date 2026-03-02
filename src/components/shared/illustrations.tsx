/**
 * Hero Illustrations — polished HTML/CSS UI mockups.
 * Server components — pure CSS animations, no Framer Motion inside.
 * Animation keyframes are defined in globals.css (.gcs-float, .gcs-blink, etc.)
 */
import type { ReactNode } from "react";

// ─── Shared helpers ─────────────────────────────────────────────────────────

function WindowChrome({ title }: { title: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-4 py-3 border-b flex-shrink-0"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28CA41" }} />
      <span className="ml-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{title}</span>
    </div>
  );
}

function StatusDot({ color = "#22C55E", pulse }: { color?: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex flex-shrink-0">
      <span className="w-2 h-2 rounded-full block" style={{ background: color }} />
      {pulse && (
        <span className="absolute inset-0 rounded-full gcs-ping" style={{ background: color }} />
      )}
    </span>
  );
}

function ProgressBar({ pct, color = "var(--brand-primary)" }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function FloatingCard({
  children,
  className = "",
  delay = "1",
}: {
  children: ReactNode;
  className?: string;
  delay?: "1" | "2" | "3";
}) {
  return (
    <div
      className={`absolute rounded-xl px-3 py-2.5 shadow-xl ${className} gcs-float-${delay}`}
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

function Glow() {
  return (
    <div
      className="absolute -inset-6 rounded-3xl opacity-[0.12] blur-3xl pointer-events-none"
      style={{ background: "radial-gradient(ellipse at center, var(--brand-primary) 0%, transparent 70%)" }}
    />
  );
}

// ─── 1. Home — Portal Dashboard ─────────────────────────────────────────────

export function HeroIllustration() {
  const servers = [
    { name: "prod-web-01", cpu: 76, warn: true },
    { name: "prod-db-01",  cpu: 43, warn: false },
    { name: "api-gateway", cpu: 28, warn: false },
  ];

  return (
    <div className="relative w-full max-w-[460px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="GCS Client Portal — Dashboard" />
        <div className="grid grid-cols-3 gap-2 p-4 border-b" style={{ borderColor: "var(--border)" }}>
          {[
            { label: "Uptime",   value: "99.9%",   accent: "#22C55E" },
            { label: "Projects", value: "4 active", accent: "var(--brand-primary)" },
            { label: "Tickets",  value: "2 open",   accent: "#F59E0B" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: accent }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Infrastructure</p>
          <div className="space-y-2.5">
            {servers.map(({ name, cpu, warn }) => (
              <div key={name} className="flex items-center gap-2.5">
                <StatusDot color={warn ? "#F59E0B" : "#22C55E"} pulse={!warn} />
                <span className="text-xs font-mono w-[100px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{name}</span>
                <ProgressBar pct={cpu} color={warn ? "#F59E0B" : "var(--brand-primary)"} />
                <span className="text-[10px] w-7 text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>{cpu}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Recent Activity</p>
            <span className="text-[10px] font-medium" style={{ color: "var(--brand-primary)" }}>View all →</span>
          </div>
          {[
            { msg: "Ticket #42 resolved",  time: "2h ago" },
            { msg: "Deployment completed", time: "5h ago" },
          ].map(({ msg, time }) => (
            <div key={msg} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--brand-primary)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{msg}</span>
              </div>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{time}</span>
            </div>
          ))}
        </div>
      </div>
      <FloatingCard className="-top-3 -right-4" delay="2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.15)" }}>
            <StatusDot color="#22C55E" />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>All systems operational</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Last check: just now</p>
          </div>
        </div>
      </FloatingCard>
      <div className="absolute -bottom-3 -left-4 rounded-xl px-4 py-2 shadow-lg gcs-float-3" style={{ background: "var(--brand-primary)" }}>
        <p className="text-xs font-semibold text-white">Secured &amp; Monitored 24/7</p>
      </div>
    </div>
  );
}

// ─── 2. About ───────────────────────────────────────────────────────────────

export function AboutIllustration() {
  const team = [
    { initials: "KM", bg: "#1565C0" },
    { initials: "SR", bg: "#0288D1" },
    { initials: "PL", bg: "#00897B" },
    { initials: "AJ", bg: "#5E35B1" },
    { initials: "TC", bg: "#E53935" },
    { initials: "NB", bg: "#F4511E" },
  ];

  return (
    <div className="relative w-full max-w-[420px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="About GCS" />
        <div className="p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Our Team</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {team.map(({ initials, bg }) => (
              <div key={initials} className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: bg }}>
                {initials}
              </div>
            ))}
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
              +8
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "2019", label: "Founded" },
              { value: "50+",  label: "Clients" },
              { value: "99.9%",label: "SLA" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                <p className="text-base font-black" style={{ color: "var(--brand-primary)" }}>{value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <FloatingCard className="-bottom-4 -right-4" delay="2">
        <div className="flex items-center gap-1.5">
          <StatusDot color="#22C55E" />
          <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Remote-First · Worldwide</p>
        </div>
      </FloatingCard>
    </div>
  );
}

// ─── 3. Services overview ────────────────────────────────────────────────────

export function ServicesIllustration() {
  const services = [
    { label: "Managed IT Services", color: "#1565C0" },
    { label: "Custom Software Dev",  color: "#0288D1" },
    { label: "Enterprise Solutions", color: "#5E35B1" },
    { label: "Cloud Management",     color: "#00897B" },
    { label: "Cybersecurity",        color: "#E53935" },
  ];

  return (
    <div className="relative w-full max-w-[440px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="GCS Services" />
        <div className="p-4 space-y-2">
          {services.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs font-medium flex-1" style={{ color: "var(--text-primary)" }}>{label}</span>
              <span className="text-[10px] font-semibold" style={{ color }}>Active →</span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, var(--brand-primary), #42A5F5)" }}>
            <p className="text-xs font-semibold text-white">One team, complete coverage</p>
            <p className="text-[10px] text-white/70 mt-0.5">IT operations + custom software under one roof</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Managed IT ──────────────────────────────────────────────────────────

export function ManagedITIllustration() {
  const servers = [
    { name: "prod-web-01",     cpu: 34, mem: 58, warn: false },
    { name: "prod-db-primary", cpu: 67, mem: 72, warn: false },
    { name: "api-gateway",     cpu: 12, mem: 31, warn: false },
    { name: "backup-01",       cpu: 89, mem: 45, warn: true  },
  ];

  return (
    <div className="relative w-full max-w-[460px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="Infrastructure Monitor" />
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>4 Servers Monitored</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>3 healthy · 1 warning</p>
          </div>
          <div className="px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ background: "#22C55E" }}>Operational</div>
        </div>
        <div className="p-4 space-y-4">
          {servers.map(({ name, cpu, mem, warn }) => {
            const c = warn ? "#F59E0B" : "#22C55E";
            return (
              <div key={name}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusDot color={c} pulse={!warn} />
                  <span className="text-xs font-mono flex-1" style={{ color: "var(--text-secondary)" }}>{name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: warn ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.12)", color: c }}>
                    {warn ? "warning" : "online"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-4">
                  {[{ label: "CPU", v: cpu, c: cpu > 70 ? "#F59E0B" : "var(--brand-primary)" }, { label: "MEM", v: mem, c: mem > 70 ? "#F59E0B" : "var(--text-muted)" }].map(({ label, v, c: col }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</span>
                        <span className="text-[10px] font-semibold" style={{ color: col }}>{v}%</span>
                      </div>
                      <ProgressBar pct={v} color={col} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t text-center" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Uptime <span style={{ color: "#22C55E", fontWeight: 600 }}>99.97%</span> · 24/7 alerting active
          </p>
        </div>
      </div>
      <FloatingCard className="-bottom-4 -right-3" delay="2">
        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          Response time <span style={{ color: "#22C55E" }}>&lt; 15 min</span>
        </p>
      </FloatingCard>
    </div>
  );
}

// ─── 5. Software Dev ────────────────────────────────────────────────────────

export function SoftwareDevIllustration() {
  return (
    <div className="relative w-full max-w-[480px] mx-auto mt-6 mb-12">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "#0A1929", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28CA41" }} />
          <span className="ml-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>workflow.ts — GCS Dev Platform</span>
        </div>
        <div className="p-4 font-mono text-xs leading-relaxed space-y-1">
          {[
            [{ t: "import ",      c: "#C792EA" }, { t: "{ buildSolution } ",       c: "#EEFFFF" }, { t: "from ",          c: "#C792EA" }, { t: "'@gcs/core'", c: "#C3E88D" }],
            [],
            [{ t: "async ",       c: "#C792EA" }, { t: "function ",               c: "#82AAFF" }, { t: "optimizeWorkflow", c: "#FFCB6B" }, { t: "(data) {",    c: "#EEFFFF" }],
            [{ t: "  const ",     c: "#C792EA" }, { t: "insights ",               c: "#EEFFFF" }, { t: "= ",             c: "#89DDFF" }, { t: "await ",       c: "#C792EA" }, { t: "analyze(data)", c: "#82AAFF" }],
            [{ t: "  return ",    c: "#C792EA" }, { t: "buildSolution(insights)", c: "#EEFFFF" }],
            [{ t: "}",            c: "#EEFFFF" }],
          ].map((line, lineIdx) => (
            <div key={lineIdx} className="flex gap-4">
              <span className="w-4 text-right select-none flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{lineIdx + 1}</span>
              <span>
                {line.map((tok, i) => (
                  <span key={i} style={{ color: tok.c }}>{tok.t}</span>
                ))}
                {lineIdx === 3 && (
                  <span className="inline-block w-[2px] h-[13px] ml-0.5 align-middle gcs-cursor" style={{ background: "#42A5F5" }} />
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-[10px]" style={{ background: "rgba(21,101,192,0.7)", color: "rgba(255,255,255,0.8)" }}>
          <span>TypeScript · 0 errors</span>
          <span>Ln 4, Col 36</span>
        </div>
      </div>
      <FloatingCard className="-bottom-4 -left-4" delay="2">
        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Latest commit</p>
        <p className="text-xs font-semibold font-mono" style={{ color: "var(--brand-primary)" }}>feat: optimize workflow</p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>main · 2 min ago</p>
      </FloatingCard>
      <FloatingCard className="-top-3 -right-3" delay="3">
        <div className="flex items-center gap-1.5">
          <StatusDot color="#22C55E" />
          <p className="text-xs font-semibold" style={{ color: "#22C55E" }}>All tests passing</p>
        </div>
      </FloatingCard>
    </div>
  );
}

// ─── 6. Enterprise ──────────────────────────────────────────────────────────

export function EnterpriseIllustration() {
  const modules = [
    { label: "ERP System",     color: "#1565C0", status: "Connected" },
    { label: "CRM Platform",   color: "#0288D1", status: "Connected" },
    { label: "Data Warehouse", color: "#5E35B1", status: "Syncing"   },
    { label: "Billing Engine", color: "#00897B", status: "Connected" },
    { label: "Workflow Mgr",   color: "#F57C00", status: "Connected" },
  ];

  return (
    <div className="relative w-full max-w-[440px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="Enterprise Integration Hub" />
        <div className="flex flex-col items-center py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "var(--brand-primary)" }}>
            <span className="text-white text-sm font-black">GCS</span>
          </div>
          <p className="text-xs font-semibold mt-2" style={{ color: "var(--text-secondary)" }}>Central Integration Hub</p>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusDot color="#22C55E" pulse />
            <span className="text-[10px]" style={{ color: "#22C55E" }}>5 services connected</span>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {modules.map(({ label, color, status }) => (
            <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs font-medium flex-1" style={{ color: "var(--text-primary)" }}>{label}</span>
              <div className="flex items-center gap-1">
                <StatusDot color={status === "Syncing" ? "#F59E0B" : "#22C55E"} />
                <span className="text-[10px]" style={{ color: status === "Syncing" ? "#F59E0B" : "#22C55E" }}>{status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <FloatingCard className="-bottom-3 -right-3" delay="2">
        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          Data in sync · <span style={{ color: "#22C55E" }}>99.9% accuracy</span>
        </p>
      </FloatingCard>
    </div>
  );
}

// ─── 7. Cloud ───────────────────────────────────────────────────────────────

export function CloudIllustration() {
  const providers = [
    { name: "AWS",   color: "#FF9900", resources: "48 instances", cost: "$2,840/mo", savings: "↓ 22%" },
    { name: "Azure", color: "#0089D6", resources: "31 instances", cost: "$1,920/mo", savings: "↓ 18%" },
    { name: "GCP",   color: "#4285F4", resources: "17 instances", cost: "$980/mo",  savings: "↓ 31%" },
  ];

  return (
    <div className="relative w-full max-w-[440px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="Multi-Cloud Manager" />
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Monthly Spend</p>
            <p className="text-xl font-black" style={{ color: "var(--brand-primary)" }}>$5,740<span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>/mo</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>vs last month</p>
            <p className="text-lg font-black" style={{ color: "#22C55E" }}>↓ 24%</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {providers.map(({ name, color, resources, cost, savings }) => (
            <div key={name} className="rounded-xl p-3" style={{ background: "var(--bg-secondary)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white" style={{ background: color }}>
                    {name[0]}
                  </div>
                  <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{name}</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: "#22C55E" }}>{savings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{resources}</span>
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{cost}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <FloatingCard className="-bottom-3 -left-3" delay="2">
        <div className="flex items-center gap-1.5">
          <StatusDot color="#22C55E" pulse />
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Auto-scaling active</p>
        </div>
      </FloatingCard>
    </div>
  );
}

// ─── 8. Cybersecurity ───────────────────────────────────────────────────────

export function CybersecurityIllustration() {
  const checks = [
    { label: "Firewall",            status: "Protected",  ok: true },
    { label: "Endpoint Security",   status: "Active",     ok: true },
    { label: "Patch Level",         status: "Up to date", ok: true },
    { label: "Vulnerability Scan",  status: "0 critical", ok: true },
    { label: "MFA Enforcement",     status: "Enabled",    ok: true },
  ];

  return (
    <div className="relative w-full max-w-[440px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="Security Dashboard" />
        <div className="flex items-center gap-6 p-5 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          <div className="flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full flex flex-col items-center justify-center"
              style={{ background: "conic-gradient(#22C55E 0% 94%, var(--bg-tertiary) 94% 100%)", padding: 3 }}
            >
              <div className="w-full h-full rounded-full flex flex-col items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
                <p className="text-xl font-black leading-none" style={{ color: "#22C55E" }}>94</p>
                <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>/ 100</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Security Score</p>
            <p className="text-xs mt-0.5" style={{ color: "#22C55E" }}>Excellent</p>
            <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>Last scan: 4 hours ago</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {checks.map(({ label, status, ok }) => (
            <div key={label} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}>
                  <span className="text-[10px]" style={{ color: ok ? "#22C55E" : "#EF4444" }}>{ok ? "✓" : "✗"}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{label}</span>
              </div>
              <span className="text-[10px] font-semibold" style={{ color: ok ? "#22C55E" : "#EF4444" }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
      <FloatingCard className="-bottom-3 -right-3" delay="2">
        <div className="flex items-center gap-1.5">
          <StatusDot color="#22C55E" pulse />
          <p className="text-xs font-semibold" style={{ color: "#22C55E" }}>No active threats</p>
        </div>
      </FloatingCard>
    </div>
  );
}

// ─── 9. Portfolio ───────────────────────────────────────────────────────────

export function PortfolioIllustration() {
  const projects = [
    { name: "RetailOS",        type: "POS Platform",    color: "#1565C0", done: true  },
    { name: "HealthTrack Pro", type: "Patient Portal",  color: "#00897B", done: true  },
    { name: "FreightSync",     type: "Logistics SaaS",  color: "#5E35B1", done: true  },
    { name: "FinDash 2.0",     type: "Analytics Suite", color: "#F57C00", done: false },
  ];

  return (
    <div className="relative w-full max-w-[440px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="GCS Portfolio" />
        <div className="p-4 grid grid-cols-2 gap-3">
          {projects.map(({ name, type, color, done }) => (
            <div key={name} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="h-14 flex items-center justify-center" style={{ background: `${color}18` }}>
                <p className="text-xs font-black" style={{ color }}>{name}</p>
              </div>
              <div className="p-3" style={{ background: "var(--bg-secondary)" }}>
                <p className="text-[10px] font-medium" style={{ color: "var(--text-primary)" }}>{type}</p>
                <div className="mt-1.5">
                  {done ? (
                    <span className="text-[9px] font-semibold" style={{ color: "#22C55E" }}>✓ Live</span>
                  ) : (
                    <span className="text-[9px] font-semibold" style={{ color: "#F59E0B" }}>In Progress</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <FloatingCard className="-bottom-3 -right-3" delay="2">
        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          <span style={{ color: "var(--brand-primary)" }}>50+</span> projects delivered
        </p>
      </FloatingCard>
    </div>
  );
}

// ─── 10. Blog ───────────────────────────────────────────────────────────────

export function BlogIllustration() {
  const articles = [
    { title: "5 Signs Your Business Needs Managed IT",  tag: "Managed IT", read: "6 min" },
    { title: "Cloud Migration: A Practical Checklist",  tag: "Cloud",      read: "8 min" },
    { title: "Zero Trust Security for SMBs",            tag: "Security",   read: "5 min" },
  ];

  return (
    <div className="relative w-full max-w-[440px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="GCS Blog" />
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, var(--brand-primary), #42A5F5)" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>Featured</span>
            <p className="text-sm font-bold text-white mt-1 leading-snug">How GCS Reduced IT Downtime by 94% for a Mid-Sized Retailer</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>Case Study · 10 min read</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {articles.map(({ title, tag, read }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: "var(--bg-tertiary)" }} />
              <div className="flex-1">
                <p className="text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(21,101,192,0.12)", color: "var(--brand-primary)" }}>{tag}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{read}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 11. Contact ────────────────────────────────────────────────────────────

export function ContactIllustration() {
  return (
    <div className="relative w-full max-w-[400px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="GCS Support Chat" />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "var(--brand-primary)" }}>GCS</div>
            <div className="rounded-2xl rounded-tl-none p-3 max-w-[80%]" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-xs" style={{ color: "var(--text-primary)" }}>Hi! How can we help you today? We typically respond within 1 business day.</p>
              <p className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>GCS Support · now</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 flex-row-reverse">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>U</div>
            <div className="rounded-2xl rounded-tr-none p-3 max-w-[80%] text-white" style={{ background: "var(--brand-primary)" }}>
              <p className="text-xs">We need managed IT for our 50-person team.</p>
              <p className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>Just now</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "var(--brand-primary)" }}>GCS</div>
            <div className="rounded-2xl rounded-tl-none p-3" style={{ background: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-1">
                {[0, 0.3, 0.6].map((d, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full gcs-blink" style={{ background: "var(--text-muted)", animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t p-3 flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <div className="flex-1 rounded-xl px-3 py-2 text-xs" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>Type your message…</div>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--brand-primary)" }}>
            <span className="text-white text-xs">→</span>
          </div>
        </div>
      </div>
      <FloatingCard className="-bottom-3 -right-3" delay="2">
        <div className="flex items-center gap-1.5">
          <StatusDot color="#22C55E" pulse />
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Response &lt; 1 business day</p>
        </div>
      </FloatingCard>
    </div>
  );
}

// ─── 12. Get a Quote ────────────────────────────────────────────────────────

export function QuoteIllustration() {
  const options = [
    { label: "Managed IT Services", price: "From $499/mo", color: "#1565C0", selected: true  },
    { label: "Custom Software",     price: "From $8,000",  color: "#5E35B1", selected: false },
    { label: "Cloud Management",    price: "From $299/mo", color: "#00897B", selected: false },
  ];

  return (
    <div className="relative w-full max-w-[420px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="Request a Quote" />
        <div className="flex items-center gap-0 px-6 pt-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
          {["Service", "Details", "Review"].map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: i === 0 ? "var(--brand-primary)" : "var(--bg-tertiary)", color: i === 0 ? "white" : "var(--text-muted)" }}>
                {i + 1}
              </div>
              <span className="ml-1.5 text-[10px] font-medium" style={{ color: i === 0 ? "var(--text-primary)" : "var(--text-muted)" }}>{step}</span>
              {i < 2 && <div className="flex-1 h-px mx-2" style={{ background: "var(--border)" }} />}
            </div>
          ))}
        </div>
        <div className="p-4 space-y-2.5">
          {options.map(({ label, price, color, selected }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: selected ? `${color}10` : "var(--bg-secondary)", border: `1.5px solid ${selected ? color : "transparent"}` }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: `2px solid ${selected ? color : "var(--border)"}`, background: selected ? color : "transparent" }}>
                {selected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                <p className="text-[10px]" style={{ color }}>{price}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <div className="w-full py-2.5 rounded-xl text-center text-xs font-semibold text-white" style={{ background: "var(--brand-primary)" }}>
            Get Free Estimate →
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 13. Careers ────────────────────────────────────────────────────────────

export function CareersIllustration() {
  const jobs = [
    { title: "Senior DevOps Engineer", type: "Full-time", loc: "Remote", hot: true  },
    { title: "Full-Stack Developer",   type: "Full-time", loc: "Remote", hot: true  },
    { title: "IT Support Specialist",  type: "Full-time", loc: "Hybrid", hot: false },
  ];

  return (
    <div className="relative w-full max-w-[440px] mx-auto mt-6 mb-10">
      <Glow />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl gcs-float-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WindowChrome title="GCS Careers" />
        <div className="grid grid-cols-3 gap-2 p-4 border-b" style={{ borderColor: "var(--border)" }}>
          {[
            { value: "14",   label: "Open roles" },
            { value: "100%", label: "Remote-OK" },
            { value: "4.8★", label: "Glassdoor" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center p-2.5 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-sm font-black" style={{ color: "var(--brand-primary)" }}>{value}</p>
              <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>
        <div className="p-4 space-y-2.5">
          {jobs.map(({ title, type, loc, hot }) => (
            <div key={title} className="p-3 rounded-xl" style={{ background: "var(--bg-secondary)", border: `1px solid ${hot ? "rgba(21,101,192,0.2)" : "transparent"}` }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{title}</p>
                {hot && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(21,101,192,0.12)", color: "var(--brand-primary)" }}>Hiring</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{type}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{loc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <div className="w-full py-2.5 rounded-xl text-center text-xs font-semibold text-white" style={{ background: "var(--brand-primary)" }}>
            View all open positions →
          </div>
        </div>
      </div>
    </div>
  );
}
