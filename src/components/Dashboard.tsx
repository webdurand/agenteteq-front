import { useVoiceChat } from "../hooks/useVoiceChat";
import { useTheme } from "../hooks/useTheme";
import { Orb } from "./Orb";
import { Sidebar } from "./Sidebar";
import { ChatPanel } from "./ChatPanel";
import { BlogPreviewModal } from "./BlogPreviewModal";
import { OnboardingModal } from "./OnboardingModal";
import { useState } from "react";
import { SubscriptionStatus } from "./SubscriptionStatus";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { AccountSettingsModal } from "./AccountSettingsModal";
import { CheckoutModal } from "./CheckoutModal";
import type { UserInfo } from "../hooks/useAuth";

interface DashboardProps {
  token: string;
  user: UserInfo;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onRefreshUser?: () => void;
}

function ThemeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-line text-content-3 hover:text-content transition-colors duration-200"
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

export function Dashboard({ token, user, onLogout, onOpenAdmin, onRefreshUser }: DashboardProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | undefined>(undefined);

  const openCheckout = (priceId?: string) => {
    setAccountOpen(false);
    setCheckoutPriceId(priceId);
    setCheckoutOpen(true);
  };
  const { 
    state, messages, statusText, interimText, needsOnboarding, onboardingPrompt, 
    wakeWordActive, toggleListening, sendName, sendMessageText, onOrbScale 
  } = useVoiceChat(token);
  
  const { dark, toggle } = useTheme();

  const stateLabel = {
    idle: "Em espera",
    listening: "Ouvindo",
    thinking: "Pensando",
    speaking: "Falando",
  }[state];

  return (
    <div className="h-screen w-full flex flex-col bg-surface overflow-hidden transition-colors duration-300 relative">
      
      {/* Topbar */}
      <header className="flex-shrink-0 px-4 lg:px-8 py-4 lg:py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold tracking-[0.4em] uppercase text-content">TEQ</h1>
          <span className="text-[10px] tracking-widest uppercase text-content-3 border border-line px-2 py-0.5 rounded-full hidden sm:inline-block">Dashboard</span>
          <SubscriptionStatus status={user.subscription_status || 'unknown'} trialEnd={user.trial_end || null} planActive={user.plan_active} hasStripeSubscription={user.has_stripe_subscription} onSubscribeClick={() => openCheckout()} />
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <ThemeToggle dark={dark} toggle={toggle} />
          <button
            onClick={() => setAccountOpen(true)}
            className="px-4 py-2 lg:px-5 lg:py-2.5 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium tracking-wider uppercase transition-colors"
          >
            Conta
          </button>
          {onOpenAdmin && (
            <button 
              onClick={onOpenAdmin}
              className="px-4 py-2 lg:px-5 lg:py-2.5 rounded-full bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 text-xs font-medium tracking-wider uppercase transition-colors"
            >
              Admin
            </button>
          )}
          <button 
            onClick={onLogout}
            className="px-4 py-2 lg:px-5 lg:py-2.5 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium tracking-wider uppercase transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col px-4 lg:px-8 pb-4 lg:pb-8 overflow-y-auto lg:overflow-hidden z-10">
        
        <SubscriptionBanner token={token} planActive={user.plan_active} status={user.subscription_status || 'unknown'} />

        <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-8 min-h-0">
          {/* Left Sidebar */}
          <Sidebar token={token} />
          
          {/* Center Canvas (Orb) */}
        <div className="flex flex-col h-[400px] lg:h-auto lg:flex-1 min-h-0 relative rounded-3xl overflow-hidden bg-surface-up shadow-2xl border border-line flex-shrink-0">
          {/* Subtle gradient background based on state */}
          <div className={`absolute inset-0 opacity-20 transition-all duration-1000 ${
            state === 'listening' ? 'bg-gradient-to-tr from-accent/20 to-transparent' :
            state === 'speaking' ? 'bg-gradient-to-tr from-accent/10 via-transparent to-accent/10' :
            'bg-gradient-to-b from-transparent to-black/5'
          }`} />

          <div className="flex-1 flex items-center justify-center relative z-10">
            <Orb state={state} onOrbScale={onOrbScale} onClick={toggleListening} />
          </div>
          
          <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2 z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tracking-[0.3em] uppercase transition-colors duration-300 text-content-2">
                {stateLabel}
              </span>
              {wakeWordActive && state === "idle" && (
                <span className="flex items-center gap-1 text-[10px] text-content-3 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  escuta ativa
                </span>
              )}
            </div>
            
            {state === "listening" && interimText ? (
              <div className="mt-2 max-w-md mx-4 px-6 py-3 rounded-2xl bg-glass backdrop-blur-md border border-line">
                <p className="text-content-2 text-sm leading-relaxed italic">{interimText}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Sidebar (Chat) */}
        <ChatPanel messages={messages} onSendMessage={sendMessageText} statusText={statusText} />

        </div>
      </main>

      {needsOnboarding && (
        <OnboardingModal prompt={onboardingPrompt} onSubmit={sendName} />
      )}
      <AccountSettingsModal token={token} user={user} open={accountOpen} onClose={() => setAccountOpen(false)} onOpenCheckout={openCheckout} />
      <CheckoutModal token={token} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} priceId={checkoutPriceId} onPaymentSuccess={onRefreshUser} />
      <BlogPreviewModal />
    </div>
  );
}
