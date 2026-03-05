import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import * as api from "../lib/api";
import { CheckoutForm } from "./CheckoutForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

interface CheckoutModalProps {
  token: string;
  open: boolean;
  onClose: () => void;
  priceId?: string;
}

export function CheckoutModal({ token, open, onClose, priceId }: CheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  useEffect(() => {
    if (!open) {
      setClientSecret("");
      setError(null);
      setPaymentStatus('idle');
      return;
    }
    
    let isMounted = true;
    
    const initCheckout = async () => {
      setLoading(true);
      setError(null);
      try {
        const [plansData, subData] = await Promise.all([
          api.getBillingPlans(token),
          api.subscribeBilling(token, priceId)
        ]);
        
        if (!isMounted) return;
        
        const activePlan = plansData.plans.find((p: any) => priceId ? p.code === priceId : true) || plansData.plans[0];
        setPlan(activePlan);
        setClientSecret(subData.client_secret);
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.message || err.detail || err;
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    initCheckout();
    
    return () => {
      isMounted = false;
    };
  }, [open, token, priceId]);

  useEffect(() => {
    if (paymentStatus !== 'processing') return;

    let isPolling = true;
    const pollStatus = async () => {
      try {
        const data = await api.getBillingOverview(token);
        if ((data.status === 'active' || data.status === 'trialing') && isPolling) {
          setPaymentStatus('success');
        }
      } catch (err) {
        // ignore errors
      }
    };

    const interval = setInterval(pollStatus, 3000);
    pollStatus(); // initial call

    return () => {
      isPolling = false;
      clearInterval(interval);
    };
  }, [paymentStatus, token]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-up border border-line shadow-2xl flex flex-col lg:flex-row relative">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 z-10 px-4 py-2 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium uppercase tracking-wider">
          Fechar
        </button>

        {/* Left Column - Payment */}
        <div className="flex-1 p-8 lg:p-12 lg:border-r border-line bg-surface-up relative">
          <h2 className="text-2xl font-light text-content mb-2">Finalizar Assinatura</h2>
          <p className="text-sm text-content-3 mb-8">Escolha sua forma de pagamento preferida</p>
          
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl">
              {error}
            </div>
          ) : paymentStatus === 'processing' ? (
            <div className="relative w-full min-h-[400px] flex flex-col items-center justify-center gap-6 text-center animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded-full border-4 border-line border-t-accent animate-spin mb-2"></div>
              <div>
                <h3 className="text-2xl font-light text-content mb-2">Processando Pagamento</h3>
                <p className="text-content-3">Aguarde enquanto confirmamos sua assinatura com a operadora...</p>
              </div>
            </div>
          ) : paymentStatus === 'success' ? (
            <div className="relative w-full min-h-[400px] flex flex-col items-center justify-center gap-6 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-light text-content mb-2">Assinatura Confirmada!</h3>
                <p className="text-content-3">Seu pagamento foi processado com sucesso.</p>
              </div>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="mt-4 px-8 py-3.5 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
              >
                Utilizar meu agente
              </button>
            </div>
          ) : (
            <div className="relative w-full min-h-[400px] flex items-center justify-center">
              {/* Spinner de Loading */}
              <div 
                className={`absolute inset-0 z-10 transition-opacity duration-500 flex flex-col items-center justify-center gap-4 ${
                  clientSecret ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                <div className="w-8 h-8 rounded-full border-2 border-line border-t-content animate-spin"></div>
                <div className="text-content-3 text-sm tracking-wider uppercase font-medium">Conectando ao ambiente seguro...</div>
              </div>

              {/* Elemento Real do Stripe */}
              <div className={`w-full transition-opacity duration-500 ${clientSecret ? "opacity-100" : "opacity-0"}`}>
                {clientSecret && (
                  <Elements stripe={stripePromise} options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                    },
                  }}>
                    <CheckoutForm 
                      onCancel={onClose} 
                      clientSecret={clientSecret} 
                      onSuccess={() => setPaymentStatus('processing')}
                    />
                  </Elements>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="w-full lg:w-[400px] bg-glass p-8 lg:p-12 flex flex-col relative">
          <h3 className="text-sm uppercase tracking-wider text-content-3 mb-6">Resumo do Pedido</h3>
          
          {/* Skeleton Overlay for Summary */}
          <div className={`absolute left-8 right-8 top-[84px] bottom-12 z-10 transition-opacity duration-500 flex flex-col ${
            plan ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}>
            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="w-3/4 h-6 bg-line/30 rounded animate-pulse"></div>
                  <div className="w-full h-4 bg-line/20 rounded animate-pulse"></div>
                </div>
                <div className="w-20 h-6 bg-line/30 rounded animate-pulse"></div>
              </div>
              
              <div className="border-t border-line/30 pt-6 space-y-3">
                <div className="flex justify-between">
                  <div className="w-16 h-4 bg-line/30 rounded animate-pulse"></div>
                  <div className="w-16 h-4 bg-line/30 rounded animate-pulse"></div>
                </div>
                <div className="flex justify-between">
                  <div className="w-12 h-4 bg-line/30 rounded animate-pulse"></div>
                  <div className="w-24 h-4 bg-green-500/20 rounded animate-pulse"></div>
                </div>
              </div>
              
              <div className="border-t border-line/30 pt-6 flex justify-between items-end">
                <div className="w-20 h-5 bg-line/30 rounded animate-pulse"></div>
                <div className="space-y-2 flex flex-col items-end">
                  <div className="w-24 h-8 bg-line/40 rounded animate-pulse"></div>
                  <div className="w-32 h-3 bg-line/20 rounded animate-pulse"></div>
                </div>
              </div>

              <div className="bg-surface-card border border-line rounded-xl p-4 mt-auto">
                <div className="w-40 h-4 bg-line/30 rounded mb-3 animate-pulse"></div>
                <div className="w-full h-3 bg-line/20 rounded mb-2 animate-pulse"></div>
                <div className="w-3/4 h-3 bg-line/20 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className={`flex-1 flex flex-col transition-opacity duration-500 ${plan ? "opacity-100" : "opacity-0"}`}>
            {plan && (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-content text-lg mb-1">{plan.name}</div>
                    <div className="text-content-3 text-sm">{plan.description}</div>
                  </div>
                  <div className="text-accent text-xl font-light whitespace-nowrap">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: (plan.currency || "BRL").toUpperCase() }).format(plan.amount_cents / 100)}
                  </div>
                </div>
                
                <div className="border-t border-line pt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-content-3">Subtotal</span>
                    <span className="text-content">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: (plan.currency || "BRL").toUpperCase() }).format(plan.amount_cents / 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-content-3">Trial</span>
                    <span className="text-green-500">{plan.trial_days} dias grátis</span>
                  </div>
                </div>
                
                <div className="border-t border-line pt-6 flex justify-between items-end">
                  <span className="text-content-2 font-medium">Total hoje</span>
                  <div className="text-right">
                    <span className="text-2xl text-content font-light">R$ 0,00</span>
                    <div className="text-xs text-content-4 mt-1">
                      Cobrança após o trial
                    </div>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}