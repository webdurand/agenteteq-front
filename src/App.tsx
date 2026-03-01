import { useState } from "react";
import { Orb } from "./components/Orb";
import { ChatHistory } from "./components/ChatHistory";
import { LoginModal } from "./components/LoginModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { useVoiceChat } from "./hooks/useVoiceChat";

const PHONE_KEY = "teq_phone_number";

function VoiceInterface({ phone }: { phone: string }) {
  const { state, messages, statusText, interimText, needsOnboarding, onboardingPrompt, wakeWordActive, toggleListening, sendName, onOrbScale } =
    useVoiceChat(phone);

  const stateLabel = {
    idle: "Em espera",
    listening: "Ouvindo",
    thinking: "Pensando",
    speaking: "Falando",
  }[state];

  const stateColor = {
    idle: "text-navy-400",
    listening: "text-navy-300",
    thinking: "text-blue-400",
    speaking: "text-navy-200",
  }[state];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy-900 relative overflow-hidden select-none">
      {/* Partículas de fundo — gradientes sutis */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30,58,138,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Nome do agente */}
      <h1 className="text-xs font-light tracking-[0.6em] text-navy-400 uppercase mb-10">
        T E Q
      </h1>

      {/* Orb */}
      <Orb state={state} onOrbScale={onOrbScale} onClick={toggleListening} />

      {/* Status */}
      <div className="mt-8 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium tracking-[0.3em] uppercase transition-colors duration-300 ${stateColor}`}>
            {stateLabel}
          </span>
          {wakeWordActive && state === "idle" && (
            <span className="flex items-center gap-1 text-[10px] text-navy-500 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-navy-500 animate-pulse" />
              escuta ativa
            </span>
          )}
        </div>
        <p className="text-navy-400 text-sm text-center max-w-xs leading-relaxed px-4 min-h-[20px]">
          {statusText}
        </p>
      </div>

      {/* Texto em tempo real enquanto o usuário fala */}
      {state === "listening" && interimText && (
        <div className="mt-6 max-w-sm mx-4 px-5 py-3 rounded-xl bg-navy-800/40 border border-navy-600/30">
          <p className="text-navy-200 text-sm leading-relaxed italic">{interimText}</p>
        </div>
      )}

      {/* Última mensagem do agente em destaque */}
      {messages.length > 0 && state === "idle" && (
        <div className="mt-6 max-w-sm mx-4 px-5 py-3 rounded-xl bg-navy-800/40 border border-navy-700/30">
          <p className="text-navy-300 text-sm leading-relaxed line-clamp-3">
            {[...messages].reverse().find((m) => m.role === "agent")?.text ?? ""}
          </p>
        </div>
      )}

      {/* Histórico */}
      <ChatHistory messages={messages} />

      {/* Onboarding de nome */}
      {needsOnboarding && (
        <OnboardingModal prompt={onboardingPrompt} onSubmit={sendName} />
      )}
    </div>
  );
}

export default function App() {
  const [phone, setPhone] = useState<string | null>(() => {
    return localStorage.getItem(PHONE_KEY);
  });

  const handleLogin = (p: string) => {
    localStorage.setItem(PHONE_KEY, p);
    setPhone(p);
  };

  if (!phone) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return <VoiceInterface phone={phone} />;
}
