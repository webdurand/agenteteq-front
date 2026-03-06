import { useVoiceChat } from "../hooks/useVoiceChat";
import { useVoiceLive } from "../hooks/useVoiceLive";
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
  const [activeTab, setActiveTab] = useState<"voice" | "chat" | "tasks">("chat");
  const [menuOpen, setMenuOpen] = useState(false);

  const openCheckout = (priceId?: string) => {
    setAccountOpen(false);
    setCheckoutPriceId(priceId);
    setCheckoutOpen(true);
  };
  const isLive = import.meta.env.VITE_VOICE_REALTIME === "true";

  const voiceActive = activeTab === "voice";

  const { 
    state: classicState, messages, statusText: classicStatus, interimText, voiceResponse,
    needsOnboarding, onboardingPrompt, 
    wakeWordActive, imageEditingPrompt, toggleListening: classicToggle, sendName, sendMessageText, onOrbScale: classicScale,
    historyLoading, historyInitialLoading, historyHasMore, historyLoadMore
  } = useVoiceChat(token, voiceActive);

  const {
    state: liveState, statusText: liveStatus, toggleListening: liveToggle, onOrbScale: liveScale
  } = useVoiceLive(isLive ? token : null);

  const state = isLive ? liveState : classicState;
  const statusText = isLive ? liveStatus : classicStatus;
  const toggleListening = isLive ? liveToggle : classicToggle;
  const onOrbScale = isLive ? liveScale : classicScale;
  
  const { dark, toggle } = useTheme();

  const stateLabel = {
    idle: "Em espera",
    listening: "Ouvindo",
    thinking: "Pensando",
    speaking: "Falando",
  }[state];

  return (
    <div className="h-screen-safe w-full flex flex-col bg-surface overflow-hidden transition-colors duration-300">
      
      {/* Topbar */}
      <header className="flex-shrink-0 px-4 lg:px-8 py-4 lg:py-6 flex items-center justify-between z-20 bg-surface">
        <div className="flex items-center gap-2 sm:gap-4">
          <h1 className="text-sm font-bold tracking-[0.4em] uppercase text-content">TEQ</h1>
          <span className="text-[10px] tracking-widest uppercase text-content-3 border border-line px-2 py-0.5 rounded-full hidden sm:inline-block">Dashboard</span>
          <SubscriptionStatus status={user.subscription_status || 'unknown'} trialEnd={user.trial_end || null} planActive={user.plan_active} hasStripeSubscription={user.has_stripe_subscription} onSubscribeClick={() => openCheckout()} />
        </div>
        
        {/* Mobile Menu Toggle */}
        <div className="lg:hidden relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-line text-content-3 hover:text-content"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-up border border-line rounded-2xl shadow-xl flex flex-col p-2 z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-line mb-1">
                <span className="text-xs text-content-3 uppercase tracking-wider">Tema</span>
                <ThemeToggle dark={dark} toggle={toggle} />
              </div>
              <button
                onClick={() => { setAccountOpen(true); setMenuOpen(false); }}
                className="text-left px-3 py-2.5 text-sm text-content hover:bg-surface-card rounded-xl transition-colors"
              >
                Conta
              </button>
              {onOpenAdmin && (
                <button 
                  onClick={() => { onOpenAdmin(); setMenuOpen(false); }}
                  className="text-left px-3 py-2.5 text-sm text-accent hover:bg-accent/10 rounded-xl transition-colors"
                >
                  Admin
                </button>
              )}
              <button 
                onClick={onLogout}
                className="text-left px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                Sair
              </button>
            </div>
          )}
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-2 lg:gap-4">
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
      <main className="flex-1 flex flex-col px-4 lg:px-8 pb-2 lg:pb-8 overflow-hidden min-h-0 z-10">
        
        <SubscriptionBanner token={token} planActive={user.plan_active} status={user.subscription_status || 'unknown'} />

        <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-8 min-h-0">
          {/* Left Sidebar - Tasks (Hidden on mobile if not active tab) */}
          <div className={`lg:flex lg:w-80 lg:flex-shrink-0 flex-col min-h-0 h-full ${activeTab === 'tasks' ? 'flex' : 'hidden'}`}>
            <Sidebar token={token} />
          </div>
          
          {/* Center Area: Voice OR Chat */}
          <div className={`flex-col lg:flex lg:flex-1 h-full min-h-0 relative rounded-3xl overflow-hidden bg-surface-up shadow-2xl border border-line ${(activeTab === 'voice' || activeTab === 'chat') ? 'flex' : 'hidden'}`}>
            
            {/* Desktop Mode Toggle inside the box */}
            <div className="hidden lg:flex absolute top-4 left-1/2 -translate-x-1/2 z-20 justify-center">
              <div className="bg-surface/80 backdrop-blur-md rounded-full p-1.5 border border-line flex items-center gap-1 shadow-sm">
                <button 
                  onClick={() => setActiveTab('chat')}
                  title="Modo Texto"
                  className={`p-2 rounded-full transition-colors ${activeTab === 'chat' ? 'bg-accent/10 text-accent shadow-sm' : 'text-content-3 hover:text-content-2'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>
                <button 
                  onClick={() => setActiveTab('voice')}
                  title="Modo Voz"
                  className={`p-2 rounded-full transition-colors ${activeTab === 'voice' ? 'bg-accent/10 text-accent shadow-sm' : 'text-content-3 hover:text-content-2'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="22"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Area - Render only the active one */}
            {activeTab === 'voice' ? (
              <div className="flex-col flex-1 relative flex">
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
                  ) : voiceResponse && state !== "listening" ? (
                    <div className="mt-2 max-w-lg mx-4 px-6 py-3 rounded-2xl bg-glass backdrop-blur-md border border-line">
                      <p className="text-content-2 text-sm leading-relaxed">{voiceResponse}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col min-h-0 bg-surface">
                <ChatPanel 
                  messages={messages} 
                  onSendMessage={sendMessageText} 
                  statusText={statusText} 
                  className="lg:max-w-none rounded-none border-none shadow-none bg-transparent" 
                  onLoadMore={historyLoadMore}
                  isLoadingMore={historyLoading}
                  isInitialLoading={historyInitialLoading}
                  hasMore={historyHasMore}
                  imageEditingPrompt={imageEditingPrompt}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden flex-shrink-0 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 px-2">
          <button 
            onClick={() => setActiveTab("tasks")}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'tasks' ? 'text-accent' : 'text-content-3 hover:text-content-2'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span className="text-[10px] font-medium tracking-wider uppercase">Painéis</span>
          </button>

          <button 
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'chat' ? 'text-accent' : 'text-content-3 hover:text-content-2'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span className="text-[10px] font-medium tracking-wider uppercase">Chat</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("voice")}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'voice' ? 'text-accent' : 'text-content-3 hover:text-content-2'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'voice' ? 'bg-accent/10 border border-accent/20' : 'bg-transparent'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            </div>
          </button>
        </div>
      </div>

      {needsOnboarding && (
        <OnboardingModal prompt={onboardingPrompt} onSubmit={sendName} />
      )}
      <AccountSettingsModal token={token} user={user} open={accountOpen} onClose={() => setAccountOpen(false)} onOpenCheckout={openCheckout} />
      <CheckoutModal token={token} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} priceId={checkoutPriceId} onPaymentSuccess={onRefreshUser} />
      <BlogPreviewModal />
    </div>
  );
}
