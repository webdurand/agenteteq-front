import { useState } from "react";
import { Orb } from "./components/Orb";
import { ChatHistory } from "./components/ChatHistory";
import { LoginModal } from "./components/LoginModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { useVoiceChat } from "./hooks/useVoiceChat";
import { useTheme } from "./hooks/useTheme";

const PHONE_KEY = "teq_phone_number";

function ThemeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="fixed top-5 right-5 z-50 w-9 h-9 rounded-full flex items-center justify-center
        bg-surface-card border border-line text-content-3 hover:text-content
        transition-colors duration-200"
      aria-label={dark ? "Modo claro" : "Modo escuro"}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function VoiceInterface({ phone }: { phone: string }) {
  const { state, messages, statusText, interimText, needsOnboarding, onboardingPrompt, wakeWordActive, toggleListening, sendName, onOrbScale } =
    useVoiceChat(phone);
  const { dark, toggle } = useTheme();

  const stateLabel = {
    idle: "Em espera",
    listening: "Ouvindo",
    thinking: "Pensando",
    speaking: "Falando",
  }[state];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface relative overflow-hidden select-none transition-colors duration-300">
      <ThemeToggle dark={dark} toggle={toggle} />

      <h1 className="text-xs font-light tracking-[0.6em] text-content-3 uppercase mb-10">
        T E Q
      </h1>

      <Orb state={state} onOrbScale={onOrbScale} onClick={toggleListening} />

      <div className="mt-8 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium tracking-[0.3em] uppercase transition-colors duration-300 text-content-2">
            {stateLabel}
          </span>
          {wakeWordActive && state === "idle" && (
            <span className="flex items-center gap-1 text-[10px] text-content-3 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-content-3 animate-pulse" />
              escuta ativa
            </span>
          )}
        </div>
        <p className="text-content-3 text-sm text-center max-w-xs leading-relaxed px-4 min-h-[20px]">
          {statusText}
        </p>
      </div>

      {state === "listening" && interimText && (
        <div className="mt-6 max-w-sm mx-4 px-5 py-3 rounded-xl bg-surface-card border border-line">
          <p className="text-content-2 text-sm leading-relaxed italic">{interimText}</p>
        </div>
      )}

      {messages.length > 0 && state === "idle" && (
        <div className="mt-6 max-w-sm mx-4 px-5 py-3 rounded-xl bg-surface-card border border-line">
          <p className="text-content-2 text-sm leading-relaxed line-clamp-3">
            {[...messages].reverse().find((m) => m.role === "agent")?.text ?? ""}
          </p>
        </div>
      )}

      <ChatHistory messages={messages} />

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
