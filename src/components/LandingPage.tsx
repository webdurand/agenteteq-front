import { useEffect, useRef } from "react";
import { ThemeToggle } from "./ui/ThemeToggle";


interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    el.querySelectorAll(".reveal").forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    title: "Voz ao vivo",
    desc: "Áudio bidirecional com Gemini Live. Latência abaixo de 1 segundo, interrupção natural e tool calling por voz — sem cadeia STT → LLM → TTS.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "WhatsApp integrado",
    desc: "Use o mesmo assistente pelo WhatsApp. Mensagens de texto e áudio, com histórico e sessão unificados com a web.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Agendamento que executa",
    desc: "Não é só alarme. No horário, o agente roda com suas instruções e envia o resultado pronto — no canal que você escolher.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    title: "Canais multi-conectados",
    desc: "Web, voz e WhatsApp são um único agente. O que você combina num canal vale no outro — tarefas, lembretes e memória compartilhados.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Ferramentas reais",
    desc: "Tarefas, lembretes, pesquisa web, previsão do tempo, blog, geração e edição de imagens, carrosséis — tudo executado de verdade.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
        <line x1="16" y1="8" x2="2" y2="22" />
        <line x1="17.5" y1="15" x2="9" y2="15" />
      </svg>
    ),
    title: "Memória de longo prazo",
    desc: "O agente guarda fatos sobre você e usa em saudações personalizadas, preferências e respostas contextualizadas — conversa após conversa.",
  },
];

const USE_CASES = [
  {
    command: '"Adiciona reunião com João amanhã às 14h"',
    result: "O Teq cria a tarefa, agenda e te avisa no horário.",
  },
  {
    command: '"Às 14h me manda um resumo das tarefas"',
    result: "No horário, o agente roda, monta o resumo e envia no canal que você escolher.",
  },
  {
    command: '"Todo dia às 8h me manda minhas tarefas e a previsão do tempo"',
    result: "Agendamento recorrente: o agente executa diariamente e entrega o resultado pronto.",
  },
  {
    command: '"Pesquisa sobre inteligência artificial em 2025"',
    result: "Pesquisa web em tempo real com sub-agentes em paralelo quando necessário.",
  },
  {
    command: '"Gera um carrossel sobre produtividade"',
    result: "Imagens geradas em background; resultado entregue por notificação em tempo real.",
  },
];

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const containerRef = useScrollReveal();

  return (
    <div ref={containerRef} className="min-h-screen bg-surface text-content overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl bg-surface/80 border-b border-line/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-line flex items-center justify-center">
              <span className="text-sm font-light tracking-widest">T</span>
            </div>
            <span className="text-base font-light tracking-[0.25em] uppercase">Teq</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="w-8 h-8 rounded-full flex items-center justify-center text-content-3 hover:text-content transition-colors duration-200" />
            <button
              onClick={onLogin}
              className="px-4 py-1.5 text-xs tracking-wider uppercase text-content-2 hover:text-content transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={onRegister}
              className="px-4 py-1.5 rounded-lg bg-content text-surface text-xs tracking-wider uppercase hover:opacity-90 transition-opacity"
            >
              Criar conta
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-content/[0.02] blur-3xl hero-glow" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-line text-xs tracking-wider uppercase text-content-3 hero-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Assistente pessoal de IA
          </div>

          <h1 className="text-5xl md:text-7xl font-extralight tracking-tight leading-[1.1] hero-fade-in" style={{ animationDelay: "0.3s" }}>
            Fale. Ele faz.
          </h1>

          <p className="text-lg md:text-xl text-content-2 font-light leading-relaxed max-w-2xl mx-auto hero-fade-in" style={{ animationDelay: "0.5s" }}>
            Agente Teq é o assistente que você aciona por <strong className="text-content">voz</strong> ou{" "}
            <strong className="text-content">mensagem</strong> — na web ou no WhatsApp.
            Ele agenda tarefas, executa no horário e entrega o resultado pronto.
            Canais multi-conectados, mesma memória, mesmo histórico.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 hero-fade-in" style={{ animationDelay: "0.7s" }}>
            <button
              onClick={onRegister}
              className="group px-8 py-3.5 rounded-xl bg-content text-surface text-sm tracking-wider uppercase font-medium hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-content/10"
            >
              Começar agora
              <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
            <a
              href="#como-funciona"
              className="px-8 py-3.5 rounded-xl border border-line text-sm tracking-wider uppercase text-content-2 hover:text-content hover:border-line-strong transition-all duration-300"
            >
              Como funciona
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hero-fade-in" style={{ animationDelay: "1s" }}>
          <div className="w-5 h-8 rounded-full border-2 border-content-3 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-content-3 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA (demo textual) ── */}
      <section id="como-funciona" className="py-28 md:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20 reveal">
            <p className="text-xs tracking-[0.3em] uppercase text-content-3 mb-4">Como funciona</p>
            <h2 className="text-3xl md:text-5xl font-extralight tracking-tight">
              Você fala. O Teq executa.
            </h2>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            {USE_CASES.map((uc, i) => (
              <div key={i} className="reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="group rounded-2xl border border-line bg-surface-card/50 p-6 hover:border-line-strong transition-all duration-500 hover:bg-surface-card">
                  <p className="text-sm font-mono text-content-2 mb-2">{uc.command}</p>
                  <p className="text-sm text-content-3 leading-relaxed">{uc.result}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-28 md:py-36 px-6 bg-surface-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 reveal">
            <p className="text-xs tracking-[0.3em] uppercase text-content-3 mb-4">Diferenciais</p>
            <h2 className="text-3xl md:text-5xl font-extralight tracking-tight">
              Não é chatbot. É co-piloto.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line/50 rounded-2xl overflow-hidden border border-line">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="reveal bg-surface p-8 md:p-10 hover:bg-surface-card/50 transition-colors duration-500 group"
                style={{ transitionDelay: `${i * 0.06}s` }}
              >
                <div className="text-content-3 mb-5 transition-colors duration-300 group-hover:text-content">
                  {f.icon}
                </div>
                <h3 className="text-base font-medium text-content mb-2 tracking-wide">{f.title}</h3>
                <p className="text-sm text-content-3 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOZ HIGHLIGHT ── */}
      <section className="py-28 md:py-36 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="reveal">
            <p className="text-xs tracking-[0.3em] uppercase text-content-3 mb-4">Voz nativa</p>
            <h2 className="text-3xl md:text-5xl font-extralight tracking-tight mb-8">
              Converse como se fosse uma ligação.
            </h2>
            <p className="text-lg text-content-2 font-light leading-relaxed max-w-2xl mx-auto mb-12">
              Áudio bidirecional em tempo real com o Gemini Live. Você fala, interrompe naturalmente,
              e o agente executa ferramentas por voz — criando tarefas, agendando lembretes e pesquisando
              na web enquanto conversa com você.
            </p>
          </div>

          <div className="reveal flex items-center justify-center gap-1.5 py-12" style={{ transitionDelay: "0.15s" }}>
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-content/20 voice-bar"
                style={{
                  height: `${12 + Math.sin(i * 0.8) * 20 + Math.random() * 16}px`,
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            ))}
          </div>

          <div className="reveal flex flex-wrap items-center justify-center gap-3 text-xs text-content-3" style={{ transitionDelay: "0.25s" }}>
            <span className="px-3 py-1.5 rounded-full border border-line">Latência &lt;1s</span>
            <span className="px-3 py-1.5 rounded-full border border-line">Interrupção natural</span>
            <span className="px-3 py-1.5 rounded-full border border-line">Tool calling por voz</span>
            <span className="px-3 py-1.5 rounded-full border border-line">Background tasks</span>
          </div>
        </div>
      </section>

      {/* ── PARA QUEM ── */}
      <section className="py-28 md:py-36 px-6 bg-surface-card/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-xs tracking-[0.3em] uppercase text-content-3 mb-4">Para quem é</p>
            <h2 className="text-3xl md:text-5xl font-extralight tracking-tight">
              Se você delega, o Teq entrega.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 reveal" style={{ transitionDelay: "0.1s" }}>
            {[
              {
                emoji: "🗓️",
                title: "Quem esquece compromissos",
                desc: "Fale ou digite o que precisa lembrar. O Teq cria a tarefa, agenda e te avisa no horário — com o resultado pronto.",
              },
              {
                emoji: "🎙️",
                title: "Quem prefere falar a digitar",
                desc: "Voz ao vivo na web ou áudio no WhatsApp. O assistente ouve, entende e executa sem você precisar abrir nenhum app.",
              },
              {
                emoji: "💬",
                title: "Quem vive no WhatsApp",
                desc: "Use o mesmo assistente no WhatsApp com todo o contexto, tarefas e memória sincronizados com a web.",
              },
              {
                emoji: "🎨",
                title: "Criadores de conteúdo",
                desc: "Delegue rascunhos de blog, geração de imagens e carrosséis. O Teq executa em background e entrega quando fica pronto.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-line p-8 bg-surface hover:border-line-strong transition-all duration-500"
              >
                <span className="text-2xl mb-4 block">{item.emoji}</span>
                <h3 className="text-base font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-content-3 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-28 md:py-36 px-6">
        <div className="max-w-3xl mx-auto text-center reveal">
          <h2 className="text-3xl md:text-5xl font-extralight tracking-tight mb-6">
            Seu co-piloto está pronto.
          </h2>
          <p className="text-lg text-content-2 font-light leading-relaxed mb-10 max-w-xl mx-auto">
            7 dias grátis. Sem cartão para começar. Cancele quando quiser.
          </p>
          <button
            onClick={onRegister}
            className="group px-10 py-4 rounded-xl bg-content text-surface text-sm tracking-wider uppercase font-medium hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-content/10"
          >
            Criar minha conta
            <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-line py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-content-3">
          <div className="flex items-center gap-2">
            <span className="tracking-[0.2em] uppercase">Teq</span>
            <span className="text-content-4">·</span>
            <span>Assistente pessoal de IA</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-content transition-colors">Privacidade</a>
            <a href="/terms" className="hover:text-content transition-colors">Termos</a>
            <a href="mailto:contato@diarioteq.com" className="hover:text-content transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
