import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { ThemeToggle } from "./ui/ThemeToggle";

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

/* ═══════════════════════════════════════════
   Scroll-driven reveal hook
   ═══════════════════════════════════════════ */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.querySelectorAll(".reveal-up, .reveal-scale, .stagger-children");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ═══════════════════════════════════════════
   Phone Frame with 3D perspective
   ═══════════════════════════════════════════ */
function PhoneFrame({ children, className = "", scale = 1 }: { children: ReactNode; className?: string; scale?: number }) {
  return (
    <div className={`phone-frame mx-auto ${className}`} style={{ width: `min(${280 * scale}px, ${72 * scale}vw)` }}>
      <div
        className="phone-inner rounded-[2.6rem] bg-[#111] phone-glow overflow-hidden border-[2.5px] border-white/[0.08] relative"
        style={{ aspectRatio: "9/19.5" }}
      >
        {/* Dynamic Island */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[34%] h-[26px] bg-black rounded-b-[14px] z-20" />
        {/* Home indicator */}
        <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[32%] h-[4px] bg-white/15 rounded-full z-20" />
        {/* Screen — force dark theme so CSS vars render correctly */}
        <div className="dark absolute inset-[2px] rounded-[2.4rem] overflow-hidden bg-surface text-content">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Production-Accurate Screen Mockups
   ═══════════════════════════════════════════ */

function MockupDashboardChat() {
  return (
    <div className="h-full w-full flex flex-col bg-surface overflow-hidden">
      {/* ── Topbar (exact: Dashboard.tsx header) ── */}
      <header className="flex-shrink-0 px-3 pt-8 pb-1.5 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[9px] font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[6px] tracking-widest uppercase text-content-3 border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">Dashboard</span>
            {/* SubscriptionStatus pill */}
            <span className="text-[5px] tracking-wider uppercase text-green-400 border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 rounded-full">Trial · 5d</span>
          </div>
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-surface-card border border-line text-content-3">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </div>
        </div>
      </header>

      {/* ── Main: Chat box (exact: Dashboard.tsx center area) ── */}
      <main className="flex-1 flex flex-col px-2 pb-0.5 overflow-hidden min-h-0 z-10">
        <div className="flex-1 flex flex-col min-h-0 relative rounded-2xl overflow-hidden bg-surface-up shadow-2xl border border-line">
          {/* Mode toggle (exact: Dashboard.tsx desktop toggle) */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 flex justify-center">
            <div className="bg-surface/80 backdrop-blur-md rounded-full p-0.5 border border-line flex items-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-full bg-accent/10 text-accent shadow-sm">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className="p-1 rounded-full text-content-3">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              </div>
            </div>
          </div>

          {/* Messages (exact: ChatPanel.tsx structure) */}
          <div className="flex-1 min-h-0 overflow-hidden p-2.5 pt-7 flex flex-col gap-2">
            {/* User bubble */}
            <div className="flex flex-col gap-0.5 items-end">
              <span className="text-[5px] tracking-wider uppercase text-content-4 px-0.5">Você</span>
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm bg-surface-card text-[8px] leading-relaxed text-content shadow-sm">
                Adiciona reunião com João amanhã às 14h e me avisa 15 min antes
              </div>
            </div>
            {/* Bot bubble */}
            <div className="flex flex-col gap-0.5 items-start">
              <span className="text-[5px] tracking-wider uppercase text-content-4 px-0.5">Teq</span>
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm bg-surface-card text-[8px] leading-relaxed text-content border border-line shadow-sm">
                Pronto! ✅ Criei a tarefa <strong>"Reunião com João"</strong> para amanhã às 14:00. Vou te avisar 15min antes.
              </div>
            </div>
            {/* User */}
            <div className="flex flex-col gap-0.5 items-end">
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm bg-surface-card text-[8px] leading-relaxed text-content shadow-sm">
                Pesquisa tendências de IA em 2025
              </div>
            </div>
            {/* Bot */}
            <div className="flex flex-col gap-0.5 items-start">
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm bg-surface-card text-[8px] leading-relaxed text-content border border-line shadow-sm">
                Encontrei 3 fontes relevantes. As principais tendências são agentes autônomos, multimodalidade e...
              </div>
            </div>
            {/* User */}
            <div className="flex flex-col gap-0.5 items-end">
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm bg-surface-card text-[8px] leading-relaxed text-content shadow-sm">
                Gera um carrossel sobre produtividade
              </div>
            </div>
            {/* Bot typing */}
            <div className="flex items-start gap-1 opacity-50">
              <div className="px-2.5 py-1.5 rounded-2xl rounded-tl-sm text-[8px] bg-surface-card text-content border border-line shadow-sm italic flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                Gerando 5 imagens...
              </div>
            </div>
          </div>

          {/* Input bar (exact: ChatPanel.tsx input) */}
          <div className="flex-shrink-0 p-2 border-t border-line bg-surface/30 backdrop-blur-md">
            <div className="flex flex-col bg-surface border border-line rounded-xl shadow-inner overflow-hidden">
              <div className="flex items-center gap-0">
                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                  <div className="text-content-4">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </div>
                </div>
                <span className="flex-1 text-[7px] text-content-4 py-1.5">Pergunte alguma coisa...</span>
                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center pr-0.5">
                  <div className="w-5 h-5 flex items-center justify-center text-content-4">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom Tab Bar (exact: Dashboard.tsx mobile tab bar) ── */}
      <div className="flex-shrink-0 bg-surface border-t border-line">
        <div className="flex justify-around items-center h-9 px-2">
          <button className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-content-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <span className="text-[5px] font-medium tracking-wider uppercase">Painéis</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-[5px] font-medium tracking-wider uppercase">Chat</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-content-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function MockupDashboardVoice() {
  return (
    <div className="h-full w-full flex flex-col bg-surface overflow-hidden">
      {/* Topbar */}
      <header className="flex-shrink-0 px-3 pt-8 pb-1.5 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[9px] font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[6px] tracking-widest uppercase text-content-3 border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">Dashboard</span>
          </div>
        </div>
      </header>

      {/* Voice area (exact: Dashboard center area with voice active) */}
      <main className="flex-1 flex flex-col px-2 pb-0.5 overflow-hidden min-h-0 z-10">
        <div className="flex-1 flex flex-col min-h-0 relative rounded-2xl overflow-hidden bg-surface-up shadow-2xl border border-line">
          {/* Gradient bg */}
          <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-accent/20 to-transparent" />

          {/* Mode toggle */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 flex justify-center">
            <div className="bg-surface/80 backdrop-blur-md rounded-full p-0.5 border border-line flex items-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-full text-content-3">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className="p-1 rounded-full bg-accent/10 text-accent shadow-sm">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              </div>
            </div>
          </div>

          {/* Orb */}
          <div className="flex-1 flex items-center justify-center relative z-10">
            <div className="relative">
              <div className="absolute inset-0 -m-10 rounded-full bg-blue-400/[0.04] orb-pulse" />
              <div className="absolute inset-0 -m-6 rounded-full bg-blue-400/[0.06] orb-pulse" style={{ animationDelay: "0.4s" }} />
              <div className="absolute inset-0 -m-3 rounded-full bg-blue-400/[0.08] orb-pulse" style={{ animationDelay: "0.8s" }} />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-300/70 via-blue-400/50 to-blue-600/30 orb-glow orb-pulse" />
              <div className="absolute top-2 left-3 w-6 h-4 rounded-full bg-white/15 blur-sm" />
            </div>
          </div>

          {/* Status text (exact: Dashboard voice status) */}
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-1.5 z-10 pointer-events-none">
            <span className="text-[8px] font-medium tracking-[0.3em] uppercase text-content-2">Ouvindo...</span>
            <div className="flex items-center gap-[1.5px] h-3">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={`vb-${i}`} className="w-[1.5px] rounded-full bg-blue-300/40 voice-bar" style={{ height: `${4 + Math.sin(i * 0.6) * 6 + 2}px`, animationDelay: `${i * 0.06}s` }} />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <div className="flex-shrink-0 bg-surface border-t border-line">
        <div className="flex justify-around items-center h-9 px-2">
          <button className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-content-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <span className="text-[5px] font-medium tracking-wider uppercase">Painéis</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-content-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-[5px] font-medium tracking-wider uppercase">Chat</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-accent">
            <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function MockupDashboardTasks() {
  return (
    <div className="h-full w-full flex flex-col bg-surface overflow-hidden">
      {/* Topbar */}
      <header className="flex-shrink-0 px-3 pt-8 pb-1.5 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[9px] font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[6px] tracking-widest uppercase text-content-3 border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">Dashboard</span>
          </div>
        </div>
      </header>

      {/* Panels (exact: Sidebar.tsx with GlassCard wrappers) */}
      <div className="flex-1 px-2 pb-0.5 flex flex-col gap-1.5 overflow-hidden min-h-0">
        {/* Tasks GlassCard (exact: GlassCard + TasksPanel) */}
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex flex-col p-3 h-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[7px] font-medium tracking-[0.2em] uppercase text-content-2">Tarefas</h2>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-content-3"><polyline points="18 15 12 9 6 15"/></svg>
            </div>
            {/* Add task */}
            <div className="mb-2 flex gap-1">
              <div className="flex-1 min-w-0 bg-surface-card border border-line rounded-lg px-2 py-1 text-[6px] text-content-3">Nova tarefa...</div>
              <div className="w-5 h-5 flex items-center justify-center rounded-lg bg-surface-card border border-line text-content-3 flex-shrink-0">
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              </div>
            </div>
            {/* Tasks */}
            <div className="flex-1 overflow-hidden flex flex-col gap-1.5">
              {[
                { text: "Enviar relatório mensal", time: "16:00" },
                { text: "Ligar para o dentista", time: "17:30" },
                { text: "Revisar proposta comercial", time: "" },
              ].map((t, i) => (
                <div key={`t-${i}`} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border border-line flex-shrink-0" />
                  <span className="text-[6.5px] text-content flex-1 truncate">{t.text}</span>
                  {t.time && <span className="text-[5.5px] text-content-3">{t.time}</span>}
                </div>
              ))}
              <div className="mt-1 pt-1 border-t border-line">
                <h3 className="text-[5.5px] font-medium tracking-wider uppercase text-content-3 mb-1">Concluídas</h3>
                {["Reunião com João", "Comprar presente da Ana"].map((t, i) => (
                  <div key={`d-${i}`} className="flex items-center gap-1.5 mt-1">
                    <div className="w-3 h-3 rounded border border-green-500/30 bg-green-500/10 flex-shrink-0 flex items-center justify-center">
                      <svg width="5" height="5" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="text-[6.5px] text-content-3 line-through truncate">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reminders GlassCard (exact: GlassCard + RemindersPanel) */}
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg overflow-hidden flex-shrink-0">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[7px] font-medium tracking-[0.2em] uppercase text-content-2">Agendamentos</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { text: "Resumo diário de tarefas", type: "Recorrente", color: "purple" as const },
                { text: "Previsão do tempo", type: "Recorrente", color: "purple" as const },
                { text: "Reunião com João", type: "Único", color: "blue" as const },
              ].map((r, i) => (
                <div key={`r-${i}`} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${r.color === "purple" ? "border-purple-500/20 bg-purple-500/10" : "border-blue-500/20 bg-blue-500/10"}`}>
                    <svg width="5" height="5" viewBox="0 0 24 24" fill="none" stroke={r.color === "purple" ? "#a855f7" : "#3b82f6"} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <span className="text-[6.5px] text-content flex-1 truncate">{r.text}</span>
                  <span className={`text-[5px] font-medium tracking-wider px-1 py-0.5 rounded-full border ${r.color === "purple" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>{r.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="flex-shrink-0 bg-surface border-t border-line">
        <div className="flex justify-around items-center h-9 px-2">
          <button className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <span className="text-[5px] font-medium tracking-wider uppercase">Painéis</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-content-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-[5px] font-medium tracking-wider uppercase">Chat</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-content-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function MockupWhatsApp() {
  return (
    <div className="h-full flex flex-col" style={{ background: "#0b141a" }}>
      {/* WA Header */}
      <div className="pt-8 px-2.5 pb-2 flex items-center gap-2" style={{ background: "#1f2c34" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#aebac1" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        <div className="w-6 h-6 rounded-full bg-[#2a3942] flex items-center justify-center">
          <span className="text-[7px] font-bold text-white/60">T</span>
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-[9px] text-[#e9edef]">Agente Teq</span>
          <span className="text-[6px] text-[#8696a0]">online</span>
        </div>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#aebac1" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </div>

      {/* Chat */}
      <div className="flex-1 px-2 py-2.5 flex flex-col gap-1 overflow-hidden" style={{ background: "#0b141a" }}>
        <div className="self-end max-w-[78%] px-2 py-1.5 rounded-lg text-[8px] text-[#e9edef] leading-relaxed" style={{ background: "#005c4b" }}>
          Me manda o resumo das tarefas de hoje
          <span className="text-[6px] text-white/35 float-right ml-1.5 mt-0.5">14:02 ✓✓</span>
        </div>
        <div className="self-start max-w-[82%] px-2 py-1.5 rounded-lg text-[8px] text-[#e9edef] leading-relaxed" style={{ background: "#1f2c34" }}>
          📋 <strong>Resumo do dia</strong><br/><br/>
          ✅ Reunião com João (14h) — concluída<br/>
          ⏳ Enviar relatório mensal (16h)<br/>
          ⏳ Ligar para o dentista (17:30)<br/>
          ⏳ Revisar proposta comercial<br/><br/>
          <span className="text-[#8696a0]">3 pendentes de 4 tarefas.</span>
          <span className="text-[6px] text-white/25 float-right ml-1.5 mt-0.5">14:02</span>
        </div>
        {/* Audio message */}
        <div className="self-end max-w-[70%] px-2 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: "#005c4b" }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="#e9edef"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <div className="flex-1 flex items-center gap-[0.5px]">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={`wa-${i}`} className="w-[1.5px] rounded-full bg-white/35" style={{ height: `${2 + Math.sin(i * 0.5) * 5 + 2}px` }} />
            ))}
          </div>
          <span className="text-[6px] text-white/35">0:04</span>
        </div>
        <div className="self-start max-w-[82%] px-2 py-1.5 rounded-lg text-[8px] text-[#e9edef] leading-relaxed" style={{ background: "#1f2c34" }}>
          Pronto! Agendei lembrete diário às 8h. Todo dia vou te mandar as tarefas + previsão do tempo. 🌤️
          <span className="text-[6px] text-white/25 float-right ml-1.5 mt-0.5">14:03</span>
        </div>
      </div>

      {/* WA Input */}
      <div className="px-1.5 pb-5 pt-1" style={{ background: "#0b141a" }}>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1.5 rounded-full px-2.5 py-1.5" style={{ background: "#1f2c34" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8696a0" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            <span className="flex-1 text-[8px] text-[#8696a0]">Mensagem</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8696a0" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#00a884" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Feature Section (full viewport per feature)
   ═══════════════════════════════════════════ */
const FEATURES = [
  {
    label: "Chat inteligente",
    title: "Converse.\nEle resolve.",
    desc: "Crie tarefas, pesquise na web, gere e edite imagens, publique no blog — tudo numa conversa natural. Envie fotos e o Teq entende o contexto.",
    screen: <MockupDashboardChat />,
    glowColor: "rgba(100, 180, 255, 0.06)",
  },
  {
    label: "Voz ao vivo",
    title: "Fale.\nEle ouve.",
    desc: "Áudio bidirecional nativo com Gemini Live — sem cadeia STT→LLM→TTS. Latência abaixo de 1s, interrupção natural e execução de ferramentas por voz.",
    screen: <MockupDashboardVoice />,
    glowColor: "rgba(140, 120, 255, 0.06)",
  },
  {
    label: "Tarefas & agendamentos",
    title: "Delegue.\nEle executa.",
    desc: "Crie tarefas e agendamentos por voz ou texto. No horário, o agente roda suas instruções e entrega o resultado — na web, no WhatsApp ou em ambos.",
    screen: <MockupDashboardTasks />,
    glowColor: "rgba(100, 255, 180, 0.05)",
  },
  {
    label: "WhatsApp + Slack + Google",
    title: "Um agente.\nTodos os canais.",
    desc: "Web, voz, WhatsApp e Slack integrados. Gmail e Google Agenda conectados. Histórico, memória e tarefas sincronizados entre tudo.",
    screen: <MockupWhatsApp />,
    glowColor: "rgba(0, 168, 132, 0.06)",
  },
];

function FeatureSection({ label, title, desc, screen, glowColor, index }: {
  label: string; title: string; desc: string; screen: ReactNode; glowColor: string; index: number;
}) {
  const isEven = index % 2 === 0;
  return (
    <section className="relative min-h-screen flex items-center py-20 md:py-28 px-5 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none" style={{ background: glowColor }} />
      <div className="section-glow top-0 left-0" />

      <div className={`max-w-6xl mx-auto w-full flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-10 lg:gap-20`}>
        {/* Phone */}
        <div className="w-full lg:w-1/2 flex justify-center reveal-scale" style={{ transitionDelay: "0.1s" }}>
          <div className="animate-float" style={{ animationDelay: `${index * 0.5}s` }}>
            <PhoneFrame scale={1.05}>
              {screen}
            </PhoneFrame>
          </div>
        </div>

        {/* Text */}
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          <div className="reveal-up" style={{ transitionDelay: "0s" }}>
            <p className="text-[11px] md:text-xs tracking-[0.3em] uppercase text-content-3 mb-4">{label}</p>
          </div>
          <div className="reveal-up" style={{ transitionDelay: "0.1s" }}>
            <h3 className="text-4xl md:text-6xl lg:text-7xl font-extralight tracking-tight mb-6 leading-[1.05] whitespace-pre-line">{title}</h3>
          </div>
          <div className="reveal-up" style={{ transitionDelay: "0.2s" }}>
            <p className="text-base md:text-xl text-content-2 font-light leading-relaxed max-w-md mx-auto lg:mx-0">{desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   Bento Feature Cards
   ═══════════════════════════════════════════ */
const BENTO_ITEMS = [
  { icon: "🧠", title: "Memória de longo prazo", desc: "O agente extrai e guarda fatos sobre você automaticamente. Cada conversa fica mais personalizada." },
  { icon: "🎨", title: "Imagens & carrosséis", desc: "Geração e edição de imagens por texto. Carrosséis para Instagram em paralelo, entregues por notificação." },
  { icon: "�", title: "Deep Research", desc: "Pesquisa profunda com múltiplos sub-agentes em paralelo. Resultados sintetizados e salvos na memória." },
  { icon: "📧", title: "Gmail & Google Agenda", desc: "Leia e-mails, consulte e crie eventos no calendário — tudo por conversa. Integração OAuth pronta." },
  { icon: "�", title: "Slack integrado", desc: "Conecte o Teq ao seu workspace Slack. Mesmo assistente, mesmo contexto, mais um canal." },
  { icon: "📝", title: "Blog & conteúdo", desc: "Publique posts no blog por comando. O Teq gera o conteúdo, converte em MDX e faz deploy automático." },
  { icon: "🌤️", title: "Previsão do tempo", desc: "Consulte o tempo de qualquer cidade. Inclua automaticamente na saudação diária." },
  { icon: "⚡", title: "Execução em background", desc: "Imagens, carrosséis e pesquisas rodam em fila persistente. Resultado entregue em tempo real via WebSocket." },
];

/* ═══════════════════════════════════════════
   Main Landing Page
   ═══════════════════════════════════════════ */
export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const containerRef = useReveal();
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  const scrollToShowcase = useCallback(() => {
    document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-surface text-content overflow-x-hidden landing-noise">

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-surface/70 border-b border-line/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 h-12 md:h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-line/60 flex items-center justify-center bg-surface-card/50">
              <span className="text-xs md:text-sm font-light tracking-widest">T</span>
            </div>
            <span className="text-sm md:text-base font-light tracking-[0.25em] uppercase">Teq</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-content-3 hover:text-content transition-colors" />
            <button onClick={onLogin} className="hidden sm:block px-4 py-1.5 text-xs tracking-wider uppercase text-content-2 hover:text-content transition-colors">
              Entrar
            </button>
            <button onClick={onRegister} className="px-3.5 md:px-5 py-1.5 md:py-2 rounded-full bg-content text-surface text-[11px] md:text-xs tracking-wider uppercase font-medium hover:opacity-90 transition-all">
              Criar conta
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-5 pt-20 pb-12 overflow-hidden">
        {/* Glows */}
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] md:w-[800px] md:h-[800px] rounded-full bg-content/[0.025] blur-[120px] hero-glow pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[250px] h-[250px] rounded-full bg-blue-500/[0.03] blur-[80px] pointer-events-none" />

        {/* Text */}
        <div className={`relative z-10 max-w-4xl mx-auto transition-all duration-[1.2s] ease-out ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-line/60 bg-surface-card/40 backdrop-blur-sm text-[10px] md:text-xs tracking-wider uppercase text-content-3 mb-8 transition-all duration-[1.2s] delay-100 ${heroReady ? "opacity-100" : "opacity-0"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Assistente pessoal de IA
          </div>

          <h1 className={`text-[3.5rem] leading-[1.02] md:text-[5.5rem] lg:text-[7.5rem] font-extralight tracking-tight mb-8 transition-all duration-[1.4s] delay-200 ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            Fale.<br className="md:hidden" />
            <span className="gradient-text"> Ele faz.</span>
          </h1>

          <p className={`text-lg md:text-2xl text-content-2 font-light leading-relaxed max-w-2xl mx-auto mb-10 transition-all duration-[1.4s] delay-300 ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            Seu assistente que você aciona por <strong className="text-content font-normal">voz</strong> ou{" "}
            <strong className="text-content font-normal">mensagem</strong> — na web ou no WhatsApp.
          </p>

          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-[1.4s] delay-[400ms] ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <button onClick={onRegister} className="group w-full sm:w-auto px-10 py-4 rounded-full bg-content text-surface text-sm tracking-wider uppercase font-medium hover:opacity-90 transition-all hover:shadow-lg hover:shadow-content/10 hover:scale-[1.02] active:scale-[0.98]">
              Começar agora
              <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
            <button onClick={scrollToShowcase} className="w-full sm:w-auto px-10 py-4 rounded-full border border-line/60 bg-surface/30 backdrop-blur-md text-sm tracking-wider uppercase text-content-2 hover:text-content hover:border-line-strong transition-all hover:scale-[1.02] active:scale-[0.98]">
              Explorar
            </button>
          </div>
        </div>

        {/* Hero phone — half clipped at bottom for dramatic effect */}
        <div className={`relative z-10 mt-12 md:mt-16 mb-[-8rem] md:mb-[-10rem] transition-all duration-[1.6s] delay-500 ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"}`}>
          <PhoneFrame scale={1.15}>
            <MockupDashboardChat />
          </PhoneFrame>
        </div>
      </section>

      {/* ── FEATURE SECTIONS ── */}
      <div id="showcase">
        {FEATURES.map((feat, i) => (
          <FeatureSection key={i} {...feat} index={i} />
        ))}
      </div>

      {/* ── BENTO GRID ── */}
      <section className="py-24 md:py-36 px-5 relative">
        <div className="section-glow top-0 left-0" />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal-up">
            <p className="text-[11px] md:text-xs tracking-[0.3em] uppercase text-content-3 mb-4">Diferenciais</p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extralight tracking-tight">
              Não é chatbot. É co-piloto.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {BENTO_ITEMS.map((item, i) => (
              <div key={i} className="bento-card rounded-2xl md:rounded-3xl border border-line/60 bg-surface-card/30 p-6 md:p-8 backdrop-blur-sm">
                <span className="text-2xl mb-4 block">{item.icon}</span>
                <h4 className="text-base md:text-lg font-medium text-content mb-2">{item.title}</h4>
                <p className="text-sm text-content-3 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="py-24 md:py-36 px-5 relative">
        <div className="section-glow top-0 left-0" />
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14 reveal-up">
            <p className="text-[11px] md:text-xs tracking-[0.3em] uppercase text-content-3 mb-4">Na prática</p>
            <h2 className="text-3xl md:text-5xl font-extralight tracking-tight">
              Você fala. O Teq executa.
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { cmd: '"Adiciona reunião com João amanhã às 14h"', res: "Cria a tarefa, agenda lembrete e te avisa no horário — na web, WhatsApp ou ambos." },
              { cmd: '"Todo dia às 8h me manda tarefas e previsão do tempo"', res: "Agendamento recorrente: o agente roda, compila tudo e entrega o resultado pronto." },
              { cmd: '"Pesquisa tendências de IA em 2025"', res: "Deep Research com múltiplos sub-agentes em paralelo. Resultado sintetizado e salvo na memória." },
              { cmd: '"Gera um carrossel sobre produtividade"', res: "5 imagens geradas em background via Gemini e entregues por notificação em tempo real." },
              { cmd: '"O que tem na minha agenda amanhã?"', res: "Consulta o Google Calendar conectado e lista os compromissos do dia." },
              { cmd: '"Coloca um dragão nessa cena" (com foto)', res: "Edita a imagem enviada com IA e devolve o resultado em segundos." },
            ].map((uc, i) => (
              <div key={i} className="reveal-up" style={{ transitionDelay: `${i * 0.06}s` }}>
                <div className="group rounded-2xl border border-line/50 bg-surface-card/20 backdrop-blur-sm p-5 md:p-6 hover:border-line-strong hover:bg-surface-card/40 transition-all duration-500">
                  <p className="text-sm font-mono text-content mb-1.5 tracking-tight">{uc.cmd}</p>
                  <p className="text-sm text-content-3 leading-relaxed">{uc.res}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-28 md:py-40 px-5 relative overflow-hidden">
        <div className="section-glow top-0 left-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-content/[0.02] blur-[100px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10 reveal-up">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extralight tracking-tight mb-6 leading-tight">
            Seu co-piloto<br />está pronto.
          </h2>
          <p className="text-base md:text-xl text-content-2 font-light leading-relaxed mb-10 max-w-xl mx-auto">
            7 dias grátis. Sem cartão para começar. Cancele quando quiser.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onRegister} className="group w-full sm:w-auto px-10 py-4 rounded-full bg-content text-surface text-sm tracking-wider uppercase font-medium hover:opacity-90 transition-all hover:shadow-lg hover:shadow-content/10 hover:scale-[1.02] active:scale-[0.98]">
              Criar minha conta
              <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
            <button onClick={onLogin} className="w-full sm:w-auto px-10 py-4 rounded-full border border-line/60 text-sm tracking-wider uppercase text-content-2 hover:text-content transition-all hover:scale-[1.02] active:scale-[0.98]">
              Já tenho conta
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-line/40 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-content-3">
          <div className="flex items-center gap-2">
            <span className="tracking-[0.2em] uppercase font-medium">Teq</span>
            <span className="text-content-4">·</span>
            <span>Assistente pessoal de IA</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="/privacy" className="hover:text-content transition-colors">Privacidade</a>
            <a href="/terms" className="hover:text-content transition-colors">Termos</a>
            <a href="mailto:contato@diarioteq.com" className="hover:text-content transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
