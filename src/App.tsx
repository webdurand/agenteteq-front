import { Orb } from "./components/Orb";
import { ChatHistory } from "./components/ChatHistory";
import { OnboardingModal } from "./components/OnboardingModal";
import { useVoiceChat } from "./hooks/useVoiceChat";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./hooks/useAuth";
import { AuthLayout } from "./components/AuthLayout";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { VerifyCode } from "./components/VerifyCode";
import { ConfirmPhone } from "./components/ConfirmPhone";

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

function PendingVerification({ auth, dark, toggle }: { auth: ReturnType<typeof useAuth>; dark: boolean; toggle: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6">
      <ThemeToggle dark={dark} toggle={toggle} />
      <div className="max-w-md w-full text-center bg-surface-card border border-line rounded-2xl p-8">
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <h2 className="text-2xl font-light text-content mb-3">Verificação Pendente</h2>
        <p className="text-content-3 text-sm leading-relaxed mb-8">
          Para usar o Teq, você precisa verificar seu WhatsApp. Clique abaixo para receber o código de verificação.
        </p>

        {auth.error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center mb-4">
            {auth.error}
          </div>
        )}

        <button 
          onClick={auth.startVerification}
          disabled={auth.loading}
          className="w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mb-4"
        >
          {auth.loading ? "Enviando..." : "Verificar WhatsApp"}
        </button>
        <button 
          onClick={auth.logout}
          className="text-content-4 hover:text-content text-xs uppercase tracking-wider transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}

function VoiceInterface({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { state, messages, statusText, interimText, needsOnboarding, onboardingPrompt, wakeWordActive, toggleListening, sendName, onOrbScale } =
    useVoiceChat(token);
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
      
      <button 
        onClick={onLogout}
        className="fixed top-5 left-5 z-50 px-4 py-2 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium tracking-wider uppercase transition-colors"
      >
        Sair
      </button>

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
  const auth = useAuth();
  const { dark, toggle } = useTheme();

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-4 border-line border-t-content rounded-full animate-spin"></div>
      </div>
    );
  }

  if (auth.screen === "login") {
    return (
      <>
        <ThemeToggle dark={dark} toggle={toggle} />
        <AuthLayout>
          <LoginForm auth={auth} />
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "register") {
    return (
      <>
        <ThemeToggle dark={dark} toggle={toggle} />
        <AuthLayout>
          <RegisterForm auth={auth} />
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "confirm_phone") {
    return (
      <>
        <ThemeToggle dark={dark} toggle={toggle} />
        <AuthLayout>
          <ConfirmPhone auth={auth} />
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "verify_whatsapp") {
    return (
      <>
        <ThemeToggle dark={dark} toggle={toggle} />
        <AuthLayout>
          <VerifyCode auth={auth} purpose="register" />
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "verify_2fa") {
    return (
      <>
        <ThemeToggle dark={dark} toggle={toggle} />
        <AuthLayout>
          <VerifyCode auth={auth} purpose="login_2fa" />
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "pending_verification") {
    return <PendingVerification auth={auth} dark={dark} toggle={toggle} />;
  }

  if (auth.screen === "trial_expired") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6">
        <ThemeToggle dark={dark} toggle={toggle} />
        <div className="max-w-md w-full text-center bg-surface-card border border-line rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-2xl font-light text-content mb-4">Trial Expirado</h2>
          <p className="text-content-3 text-sm leading-relaxed mb-8">
            Seu período de testes gratuitos do Teq chegou ao fim. Para continuar usando o assistente e acessando seu histórico, assine um de nossos planos.
          </p>
          <button className="w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity mb-4">
            Ver Planos (Em breve)
          </button>
          <button 
            onClick={auth.logout}
            className="text-content-4 hover:text-content text-xs uppercase tracking-wider transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  if (auth.screen === "authenticated" && auth.token) {
    return <VoiceInterface token={auth.token} onLogout={auth.logout} />;
  }

  return null;
}
