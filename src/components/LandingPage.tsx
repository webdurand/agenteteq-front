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
   Sticky scroll progress hook
   ═══════════════════════════════════════════ */
function useStickyScrollProgress(sectionRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => { isVisibleRef.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    io.observe(el);

    const onScroll = () => {
      if (!isVisibleRef.current) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const totalScrollable = rect.height - viewportH;
      if (totalScrollable <= 0) return;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / totalScrollable));
      setProgress(p);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [sectionRef]);

  return progress;
}

/* ═══════════════════════════════════════════
   Mouse 3D tilt hook
   ═══════════════════════════════════════════ */
function useMouseTilt(ref: React.RefObject<HTMLElement | null>, intensity = 12) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetX = (e.clientX - cx) / (rect.width / 2);
      targetY = (e.clientY - cy) / (rect.height / 2);
    };

    const onLeave = () => { targetX = 0; targetY = 0; };

    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      el.style.transform = `perspective(1200px) rotateY(${currentX * intensity}deg) rotateX(${-currentY * intensity}deg)`;
      rafId = requestAnimationFrame(animate);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    rafId = requestAnimationFrame(animate);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, [ref, intensity]);
}

/* ═══════════════════════════════════════════
   Kinetic Text — character-level animation
   ═══════════════════════════════════════════ */
function KineticText({ text, className = "", charClassName = "", ready, delay = 0 }: { text: string; className?: string; charClassName?: string; ready: boolean; delay?: number }) {
  return (
    <span className={className}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className={`kinetic-char ${charClassName}`}
          style={{
            transitionDelay: `${delay + i * 40}ms`,
            transform: ready ? "translateY(0) rotateX(0)" : "translateY(110%) rotateX(-80deg)",
            opacity: ready ? 1 : 0,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════
   Cycling Text — rotates through words
   ═══════════════════════════════════════════ */
const HERO_VERBS = ["Ele faz.", "Ele cria.", "Ele agenda.", "Ele monitora.", "Ele lembra.", "Ele pesquisa.", "Ele resolve."];

function CyclingText({ ready, delay = 0 }: { ready: boolean; delay?: number }) {
  const [index, setIndex] = useState(0);
  // "entering" = animate in from below, "visible" = fully shown, "exiting" = animate out upward, "swapping" = hidden, about to swap
  const [phase, setPhase] = useState<"entering" | "visible" | "exiting" | "swapping">("entering");

  useEffect(() => {
    if (!ready) return;
    // After kinetic entrance finishes, mark as visible
    const enterTimer = setTimeout(() => setPhase("visible"), delay + 1200);
    return () => clearTimeout(enterTimer);
  }, [ready, delay]);

  useEffect(() => {
    if (phase !== "visible") return;
    // Schedule next exit
    const timer = setTimeout(() => setPhase("exiting"), 2800);
    return () => clearTimeout(timer);
  }, [phase, index]);

  useEffect(() => {
    if (phase !== "exiting") return;
    // After exit animation, swap word
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % HERO_VERBS.length);
      setPhase("swapping");
    }, 500);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "swapping") return;
    // After React paints the new word at its hidden position, trigger entrance
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setPhase("entering");
        // Mark visible after entrance animation
        setTimeout(() => setPhase("visible"), 600);
      });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [phase]);

  const word = HERO_VERBS[index];
  const isShown = phase === "entering" || phase === "visible";
  const isInitial = !ready;

  return (
    <span className="inline-flex" style={{ verticalAlign: "baseline" }}>
      {word.split("").map((char, i) => (
        <span
          key={`${index}-${i}`}
          className={`kinetic-char gradient-text-hero${char === " " ? " !w-[0.3em]" : ""}`}
          style={{
            transitionDelay: (() => {
              if (isInitial) return `${delay + i * 40}ms`;
              if (phase === "exiting") return `${(word.length - 1 - i) * 25}ms`;
              if (phase === "swapping") return "0ms";
              return `${i * 30}ms`; // entering / visible
            })(),
            transitionDuration: phase === "swapping" ? "0ms" : undefined,
            transform: isInitial
              ? "translateY(110%) rotateX(-80deg)"
              : isShown
                ? "translateY(0) rotateX(0)"
                : phase === "exiting"
                  ? "translateY(-100%) rotateX(40deg)"
                  : "translateY(100%) rotateX(-40deg)", // swapping: start position for next entrance
            opacity: isInitial ? 0 : isShown ? 1 : 0,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════
   Phone Frame with 3D perspective
   ═══════════════════════════════════════════ */
function PhoneFrame({ children, className = "", scale = 1 }: { children: ReactNode; className?: string; scale?: number }) {
  return (
    <div
      className={`phone-frame mx-auto ${className}`}
      style={{
        width: `min(${280 * scale}px, ${72 * scale}vw, calc(65vh * 9 / 19.5))`,
      }}
    >
      <div
        className="phone-inner rounded-[2.6rem] bg-[#111] phone-glow overflow-hidden border-[2.5px] border-white/[0.08] relative"
        style={{ aspectRatio: "9/19.5" }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[34%] h-[26px] bg-black rounded-b-[14px] z-20" />
        <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[32%] h-[4px] bg-white/15 rounded-full z-20" />
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
      <header className="flex-shrink-0 px-3 pt-8 pb-1.5 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[9px] font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[6px] tracking-widest uppercase text-content-3 border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">Dashboard</span>
            <span className="text-[5px] tracking-wider uppercase text-green-400 border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 rounded-full">Trial · 5d</span>
          </div>
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-surface-card border border-line text-content-3">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col px-2 pb-0.5 overflow-hidden min-h-0 z-10">
        <div className="flex-1 flex flex-col min-h-0 relative rounded-2xl overflow-hidden bg-surface-up shadow-2xl border border-line">
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
          <div className="flex-1 min-h-0 overflow-hidden p-2.5 pt-7 flex flex-col gap-2">
            <div className="flex flex-col gap-0.5 items-end">
              <span className="text-[5px] tracking-wider uppercase text-content-4 px-0.5">Você</span>
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm bg-surface-card text-[8px] leading-relaxed text-content shadow-sm">
                Adiciona reunião com João amanhã às 14h e me avisa 15 min antes
              </div>
            </div>
            <div className="flex flex-col gap-0.5 items-start">
              <span className="text-[5px] tracking-wider uppercase text-content-4 px-0.5">Teq</span>
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm bg-surface-card text-[8px] leading-relaxed text-content border border-line shadow-sm">
                Pronto! ✅ Criei a tarefa <strong>"Reunião com João"</strong> para amanhã às 14:00. Vou te avisar 15min antes.
              </div>
            </div>
            <div className="flex flex-col gap-0.5 items-end">
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm bg-surface-card text-[8px] leading-relaxed text-content shadow-sm">
                Pesquisa tendências de IA em 2025
              </div>
            </div>
            <div className="flex flex-col gap-0.5 items-start">
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm bg-surface-card text-[8px] leading-relaxed text-content border border-line shadow-sm">
                Encontrei 3 fontes relevantes. As principais tendências são agentes autônomos, multimodalidade e...
              </div>
            </div>
            <div className="flex flex-col gap-0.5 items-end">
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm bg-surface-card text-[8px] leading-relaxed text-content shadow-sm">
                Gera um carrossel sobre produtividade
              </div>
            </div>
            <div className="flex items-start gap-1 opacity-50">
              <div className="px-2.5 py-1.5 rounded-2xl rounded-tl-sm text-[8px] bg-surface-card text-content border border-line shadow-sm italic flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                Gerando 5 imagens...
              </div>
            </div>
          </div>
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
      <header className="flex-shrink-0 px-3 pt-8 pb-1.5 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[9px] font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[6px] tracking-widest uppercase text-content-3 border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">Dashboard</span>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col px-2 pb-0.5 overflow-hidden min-h-0 z-10">
        <div className="flex-1 flex flex-col min-h-0 relative rounded-2xl overflow-hidden bg-surface-up shadow-2xl border border-line">
          <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-accent/20 to-transparent" />
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
          <div className="flex-1 flex items-center justify-center relative z-10">
            <div className="relative">
              <div className="absolute inset-0 -m-10 rounded-full bg-blue-400/[0.04] orb-pulse" />
              <div className="absolute inset-0 -m-6 rounded-full bg-blue-400/[0.06] orb-pulse" style={{ animationDelay: "0.4s" }} />
              <div className="absolute inset-0 -m-3 rounded-full bg-blue-400/[0.08] orb-pulse" style={{ animationDelay: "0.8s" }} />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-300/70 via-blue-400/50 to-blue-600/30 orb-glow orb-pulse" />
              <div className="absolute top-2 left-3 w-6 h-4 rounded-full bg-white/15 blur-sm" />
            </div>
          </div>
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
      <header className="flex-shrink-0 px-3 pt-8 pb-1.5 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[9px] font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[6px] tracking-widest uppercase text-content-3 border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">Dashboard</span>
          </div>
        </div>
      </header>
      <div className="flex-1 px-2 pb-0.5 flex flex-col gap-1.5 overflow-hidden min-h-0">
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex flex-col p-3 h-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[7px] font-medium tracking-[0.2em] uppercase text-content-2">Tarefas</h2>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-content-3"><polyline points="18 15 12 9 6 15"/></svg>
            </div>
            <div className="mb-2 flex gap-1">
              <div className="flex-1 min-w-0 bg-surface-card border border-line rounded-lg px-2 py-1 text-[6px] text-content-3">Nova tarefa...</div>
              <div className="w-5 h-5 flex items-center justify-center rounded-lg bg-surface-card border border-line text-content-3 flex-shrink-0">
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              </div>
            </div>
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
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg overflow-hidden flex-shrink-0">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[7px] font-medium tracking-[0.2em] uppercase text-content-2">Lembretes</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { text: "Reunião com João", type: "Amanhã 14h", color: "blue" as const },
                { text: "Pagar conta de luz", type: "Hoje 18h", color: "orange" as const },
              ].map((r, i) => (
                <div key={`r-${i}`} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${r.color === "blue" ? "border-blue-500/20 bg-blue-500/10" : "border-orange-500/20 bg-orange-500/10"}`}>
                    <svg width="5" height="5" viewBox="0 0 24 24" fill="none" stroke={r.color === "blue" ? "#3b82f6" : "#f97316"} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <span className="text-[6.5px] text-content flex-1 truncate">{r.text}</span>
                  <span className={`text-[5px] font-medium tracking-wider px-1 py-0.5 rounded-full border ${r.color === "blue" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>{r.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
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

function MockupDashboardImages() {
  return (
    <div className="h-full w-full flex flex-col bg-surface overflow-hidden">
      <header className="flex-shrink-0 px-3 pt-8 pb-1.5 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[9px] font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[6px] tracking-widest uppercase text-content-3 border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">Dashboard</span>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col px-2 pb-0.5 overflow-hidden min-h-0 z-10">
        <div className="flex-1 flex flex-col min-h-0 relative rounded-2xl overflow-hidden bg-surface-up shadow-2xl border border-line">
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
          <div className="flex-1 min-h-0 overflow-hidden p-2.5 pt-7 flex flex-col gap-2">
            <div className="flex flex-col gap-0.5 items-end">
              <span className="text-[5px] tracking-wider uppercase text-content-4 px-0.5">Você</span>
              <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm bg-surface-card text-[8px] leading-relaxed text-content shadow-sm">
                Gera um carrossel sobre gatos capoeiristas, estilo Netflix
              </div>
            </div>
            <div className="flex flex-col gap-0.5 items-start">
              <span className="text-[5px] tracking-wider uppercase text-content-4 px-0.5">Teq</span>
              <div className="max-w-[90%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm bg-surface-card text-[8px] leading-relaxed text-content border border-line shadow-sm">
                Show de bola! 🎬 Seu carrossel <strong>"Gatos Capoeiristas"</strong> com 5 slides já está na fila!
              </div>
            </div>
            <div className="mx-auto my-1">
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="text-[6px] text-green-400">🖼️ Carrossel pronto! 5 imagens</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 px-0.5">
              <div className="aspect-[9/16] rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/80 via-red-600/70 to-purple-700/80" />
                <div className="absolute inset-0 flex flex-col items-center justify-end p-1">
                  <div className="w-full h-[3px] bg-red-500/80 rounded-full mb-0.5" />
                  <span className="text-[4px] text-white/80 font-bold tracking-wider uppercase">NETFLIX</span>
                </div>
              </div>
              <div className="aspect-[9/16] rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/70 via-purple-600/70 to-pink-500/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-[6px]">🐱</span>
                  </div>
                </div>
              </div>
              <div className="aspect-[9/16] rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/70 via-orange-600/60 to-red-600/70" />
                <div className="absolute inset-0 flex items-end justify-center pb-2">
                  <div className="w-[80%] h-[2px] bg-white/20 rounded-full" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 px-0.5">
              <div className="aspect-[9/16] rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/70 via-cyan-600/60 to-blue-700/70" />
              </div>
              <div className="aspect-[9/16] rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/80 via-pink-600/60 to-red-500/70" />
              </div>
              <div className="aspect-[9/16] rounded-lg overflow-hidden relative border border-dashed border-line/40 bg-surface-card/30 flex items-center justify-center">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-content-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span className="text-[4px] text-content-4">Baixar todas</span>
                </div>
              </div>
            </div>
          </div>
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

function MockupWhatsApp() {
  return (
    <div className="h-full flex flex-col" style={{ background: "#0b141a" }}>
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
   NEW: Schedule Mockup
   ═══════════════════════════════════════════ */
function MockupDashboardSchedule() {
  return (
    <div className="h-full w-full flex flex-col bg-surface overflow-hidden">
      <header className="flex-shrink-0 px-3 pt-8 pb-1.5 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[9px] font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[6px] tracking-widest uppercase text-content-3 border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">Dashboard</span>
          </div>
        </div>
      </header>
      <div className="flex-1 px-2 pb-0.5 flex flex-col gap-1.5 overflow-hidden min-h-0">
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex flex-col p-3 h-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[7px] font-medium tracking-[0.2em] uppercase text-content-2">Agendamentos</h2>
              <span className="text-[5px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">5 ativos</span>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col gap-2">
              {[
                { text: "Resumo diário de tarefas", freq: "Diário · 8h", icon: "📋", color: "purple" },
                { text: "Previsão do tempo", freq: "Diário · 7h", icon: "🌤️", color: "purple" },
                { text: "Resumo de notícias", freq: "Diário · 9h", icon: "📰", color: "purple" },
                { text: "Relatório semanal", freq: "Seg · 10h", icon: "📊", color: "blue" },
                { text: "Backup de contatos", freq: "Mensal · dia 1", icon: "💾", color: "teal" },
              ].map((s, i) => (
                <div key={`s-${i}`} className="flex items-center gap-2 p-1.5 rounded-xl bg-surface-card/50 border border-line/50">
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] ${s.color === "purple" ? "bg-purple-500/10" : s.color === "blue" ? "bg-blue-500/10" : "bg-teal-500/10"}`}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[6.5px] text-content block truncate">{s.text}</span>
                    <span className="text-[5px] text-content-3">{s.freq}</span>
                  </div>
                  <div className="w-5 h-3 rounded-full bg-green-500/20 border border-green-500/30 relative flex-shrink-0">
                    <div className="absolute right-0.5 top-0.5 w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-line flex items-center justify-center gap-1">
              <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-content-3"><path d="M12 5v14M5 12h14"/></svg>
              <span className="text-[5.5px] text-content-3 tracking-wider uppercase">Novo agendamento</span>
            </div>
          </div>
        </div>
      </div>
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

/* ═══════════════════════════════════════════
   NEW: Social Monitoring Mockup
   ═══════════════════════════════════════════ */
function MockupDashboardSocial() {
  return (
    <div className="h-full w-full flex flex-col bg-surface overflow-hidden">
      <header className="flex-shrink-0 px-3 pt-8 pb-1.5 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[9px] font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[6px] tracking-widest uppercase text-content-3 border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">Dashboard</span>
          </div>
        </div>
      </header>
      <div className="flex-1 px-2 pb-0.5 flex flex-col gap-1.5 overflow-hidden min-h-0">
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex flex-col p-3 h-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[7px] font-medium tracking-[0.2em] uppercase text-content-2">Referências</h2>
              <span className="text-[5px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">4 contas</span>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col gap-1.5">
              {[
                { user: "@lexfridman", platform: "Instagram", followers: "3.8M", hasNew: true },
                { user: "@hubspot", platform: "Instagram", followers: "892K", hasNew: true },
                { user: "@naval", platform: "Instagram", followers: "2.1M", hasNew: false },
                { user: "@concorrente_xyz", platform: "Instagram", followers: "45K", hasNew: false },
              ].map((a, i) => (
                <div key={`a-${i}`} className="flex items-center gap-2 p-1.5 rounded-xl bg-surface-card/50 border border-line/50">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500/30 via-purple-500/30 to-orange-500/30 flex items-center justify-center text-[7px] font-bold text-content-2 flex-shrink-0">
                    {a.user[1].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[6.5px] text-content truncate">{a.user}</span>
                      {a.hasNew && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[5px] text-pink-400">🎥 {a.platform}</span>
                      <span className="text-[5px] text-content-4">· {a.followers}</span>
                    </div>
                  </div>
                  <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-content-4 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
            {/* Recent post notification */}
            <div className="mt-2 pt-2 border-t border-line">
              <div className="p-1.5 rounded-xl bg-pink-500/5 border border-pink-500/10">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                  <span className="text-[5.5px] text-pink-400 font-medium">Novo post detectado</span>
                </div>
                <span className="text-[6px] text-content-2 block">@lexfridman publicou há 12min</span>
                <span className="text-[5px] text-content-3 block mt-0.5 line-clamp-2">"Episode #450 — Sam Altman on the future of AI..."</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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

/* ═══════════════════════════════════════════
   Sticky Showcase — Features data
   ═══════════════════════════════════════════ */
const STICKY_FEATURES = [
  {
    label: "Chat inteligente",
    title: "Converse.\nEle resolve.",
    desc: "Crie tarefas, pesquise na internet, crie imagens, publique no blog — tudo conversando normalmente.",
    screen: <MockupDashboardChat />,
    glowColor: "rgba(100, 180, 255, 0.08)",
  },
  {
    label: "WhatsApp",
    title: "Um agente.\nTodos os canais.",
    desc: "O mesmo assistente no WhatsApp. Mande texto ou áudio e receba tudo que precisa — sem instalar nada.",
    screen: <MockupWhatsApp />,
    glowColor: "rgba(0, 168, 132, 0.08)",
  },
  {
    label: "Voz ao vivo",
    title: "Fale.\nEle ouve.",
    desc: "Conversa por voz em tempo real. Você fala e ele responde na hora, como um telefonema.",
    screen: <MockupDashboardVoice />,
    glowColor: "rgba(140, 120, 255, 0.08)",
  },
  {
    label: "Compromissos & tarefas",
    title: "Delegue.\nEle executa.",
    desc: "Guarde tudo que você precisa fazer e o Teq lembra pra você — quando e onde. Crie tarefas falando ou digitando.",
    screen: <MockupDashboardTasks />,
    glowColor: "rgba(100, 255, 180, 0.06)",
  },
  {
    label: "Agendamento inteligente",
    title: "Programe.\nEle repete.",
    desc: "Tudo que ele faz, ele pode fazer com rotina. Resumos diários, relatórios semanais, lembretes — no horário certo, sem você precisar pedir de novo.",
    screen: <MockupDashboardSchedule />,
    glowColor: "rgba(160, 100, 255, 0.08)",
  },
  {
    label: "Criação visual",
    title: "Peça.\nEle cria.",
    desc: "Carrosséis para Instagram, edição de fotos, imagens do zero — inclusive em lote. O Teq gera tudo de uma vez e te avisa quando fica pronto.",
    screen: <MockupDashboardImages />,
    glowColor: "rgba(255, 140, 80, 0.08)",
  },
  {
    label: "Social & notícias",
    title: "Acompanhe.\nEle monitora.",
    desc: "Acompanhe as redes sociais das pessoas que você admira, dos seus concorrentes. Receba notícias do mundo em resumos personalizados.",
    screen: <MockupDashboardSocial />,
    glowColor: "rgba(236, 72, 153, 0.08)",
  },
];

/* ═══════════════════════════════════════════
   Sticky Showcase Component
   ═══════════════════════════════════════════ */
function StickyShowcase({ progress }: { progress: number }) {
  const featureCount = STICKY_FEATURES.length;
  const activeIndex = Math.min(Math.floor(progress * featureCount), featureCount - 1);

  const phoneTiltRef = useRef<HTMLDivElement>(null);
  useMouseTilt(phoneTiltRef, 8);

  const feat = STICKY_FEATURES[activeIndex];

  return (
    <div className="sticky top-0 h-screen flex items-center overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none transition-all duration-1000"
        style={{ background: feat.glowColor }}
      />

      {/* Desktop: side-by-side / Mobile: phone centered + text overlaid at bottom */}
      <div className="max-w-6xl mx-auto w-full px-5 flex flex-col lg:flex-row items-center gap-0 lg:gap-16 h-full relative">
        {/* Phone — centered on screen */}
        <div
          className="w-full lg:w-[45%] flex items-center justify-center flex-1 lg:flex-initial"
          ref={phoneTiltRef}
        >
          <div className="animate-float">
            <PhoneFrame scale={1.08}>
              <div className="relative w-full h-full">
                {STICKY_FEATURES.map((f, fi) => {
                  if (Math.abs(fi - activeIndex) > 1) return null;
                  const isActive = fi === activeIndex;
                  return (
                    <div
                      key={fi}
                      className="screen-layer"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? "scale(1)" : "scale(0.96)",
                      }}
                    >
                      {f.screen}
                    </div>
                  );
                })}
              </div>
            </PhoneFrame>
          </div>
        </div>

        {/* Text — on mobile: overlaid at bottom with dark fade; on desktop: normal flow */}
        <div className="absolute bottom-0 left-0 right-0 lg:relative lg:bottom-auto lg:left-auto lg:right-auto w-full lg:w-[55%] text-center lg:text-left z-20">
          {/* Dark gradient fade — mobile only */}
          <div className="absolute inset-0 -top-60 bg-gradient-to-t from-black/95 via-black/80 via-55% to-transparent pointer-events-none lg:hidden" />
          <div className="relative px-5 pb-8 pt-16 lg:p-0">
            {STICKY_FEATURES.map((f, fi) => {
              const isActive = fi === activeIndex;
              return (
                <div
                  key={fi}
                  className="transition-all duration-500"
                  style={{
                    position: fi === 0 ? "relative" : "absolute",
                    top: fi === 0 ? undefined : 0,
                    left: fi === 0 ? undefined : 0,
                    right: fi === 0 ? undefined : 0,
                    opacity: isActive ? 1 : 0,
                    transform: isActive
                      ? "translateY(0)"
                      : fi < activeIndex
                        ? "translateY(-30px)"
                        : "translateY(30px)",
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                >
                  <p className="text-[11px] md:text-xs tracking-[0.3em] uppercase text-content-3 mb-3 lg:mb-4">
                    {f.label}
                  </p>
                  <h3 className="text-2xl sm:text-3xl md:text-6xl lg:text-7xl font-extralight tracking-tight mb-2 md:mb-6 leading-[1.05] whitespace-pre-line">
                    {f.title}
                  </h3>
                  <p className="text-sm sm:text-base md:text-xl text-content-2 font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="hidden lg:flex flex-col gap-3 absolute right-8 top-1/2 -translate-y-1/2">
        {STICKY_FEATURES.map((_, i) => (
          <div
            key={i}
            className={`progress-dot ${i === activeIndex ? "active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Bento Card with 3D tilt
   ═══════════════════════════════════════════ */
function BentoCard({ icon, title, desc, highlight, span, index = 0 }: { icon: string; title: string; desc: string; highlight?: boolean; span?: string; index?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    el.style.transform = `perspective(800px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-4px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "";
  }, []);

  const fromLeft = index % 2 === 0;

  return (
    <div
      ref={wrapRef}
      className={span || ""}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateX(0)" : `translateX(${fromLeft ? '-60px' : '60px'})`,
        transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: isVisible ? `${index * 80}ms` : "0ms",
      }}
    >
      <div
        ref={cardRef}
        className={`bento-card h-full rounded-2xl md:rounded-3xl border bg-surface-card/30 p-6 md:p-8 backdrop-blur-sm ${
          highlight ? "border-accent/40 ring-1 ring-accent/20 bg-accent/[0.04]" : "border-line/60"
        }`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <span className="text-3xl mb-4 block">{icon}</span>
        <h4 className="text-lg md:text-xl font-medium text-content mb-2">{title}</h4>
        <p className="text-sm md:text-base text-content-3 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

const BENTO_ITEMS = [
  { icon: "🧠", title: "Ele lembra de você", desc: "Lembra de todas as suas preferências e usa pra uma experiência cada vez melhor. Quanto mais você usa, mais ele te conhece." },
  { icon: "🎨", title: "Sua marca, guardada", desc: "Guardamos as informações da sua marca — cores, fontes, tom de voz. Tudo que o Teq gera segue o padrão adequado." },
  { icon: "🔗", title: "Gmail, Agenda, Slack e mais", desc: "Conecte suas ferramentas. Leia e-mails, crie eventos, responda no Slack — tudo por conversa.", highlight: true, span: "lg:row-span-2" },
  { icon: "📰", title: "Notícias na sua mão", desc: "O Teq busca notícias relevantes e te entrega um resumo personalizado, quando você quiser." },
  { icon: "🔍", title: "Pesquisa inteligente", desc: "Busca em várias fontes ao mesmo tempo e te entrega um resumo organizado e pronto." },
  { icon: "📝", title: "Publique só pedindo", desc: "O Teq escreve o texto e publica automaticamente no blog para você." },
  { icon: "⚡", title: "Faz tudo sem você esperar", desc: "Imagens, pesquisas e tarefas são processadas em background. Quando termina, você recebe na hora." },
];

/* ═══════════════════════════════════════════
   Bidirectional reveal item (use cases)
   ═══════════════════════════════════════════ */
function UseCaseItem({ children, index }: { children: ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: isVisible ? `${index * 60}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Landing Page
   ═══════════════════════════════════════════ */
export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const containerRef = useReveal();
  const [heroReady, setHeroReady] = useState(false);
  const stickyRef = useRef<HTMLElement>(null);
  const progress = useStickyScrollProgress(stickyRef);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  const scrollToShowcase = useCallback(() => {
    document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const heroPhoneRef = useRef<HTMLDivElement>(null);
  useMouseTilt(heroPhoneRef, 12);

  return (
    <div ref={containerRef} className="min-h-screen bg-surface text-content landing-noise" style={{ overflowX: "clip" }}>

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
            <button onClick={onRegister} className="btn-shine px-3.5 md:px-5 py-1.5 md:py-2 rounded-full bg-content text-surface text-[11px] md:text-xs tracking-wider uppercase font-medium hover:opacity-90 transition-all">
              Criar conta
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-5 pt-20 pb-12 overflow-hidden">
        {/* Depth layers */}
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-blue-500/[0.03] blur-[100px] parallax-slow pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] rounded-full bg-purple-500/[0.04] blur-[80px] parallax-fast pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-emerald-500/[0.02] blur-[120px] parallax-slow pointer-events-none" />

        {/* Main glow */}
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] md:w-[800px] md:h-[800px] rounded-full bg-content/[0.025] blur-[120px] hero-glow pointer-events-none" />

        {/* Text */}
        <div className={`relative z-10 max-w-4xl mx-auto transition-all duration-[1.2s] ease-out ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className={`badge-shine inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-line/60 bg-surface-card/40 backdrop-blur-sm text-[10px] md:text-xs tracking-wider uppercase text-content-3 mb-8 transition-all duration-[1.2s] delay-100 ${heroReady ? "opacity-100" : "opacity-0"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Seu secretário pessoal de IA
          </div>

          <h1 className="text-[3.5rem] leading-[1.1] md:text-[5.5rem] lg:text-[7.5rem] font-extralight tracking-tight mb-8">
            <span className="block overflow-hidden py-[0.1em]">
              <KineticText text="Fale." ready={heroReady} delay={200} />
            </span>
            <span className="block overflow-hidden py-[0.15em]">
              <CyclingText ready={heroReady} delay={500} />
            </span>
          </h1>

          <p className={`text-lg md:text-2xl text-content-2 font-light leading-relaxed max-w-2xl mx-auto mb-10 transition-all duration-[1.4s] delay-[600ms] ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            Seu secretário pessoal que você aciona por <strong className="text-content font-normal">voz</strong> ou{" "}
            <strong className="text-content font-normal">mensagem</strong> — na web ou no WhatsApp.
          </p>

          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-[1.4s] delay-[700ms] ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <button onClick={onRegister} className="btn-shine group w-full sm:w-auto px-10 py-4 rounded-full bg-content text-surface text-sm tracking-wider uppercase font-medium hover:opacity-90 transition-all hover:shadow-lg hover:shadow-content/10 hover:scale-[1.02] active:scale-[0.98]">
              Começar agora
              <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
            <button onClick={scrollToShowcase} className="w-full sm:w-auto px-10 py-4 rounded-full border border-line/60 bg-surface/30 backdrop-blur-md text-sm tracking-wider uppercase text-content-2 hover:text-content hover:border-line-strong transition-all hover:scale-[1.02] active:scale-[0.98]">
              Explorar
            </button>
          </div>
        </div>

        {/* Hero phone with 3D tilt */}
        <div
          ref={heroPhoneRef}
          className={`relative z-10 mt-12 md:mt-16 mb-[-8rem] md:mb-[-10rem] transition-all duration-[1.6s] delay-[800ms] ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"}`}
        >
          <PhoneFrame scale={1.15}>
            <MockupDashboardChat />
          </PhoneFrame>
        </div>
      </section>

      {/* ── STICKY FEATURE SHOWCASE ── */}
      <section
        id="showcase"
        ref={stickyRef}
        style={{ height: `${(STICKY_FEATURES.length + 1) * 100}vh` }}
        className="relative"
      >
        <div className="section-divider" />
        <StickyShowcase progress={progress} />
      </section>

      {/* ── BENTO GRID ── */}
      <section className="py-24 md:py-36 px-5 relative">
        <div className="section-divider" />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal-up">
            <p className="text-xs md:text-sm tracking-[0.3em] uppercase text-content-3 mb-4">Diferenciais</p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extralight tracking-tight">
              Não é chatbot.<br className="sm:hidden" /> É secretário pessoal.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENTO_ITEMS.map((item, i) => (
              <BentoCard key={i} {...item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="py-24 md:py-36 px-5 relative">
        <div className="section-divider" />
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14 reveal-up">
            <p className="text-xs md:text-sm tracking-[0.3em] uppercase text-content-3 mb-4">Na prática</p>
            <h2 className="text-3xl md:text-5xl font-extralight tracking-tight">
              Você fala. O Teq executa.
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { cmd: '"Adiciona reunião com João amanhã às 14h"', res: "Cria a tarefa, agenda lembrete e te avisa no horário — na web, WhatsApp ou ambos." },
              { cmd: '"Todo dia às 8h me manda tarefas e previsão do tempo"', res: "Agendamento automático: todo dia o Teq junta tudo e te manda um resumo pronto." },
              { cmd: '"Gera um carrossel sobre produtividade"', res: "5 imagens criadas automaticamente e entregues por notificação assim que ficam prontas." },
              { cmd: '"O que tem na minha agenda amanhã?"', res: "Consulta sua agenda do Google conectada e lista os compromissos do dia." },
              { cmd: '"Me avisa quando o @lexfridman postar"', res: "O Teq monitora o perfil e te manda uma notificação quando sair conteúdo novo." },
              { cmd: '"Cria a identidade visual da minha marca"', res: "Salva cores, fontes e tom de voz. Tudo que o Teq gera depois segue o padrão." },
              { cmd: '"Coloca um dragão nessa cena" (com foto)', res: "Edita a imagem enviada com IA e devolve o resultado em segundos." },
              { cmd: '"Pesquisa tendências de IA em 2025"', res: "O Teq busca em várias fontes ao mesmo tempo e te entrega um resumo completo." },
            ].map((uc, i) => (
              <UseCaseItem key={i} index={i}>
                <div className="group rounded-2xl border border-line/50 bg-surface-card/20 backdrop-blur-sm p-5 md:p-6 hover:border-line-strong hover:bg-surface-card/40 transition-all duration-500">
                  <p className="text-base font-mono text-content mb-1.5 tracking-tight">{uc.cmd}</p>
                  <p className="text-sm md:text-base text-content-3 leading-relaxed">{uc.res}</p>
                </div>
              </UseCaseItem>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">
        <div className="section-divider" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/[0.03] blur-[150px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/[0.03] blur-[120px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extralight tracking-tight mb-6 leading-tight">
            Seu secretário pessoal<br />está pronto.
          </h2>
          <p className="text-lg md:text-2xl text-content-2 font-light leading-relaxed mb-10 max-w-xl mx-auto">
            Comece agora mesmo. Sem complicação.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onRegister} className="btn-shine btn-glow group w-full sm:w-auto px-10 py-4 rounded-full bg-content text-surface text-sm tracking-wider uppercase font-medium hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]">
              Criar minha conta
              <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
            <button onClick={onLogin} className="btn-outline-glow w-full sm:w-auto px-10 py-4 rounded-full border border-line/60 text-sm tracking-wider uppercase text-content-2 hover:text-content transition-all hover:scale-[1.02] active:scale-[0.98]">
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
            <span>Secretário pessoal de IA</span>
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
