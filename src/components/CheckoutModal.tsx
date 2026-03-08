import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import * as api from "../lib/api";
import { CheckoutForm } from "./CheckoutForm";
import { UpdatePaymentModal } from "./UpdatePaymentModal";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

interface CheckoutModalProps {
  token: string;
  open: boolean;
  onClose: () => void;
  priceId?: string;
  onPaymentSuccess?: () => void;
}

export function CheckoutModal({ token, open, onClose, priceId, onPaymentSuccess }: CheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [billing, setBilling] = useState<any>(null);
  const [step, setStep] = useState<'loading' | 'selecting' | 'subscribing' | 'payment' | 'processing' | 'success' | 'active'>('loading');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setClientSecret("");
      setError(null);
      setPlan(null);
      setBilling(null);
      setAllPlans([]);
      setStep('loading');
      setUpgradeLoading(false);
      return;
    }

    let isMounted = true;

    const init = async () => {
      setError(null);
      setStep('loading');
      try {
        const [plansData, billingData] = await Promise.all([
          api.getBillingPlans(token),
          api.getBillingOverview(token),
        ]);
        if (!isMounted) return;

        const activePlans = (plansData.plans || []).filter((p: any) => p.is_active);
        setAllPlans(activePlans);
        setBilling(billingData);

        const hasActiveSub =
          billingData?.has_stripe_subscription &&
          ["active", "trialing", "past_due"].includes(billingData?.status);

        if (hasActiveSub) {
          // Already subscribed — show manage view
          const currentPlan = activePlans.find((p: any) => p.code === billingData.plan_code);
          setPlan(currentPlan || null);
          setStep('active');
          return;
        }

        // If a specific plan was requested, auto-select it
        const paidPlans = activePlans.filter((p: any) => p.code !== "free");
        if (priceId) {
          const requested = paidPlans.find((p: any) => p.code === priceId);
          if (requested) {
            setPlan(requested);
            // Go straight to subscribing
            setStep('subscribing');
            await startSubscription(requested);
            return;
          }
        }

        // Only 1 paid plan? Auto-select it
        if (paidPlans.length === 1) {
          setPlan(paidPlans[0]);
          setStep('subscribing');
          await startSubscription(paidPlans[0]);
          return;
        }

        // Multiple paid plans or none — show selection
        setStep('selecting');
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.message || err.detail || err;
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        setStep('selecting');
      }
    };

    const startSubscription = async (selectedPlan: any) => {
      try {
        setError(null);
        const subData = await api.subscribeBilling(token, selectedPlan.code);
        if (!isMounted) return;
        setClientSecret(subData.client_secret);
        setStep('payment');
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.message || err.detail || err;
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        setStep('selecting');
      }
    };

    init();
    return () => { isMounted = false; };
  }, [open, token, priceId]);

  const handleSelectPlan = async (selectedPlan: any) => {
    setPlan(selectedPlan);
    setStep('subscribing');
    setError(null);
    try {
      const subData = await api.subscribeBilling(token, selectedPlan.code);
      setClientSecret(subData.client_secret);
      setStep('payment');
    } catch (err: any) {
      const msg = err.message || err.detail || err;
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setStep('selecting');
    }
  };

  // Poll for payment confirmation
  useEffect(() => {
    if (step !== 'processing') return;

    let isPolling = true;
    const pollStatus = async () => {
      try {
        const data = await api.getBillingOverview(token);
        if ((data.status === 'active' || data.status === 'trialing') && isPolling) {
          setStep('success');
        }
      } catch {
        // ignore
      }
    };

    const interval = setInterval(pollStatus, 3000);
    pollStatus();

    return () => {
      isPolling = false;
      clearInterval(interval);
    };
  }, [step, token]);

  if (!open) return null;

  const handleCancelSubscription = async () => {
    if (!confirm("Cancelar a assinatura ao fim do período atual?")) return;
    try {
      setCancelLoading(true);
      await api.cancelBilling(token);
      const updated = await api.getBillingOverview(token);
      setBilling(updated);
    } catch (err: any) {
      setError(err.message || "Erro ao cancelar assinatura");
    } finally {
      setCancelLoading(false);
    }
  };

  const paidPlans = allPlans.filter((p: any) => p.code !== "free");
  const formatBRL = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  // ----- Plan Selection Step -----
  const renderSelectingStep = () => (
    <div className="flex-1 flex flex-col">
      <h2 className="text-xl sm:text-2xl font-light text-content mb-1 sm:mb-2 pr-20">Escolha seu plano</h2>
      <p className="text-sm text-content-3 mb-6">Selecione o plano ideal para você</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl mb-4">
          {error}
        </div>
      )}

      {paidPlans.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 gap-4">
          <div className="text-content-3 text-sm">Nenhum plano pago disponível no momento.</div>
          <button onClick={onClose} className="px-6 py-3 rounded-xl border border-line text-content text-sm font-medium uppercase tracking-wider hover:bg-surface-card transition-colors">
            Voltar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paidPlans.map((p: any) => {
            const limits = (() => { try { return JSON.parse(p.limits_json || "{}"); } catch { return {}; } })();
            return (
              <div key={p.code} className="rounded-2xl border border-line p-5 space-y-4 hover:border-accent/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-content text-lg font-medium">{p.name}</div>
                    <div className="text-content-3 text-sm mt-0.5">{p.description}</div>
                  </div>
                  <div className="text-accent text-2xl font-light whitespace-nowrap">
                    {formatBRL(p.amount_cents)}
                    <span className="text-xs text-content-4">/{p.interval === "year" ? "ano" : "mês"}</span>
                  </div>
                </div>

                {/* Limits grid */}
                {Object.keys(limits).length > 0 && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs border-t border-line pt-3">
                    {limits.max_tasks_per_user_daily != null && (
                      <div className="flex justify-between"><span className="text-content-3">Imagens por dia</span><span className="text-content">{limits.max_tasks_per_user_daily}</span></div>
                    )}
                    {limits.max_searches_daily != null && (
                      <div className="flex justify-between"><span className="text-content-3">Buscas na web/dia</span><span className="text-content">{limits.max_searches_daily}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-content-3">Voz real-time</span><span className={limits.voice_live_enabled ? "text-green-400" : "text-content-4"}>{limits.voice_live_enabled ? "Sim" : "Não"}</span></div>
                    {limits.voice_live_max_minutes_daily != null && limits.voice_live_max_minutes_daily > 0 && (
                      <div className="flex justify-between"><span className="text-content-3">Minutos de voz/dia</span><span className="text-content">{limits.voice_live_max_minutes_daily}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-content-3">Síntese de voz (TTS)</span><span className={limits.tts_enabled ? "text-green-400" : "text-content-4"}>{limits.tts_enabled ? "Sim" : "Não"}</span></div>
                    {limits.max_deep_research_daily != null && (
                      <div className="flex justify-between"><span className="text-content-3">Pesquisa profunda/dia</span><span className="text-content">{limits.max_deep_research_daily}</span></div>
                    )}
                  </div>
                )}

                {p.trial_days > 0 && (
                  <div className="text-xs text-green-500">{p.trial_days} dias grátis para testar</div>
                )}

                <button
                  onClick={() => handleSelectPlan(p)}
                  className="w-full px-4 py-3.5 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
                >
                  Assinar {p.name}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ----- Subscribing / Loading Step -----
  const renderSubscribingStep = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-12">
      <div className="w-10 h-10 rounded-full border-2 border-line border-t-content animate-spin"></div>
      <div className="text-content-3 text-xs sm:text-sm tracking-wider uppercase font-medium">Preparando pagamento...</div>
    </div>
  );

  // ----- Payment Form Step -----
  const renderPaymentStep = () => (
    <div className="flex-1 flex flex-col">
      <h2 className="text-xl sm:text-2xl font-light text-content mb-1 sm:mb-2 pr-20">Finalizar Assinatura</h2>
      <p className="text-sm text-content-3 mb-6 sm:mb-8">Escolha sua forma de pagamento preferida</p>
      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl">
          {error}
        </div>
      ) : clientSecret ? (
        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-500">
          <Elements stripe={stripePromise} options={{
            clientSecret,
            appearance: { theme: 'stripe' },
          }}>
            <CheckoutForm
              onCancel={onClose}
              clientSecret={clientSecret}
              onSuccess={() => setStep('processing')}
            />
          </Elements>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 py-12">
          <div className="w-10 h-10 rounded-full border-2 border-line border-t-content animate-spin"></div>
          <div className="text-content-3 text-xs sm:text-sm tracking-wider uppercase font-medium">Conectando ao ambiente seguro...</div>
        </div>
      )}
    </div>
  );

  // ----- Processing Step -----
  const renderProcessingStep = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center py-12">
      <div className="w-14 h-14 rounded-full border-4 border-line border-t-accent animate-spin"></div>
      <div>
        <h3 className="text-xl sm:text-2xl font-light text-content mb-2">Processando Pagamento</h3>
        <p className="text-content-3 text-sm">Aguarde enquanto confirmamos sua assinatura...</p>
      </div>
    </div>
  );

  // ----- Success Step -----
  const renderSuccessStep = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center py-12">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h3 className="text-2xl font-light text-content mb-2">Assinatura Confirmada!</h3>
        <p className="text-content-3">Seu pagamento foi processado com sucesso.</p>
      </div>
      <button
        onClick={() => { onClose(); if (onPaymentSuccess) onPaymentSuccess(); }}
        className="mt-4 px-8 py-3.5 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
      >
        Utilizar meu agente
      </button>
    </div>
  );

  // ----- Active Subscription Step -----
  const renderActiveStep = () => (
    <div className="flex-1 flex flex-col">
      <h2 className="text-xl sm:text-2xl font-light text-content mb-1 sm:mb-2 pr-20">Sua Assinatura</h2>
      <p className="text-sm text-content-3 mb-6 sm:mb-8">Gerencie seu plano e pagamentos</p>
      <div className="relative w-full flex flex-col justify-start gap-6">
        <div className="rounded-2xl border border-line bg-surface-card p-6 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-content-3">Assinatura ativa</p>
            <h3 className="text-2xl font-light text-content mt-1">{billing?.plan_name || plan?.name || "Plano"}</h3>
            <p className="text-sm text-content-3 mt-1">
              {billing?.status === "trialing" ? "Período de teste em andamento" : "Assinatura ativa e funcionando normalmente"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-line p-4">
              <p className="text-content-4 uppercase tracking-wider text-[10px]">Valor do plano</p>
              <p className="text-content mt-1">
                {billing?.amount_cents ? formatBRL(billing.amount_cents) : "-"}
              </p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="text-content-4 uppercase tracking-wider text-[10px]">
                {billing?.cancel_at_period_end ? "Acesso até" : "Próxima renovação"}
              </p>
              <p className="text-content mt-1">
                {billing?.current_period_end ? new Date(billing.current_period_end).toLocaleDateString("pt-BR") : "-"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-line p-4">
            <p className="text-content-4 uppercase tracking-wider text-[10px] mb-2">Cartão utilizado</p>
            {billing?.payment_methods?.length ? (
              <div className="text-content text-sm">
                {(billing.payment_methods[0].brand || "cartão").toUpperCase()} final {billing.payment_methods[0].last4}
                {" • "}
                {String(billing.payment_methods[0].exp_month).padStart(2, "0")}/{billing.payment_methods[0].exp_year}
              </div>
            ) : (
              <div className="text-content-3 text-sm">Nenhum cartão identificado.</div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button onClick={() => setShowUpdatePayment(true)} className="px-4 py-2.5 rounded-xl bg-content text-surface text-xs font-medium uppercase tracking-wider hover:opacity-90 transition-opacity">
              Atualizar cartão
            </button>
            {!billing?.cancel_at_period_end && (
              <button onClick={handleCancelSubscription} disabled={cancelLoading} className="px-4 py-2.5 rounded-xl border border-line text-content text-xs font-medium uppercase tracking-wider hover:bg-surface-card transition-colors disabled:opacity-50">
                {cancelLoading ? "Cancelando..." : "Cancelar assinatura"}
              </button>
            )}
          </div>
        </div>

        {/* Upgrade / downgrade */}
        {allPlans.filter(p => p.code !== billing?.plan_code).length > 0 && (
          <div className="rounded-2xl border border-line bg-surface-card p-6 space-y-4">
            <p className="text-[11px] uppercase tracking-wider text-content-3">Trocar de plano</p>
            {billing?.cancel_at_period_end && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-[11px] text-amber-400">Assinatura será cancelada em {billing.current_period_end ? new Date(billing.current_period_end).toLocaleDateString("pt-BR") : "—"}. Após essa data, voltará para Free.</p>
              </div>
            )}
            <div className="space-y-3">
              {allPlans.filter(p => p.code !== billing?.plan_code).map((p: any) => {
                const isDowngrade = p.code === "free";
                return (
                  <div key={p.code} className="rounded-xl border border-line p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-content">{p.name}</h4>
                      <p className="text-xs text-content-3 mt-0.5">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-light whitespace-nowrap">
                        {p.amount_cents > 0
                          ? <span className="text-accent">{formatBRL(p.amount_cents)}<span className="text-[10px] text-content-4">/mês</span></span>
                          : <span className="text-content-3">Grátis</span>}
                      </span>
                      <button
                        disabled={upgradeLoading}
                        onClick={async () => {
                          const msg = isDowngrade
                            ? "Seu plano atual continuará ativo até o fim do período. Depois disso, voltará para o Free. Confirmar?"
                            : `Trocar para ${p.name}? O valor será ajustado proporcionalmente.`;
                          if (!confirm(msg)) return;
                          setUpgradeLoading(true);
                          setError(null);
                          try {
                            const result = await api.upgradePlan(token, p.code);
                            if (result.status === "downgrading_to_free") {
                              const updated = await api.getBillingOverview(token);
                              setBilling(updated);
                            } else {
                              setStep('success');
                            }
                          } catch (err: any) {
                            setError(err.message || "Erro ao trocar de plano");
                          } finally {
                            setUpgradeLoading(false);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-medium uppercase tracking-wider transition-opacity disabled:opacity-50 whitespace-nowrap ${
                          isDowngrade ? "border border-line text-content hover:bg-surface-card" : "bg-accent text-surface hover:opacity-90"
                        }`}
                      >
                        {upgradeLoading ? "Processando..." : isDowngrade ? "Mudar para Free" : "Fazer upgrade"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ----- Loading Step -----
  const renderLoadingStep = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-12">
      <div className="w-10 h-10 rounded-full border-2 border-line border-t-content animate-spin"></div>
      <div className="text-content-3 text-xs sm:text-sm tracking-wider uppercase font-medium">Carregando planos...</div>
    </div>
  );

  // Determine which main content to render
  const renderMainContent = () => {
    switch (step) {
      case 'loading': return renderLoadingStep();
      case 'selecting': return renderSelectingStep();
      case 'subscribing': return renderSubscribingStep();
      case 'payment': return renderPaymentStep();
      case 'processing': return renderProcessingStep();
      case 'success': return renderSuccessStep();
      case 'active': return renderActiveStep();
    }
  };

  // Show summary sidebar only when a plan is selected and we're in payment/subscribing/active steps
  const showSummary = plan && ['subscribing', 'payment', 'active'].includes(step);
  const summaryPlan = step === 'active' ? { name: billing?.plan_name || plan?.name, description: billing?.plan_description || plan?.description, amount_cents: billing?.amount_cents || plan?.amount_cents, currency: billing?.currency || plan?.currency, trial_days: plan?.trial_days } : plan;

  return (
    <div className="fixed inset-0 z-[100] bg-surface sm:bg-black/80 sm:backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="w-full sm:max-w-5xl sm:min-h-[550px] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl bg-surface-up sm:border sm:border-line sm:shadow-2xl flex flex-col lg:flex-row relative">

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium uppercase tracking-wider">
          Fechar
        </button>

        {/* Main Column */}
        <div className={`${showSummary ? 'order-2 lg:order-2 flex-1 lg:border-l border-line' : 'flex-1'} p-5 sm:p-8 lg:p-12 bg-surface-up relative flex flex-col`}>
          {renderMainContent()}
        </div>

        {/* Order Summary Sidebar */}
        {showSummary && summaryPlan && (
          <div className="order-1 lg:order-1 w-full lg:w-[400px] bg-glass p-5 sm:p-8 lg:p-12 flex flex-col">
            <h3 className="text-sm uppercase tracking-wider text-content-3 mb-4 sm:mb-6">Resumo do Pedido</h3>
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-content text-lg mb-1">{summaryPlan.name}</div>
                  <div className="text-content-3 text-sm">{summaryPlan.description}</div>
                </div>
                <div className="text-accent text-xl font-light whitespace-nowrap">
                  {formatBRL(summaryPlan.amount_cents || 0)}
                </div>
              </div>

              <div className="border-t border-line pt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-content-3">Subtotal</span>
                  <span className="text-content">{formatBRL(summaryPlan.amount_cents || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-3">Trial</span>
                  <span className="text-green-500">
                    {step === 'active'
                      ? (billing?.status === "trialing" ? "Em teste" : "Já utilizado")
                      : `${summaryPlan.trial_days || 0} dias grátis`}
                  </span>
                </div>
              </div>

              <div className="border-t border-line pt-6 flex justify-between items-end">
                <span className="text-content-2 font-medium">Total hoje</span>
                <div className="text-right">
                  <span className="text-2xl text-content font-light">R$ 0,00</span>
                  <div className="text-xs text-content-4 mt-1">Cobrança após o trial</div>
                </div>
              </div>

              <div className="bg-surface-card border border-line rounded-xl p-4 mt-auto">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-accent">✓</span>
                  <span className="text-sm text-content">Garantia de satisfação</span>
                </div>
                <div className="text-xs text-content-4">
                  Cancele a qualquer momento antes do fim do período de teste e não seja cobrado.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <UpdatePaymentModal
        token={token}
        open={showUpdatePayment}
        onClose={() => setShowUpdatePayment(false)}
        onSuccess={async () => {
          const updated = await api.getBillingOverview(token);
          setBilling(updated);
        }}
      />
    </div>
  );
}