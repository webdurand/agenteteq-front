import { useChat } from "../hooks/useChat";
import { useVoiceLive } from "../hooks/useVoiceLive";
import { Orb } from "./Orb";
import { Sidebar } from "./Sidebar";
import { ChatPanel } from "./ChatPanel";
import { BlogPreviewModal } from "./BlogPreviewModal";
import { OnboardingModal } from "./OnboardingModal";
import { useEffect, useMemo, useState } from "react";
import { SubscriptionStatus } from "./SubscriptionStatus";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { AccountSettingsModal } from "./AccountSettingsModal";
import { CheckoutModal } from "./CheckoutModal";
import type { UserInfo } from "../hooks/useAuth";
import { ThemeToggle } from "./ui/ThemeToggle";
import * as api from "../lib/api";
import { ProductOnboardingModal } from "./ProductOnboardingModal";
import { useProductTourPreferences } from "../hooks/useProductTourPreferences";
import { CampaignPopupModal } from "./CampaignPopupModal";

interface DashboardProps {
  token: string;
  user: UserInfo;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onRefreshUser?: () => void;
}

export function Dashboard({ token, user, onLogout, onOpenAdmin, onRefreshUser }: DashboardProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"voice" | "chat" | "tasks">("chat");
  const [menuOpen, setMenuOpen] = useState(false);
  const [productOnboardingOpen, setProductOnboardingOpen] = useState(false);
  const [showLimitsHighlight, setShowLimitsHighlight] = useState(false);
  const [limitsExpanded, setLimitsExpanded] = useState(false);
  const [limits, setLimits] = useState<{
    plan_name: "free" | "premium";
    runs_limit: number;
    runs_used: number;
    runs_remaining: number;
    resets_at: string | null;
  } | null>(null);
  const [campaign, setCampaign] = useState<any | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);

  const openCheckout = (priceId?: string) => {
    setAccountOpen(false);
    setCheckoutPriceId(priceId);
    setCheckoutOpen(true);
  };
  const voiceActive = activeTab === "voice";
  const userStorageKey = useMemo(
    () => (user.email || user.phone_number || "default").toLowerCase(),
    [user.email, user.phone_number],
  );
  const { completed, hiddenByUser, markCompleted, resetTour } = useProductTourPreferences(userStorageKey);

  const {
    messages,
    statusText: chatStatus,
    needsOnboarding, onboardingPrompt, 
    imageEditingPrompt, sendName, sendMessageText,
    historyLoading, historyInitialLoading, historyHasMore, historyLoadMore
  } = useChat(token);

  const {
    state,
    statusText,
    toggleListening,
  } = useVoiceLive(voiceActive ? token : null);

  const stateLabel = {
    connecting: "Conectando...",
    idle: "Pode falar",
    listening: "Ouvindo...",
    speaking: "Falando...",
    processing: "Processando...",
    muted: "Microfone pausado",
  }[state];
  const limitsProgress = limits && limits.runs_limit > 0
    ? Math.min(100, Math.max(0, Math.round((limits.runs_used / limits.runs_limit) * 100)))
    : 0;

  useEffect(() => {
    let mounted = true;
    api.getUsageLimits(token)
      .then((data) => {
        if (!mounted) return;
        setLimits(data);
      })
      .catch(() => {
        if (!mounted) return;
        setLimits(null);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (needsOnboarding) return;
    if (!completed && !hiddenByUser) {
      setProductOnboardingOpen(true);
    }
  }, [completed, hiddenByUser, needsOnboarding]);

  useEffect(() => {
    if (needsOnboarding || productOnboardingOpen) return;
    let mounted = true;
    api.getActiveCampaign(token)
      .then((res) => {
        if (!mounted) return;
        setCampaign(res?.campaign || null);
      })
      .catch(() => {
        if (!mounted) return;
        setCampaign(null);
      });
    return () => {
      mounted = false;
    };
  }, [token, needsOnboarding, productOnboardingOpen]);

  useEffect(() => {
    if (!campaign || needsOnboarding || productOnboardingOpen) return;

    const campaignKey = `teq_campaign_seen_${userStorageKey}_${campaign.id}`;
    const sessionKey = `teq_campaign_session_seen_${campaign.id}`;
    const seenRaw = localStorage.getItem(campaignKey);
    let seen: any = null;
    if (seenRaw) {
      try {
        seen = JSON.parse(seenRaw);
      } catch {
        seen = null;
      }
    }
    const now = Date.now();
    const frequency = campaign.frequency || "once";

    let shouldOpen = false;

    if (frequency === "once") {
      shouldOpen = !seen;
    } else if (frequency === "per_session") {
      shouldOpen = !sessionStorage.getItem(sessionKey);
    } else if (frequency === "daily") {
      const lastShownAt = seen?.lastShownAt ? Number(seen.lastShownAt) : 0;
      shouldOpen = !lastShownAt || now - lastShownAt >= 24 * 60 * 60 * 1000;
    }

    setCampaignOpen(shouldOpen);
  }, [campaign, needsOnboarding, productOnboardingOpen, userStorageKey]);

  useEffect(() => {
    if (!showLimitsHighlight) return;
    const timer = setTimeout(() => setShowLimitsHighlight(false), 4500);
    return () => clearTimeout(timer);
  }, [showLimitsHighlight]);

  const markCampaignSeen = (currentCampaign: any) => {
    const campaignKey = `teq_campaign_seen_${userStorageKey}_${currentCampaign.id}`;
    const sessionKey = `teq_campaign_session_seen_${currentCampaign.id}`;
    const now = Date.now();
    localStorage.setItem(campaignKey, JSON.stringify({ lastShownAt: now }));
    sessionStorage.setItem(sessionKey, "1");
  };

  const handleCloseCampaign = () => {
    if (campaign) markCampaignSeen(campaign);
    setCampaignOpen(false);
  };

  const handleFinishProductOnboarding = (hideNextTimes: boolean) => {
    markCompleted(hideNextTimes);
    setProductOnboardingOpen(false);
  };

  const handleSeeLimits = () => {
    setShowLimitsHighlight(true);
    setLimitsExpanded(true);
    markCompleted(false);
    setProductOnboardingOpen(false);
  };

  const handleReplayOnboarding = () => {
    resetTour();
    setAccountOpen(false);
    setProductOnboardingOpen(true);
  };

  return (
    <div className="h-screen-safe w-full flex flex-col bg-surface overflow-hidden transition-colors duration-300">
      
      {/* Topbar */}
      <header className="flex-shrink-0 px-3 sm:px-4 lg:px-8 pt-3 pb-2 lg:py-6 z-20 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-sm font-bold tracking-[0.4em] uppercase text-content flex-shrink-0">TEQ</h1>
            <span className="text-[10px] tracking-widest uppercase text-content-3 border border-line px-2 py-0.5 rounded-full hidden sm:inline-block flex-shrink-0">Dashboard</span>
            <SubscriptionStatus status={user.subscription_status || 'unknown'} trialEnd={user.trial_end || null} planActive={user.plan_active} hasStripeSubscription={user.has_stripe_subscription} onSubscribeClick={() => openCheckout()} />
            {/* Desktop limits inline */}
            {limits && (
              <div className="hidden lg:block relative">
                <button
                  onClick={() => setLimitsExpanded((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-full border text-[10px] tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                    showLimitsHighlight
                      ? "border-accent text-accent bg-accent/10"
                      : "border-line text-content-3 hover:text-content"
                  }`}
                >
                  <span>Runs {limits.runs_remaining}/{limits.runs_limit}</span>
                  <span className={`transition-transform ${limitsExpanded ? "rotate-180" : ""}`}>▾</span>
                </button>

                {limitsExpanded && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLimitsExpanded(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl border border-line bg-surface-up shadow-xl p-3 z-50">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider text-content-3">Plano atual</p>
                        <p className="text-xs text-content">{limits.plan_name === "premium" ? "Premium" : "Free Tier"}</p>
                      </div>
                      <p className="mt-2 text-sm text-content-2">Runs restantes</p>
                      <div className="mt-1.5 h-1.5 rounded-full bg-surface border border-line overflow-hidden">
                        <div className="h-full bg-accent transition-all" style={{ width: `${limitsProgress}%` }} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-content-3">
                        {limits.runs_remaining}/{limits.runs_limit} • {limits.resets_at ? `Reseta em: ${new Date(limits.resets_at).toLocaleString("pt-BR")}` : "Sem previsão"}
                      </p>
                      {limits.plan_name === "free" && (
                        <button
                          onClick={() => { setLimitsExpanded(false); openCheckout(); }}
                          className="mt-2.5 w-full px-3 py-2 rounded-xl bg-content text-surface text-[11px] font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
                        >
                          Ganhar mais limites
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Mobile Menu Toggle */}
          <div className="lg:hidden relative flex-shrink-0">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-surface border border-line text-content-3 hover:text-content"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
            
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-surface-up border border-line rounded-2xl shadow-xl flex flex-col p-2 z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-line mb-1">
                    <span className="text-xs text-content-3 uppercase tracking-wider">Tema</span>
                    <ThemeToggle />
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
              </>
            )}
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-2 lg:gap-4">
            <ThemeToggle />
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
        </div>

        {/* Limits bar - segunda linha no mobile */}
        {limits && (
          <div className="mt-2 lg:mt-0 lg:hidden relative">
            <button
              onClick={() => setLimitsExpanded((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-full border text-[10px] tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                showLimitsHighlight
                  ? "border-accent text-accent bg-accent/10"
                  : "border-line text-content-3 hover:text-content"
              }`}
            >
              <span>Runs {limits.runs_remaining}/{limits.runs_limit}</span>
              <span className={`transition-transform ${limitsExpanded ? "rotate-180" : ""}`}>▾</span>
            </button>

            {limitsExpanded && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLimitsExpanded(false)} />
                <div className="absolute top-full left-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs rounded-2xl border border-line bg-surface-up shadow-xl p-4 z-50">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-content-3">Plano atual</p>
                    <p className="text-xs text-content">{limits.plan_name === "premium" ? "Premium" : "Free Tier"}</p>
                  </div>
                  <p className="mt-2 text-sm text-content-2">Runs restantes</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-surface border border-line overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${limitsProgress}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-content-3">
                    {limits.runs_remaining}/{limits.runs_limit} • {limits.resets_at ? `Reseta em: ${new Date(limits.resets_at).toLocaleString("pt-BR")}` : "Sem previsão"}
                  </p>
                  {limits.plan_name === "free" && (
                    <button
                      onClick={() => { setLimitsExpanded(false); openCheckout(); }}
                      className="mt-3 w-full px-3 py-2.5 rounded-xl bg-content text-surface text-[11px] font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
                    >
                      Ganhar mais limites
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col px-3 sm:px-4 lg:px-8 pb-1 lg:pb-8 overflow-hidden min-h-0 z-10">
        
        <SubscriptionBanner
          planActive={user.plan_active}
          status={user.subscription_status || 'unknown'}
          onManageBilling={() => setAccountOpen(true)}
        />
        <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-8 min-h-0">
          {/* Left Sidebar - Tasks (Hidden on mobile if not active tab) */}
          <div className={`lg:flex lg:w-80 lg:flex-shrink-0 flex-col min-h-0 h-full overflow-hidden ${activeTab === 'tasks' ? 'flex' : 'hidden'}`}>
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
                  state === 'processing' ? 'bg-gradient-to-tr from-amber-400/20 via-transparent to-orange-400/20' :
                  'bg-gradient-to-b from-transparent to-black/5'
                }`} />

                <div className="flex-1 flex items-center justify-center relative z-10">
                  <Orb state={state} onClick={toggleListening} />
                </div>
                
                <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2 z-10 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tracking-[0.3em] uppercase transition-colors duration-300 text-content-2">
                      {stateLabel}
                    </span>
                  </div>
                  
                  {statusText ? (
                    <p className="text-content-3 text-xs tracking-wider mt-1">{statusText}</p>
                  ) : null}
                  {state === 'processing' && (
                    <p className="text-content-3/50 text-[10px] tracking-wider mt-1">Toque no orb para interromper</p>
                  )}
                </div>
              </div>
            ) : activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col min-h-0 bg-surface">
                <ChatPanel 
                  messages={messages} 
                  onSendMessage={sendMessageText} 
                  statusText={chatStatus} 
                  className="lg:max-w-none rounded-none border-none shadow-none bg-transparent" 
                  onLoadMore={historyLoadMore}
                  isLoadingMore={historyLoading}
                  isInitialLoading={historyInitialLoading}
                  hasMore={historyHasMore}
                  imageEditingPrompt={imageEditingPrompt}
                  onOpenCheckout={() => openCheckout()}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden flex-shrink-0 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-14 px-2">
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
      <ProductOnboardingModal
        open={!needsOnboarding && productOnboardingOpen}
        onFinish={handleFinishProductOnboarding}
        onOpenCheckout={(hideNextTimes) => {
          markCompleted(hideNextTimes);
          setProductOnboardingOpen(false);
          openCheckout();
        }}
        onSeeLimits={handleSeeLimits}
      />
      <CampaignPopupModal
        open={campaignOpen && !needsOnboarding && !productOnboardingOpen}
        campaign={campaign}
        onClose={handleCloseCampaign}
        onOpenCheckout={() => {
          if (campaign) markCampaignSeen(campaign);
          setCampaignOpen(false);
          openCheckout();
        }}
        onOpenAccount={() => {
          if (campaign) markCampaignSeen(campaign);
          setCampaignOpen(false);
          setAccountOpen(true);
        }}
      />
      <AccountSettingsModal
        token={token}
        user={user}
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onOpenCheckout={openCheckout}
        onReplayOnboarding={handleReplayOnboarding}
      />
      <CheckoutModal token={token} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} priceId={checkoutPriceId} onPaymentSuccess={onRefreshUser} />
      <BlogPreviewModal />
    </div>
  );
}
