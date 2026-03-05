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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    if (!open) {
      setClientSecret("");
      setError(null);
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-up border border-line shadow-2xl flex flex-col lg:flex-row relative">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 z-10 px-4 py-2 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium uppercase tracking-wider">
          Fechar
        </button>

        {/* Left Column - Payment */}
        <div className="flex-1 p-8 lg:p-12 lg:border-r border-line bg-surface-up">
          <h2 className="text-2xl font-light text-content mb-2">Finalizar Assinatura</h2>
          <p className="text-sm text-content-3 mb-8">Escolha sua forma de pagamento preferida</p>
          
          {loading ? (
            <div className="text-content-3 text-sm animate-pulse">Preparando checkout...</div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl">
              {error}
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  fontFamily: "inherit",
                  colorText: "var(--color-content)",
                  colorBackground: "transparent",
                  colorDanger: "var(--color-red-500)",
                },
                rules: {
                  ".Input": {
                    borderBottom: "1px solid var(--color-line)",
                    borderRadius: "0",
                    padding: "8px 0",
                    backgroundColor: "transparent",
                    boxShadow: "none",
                  },
                  ".Input:focus": {
                    borderBottomColor: "var(--color-line-strong)",
                    boxShadow: "none",
                  },
                  ".Label": {
                    color: "var(--color-content-2)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "4px",
                  },
                },
              },
            }}>
              <CheckoutForm onCancel={onClose} />
            </Elements>
          ) : null}
        </div>

        {/* Right Column - Summary */}
        <div className="w-full lg:w-[400px] bg-glass p-8 lg:p-12 flex flex-col">
          <h3 className="text-sm uppercase tracking-wider text-content-3 mb-6">Resumo do Pedido</h3>
          
          {plan ? (
            <div className="space-y-6 flex-1">
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
          ) : (
            <div className="text-content-3 text-sm">Carregando detalhes do plano...</div>
          )}
        </div>
      </div>
    </div>
  );
}