import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import * as api from "../lib/api";
import { CheckoutForm } from "./CheckoutForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

interface UpdatePaymentModalProps {
  token: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UpdatePaymentModal({ token, open, onClose, onSuccess }: UpdatePaymentModalProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success">("idle");

  useEffect(() => {
    if (!open) {
      setClientSecret("");
      setError(null);
      setStatus("idle");
      return;
    }
    let mounted = true;
    api.setupPaymentMethod(token)
      .then((data) => { if (mounted) setClientSecret(data.client_secret); })
      .catch((err) => { if (mounted) setError(err.message || "Erro ao iniciar atualização."); });
    return () => { mounted = false; };
  }, [open, token]);

  const handleSuccess = async (pmId?: string) => {
    if (pmId) {
      try {
        await api.updateDefaultPayment(token, pmId);
      } catch {
        // não crítico — webhook pode sincronizar
      }
    }
    setStatus("success");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-surface-up border border-line shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <div>
            <h2 className="text-lg font-light text-content">Atualizar cartão</h2>
            <p className="text-xs text-content-3 mt-0.5">O novo cartão será o padrão para cobranças futuras</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium uppercase tracking-wider"
          >
            Fechar
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl">
              {error}
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center justify-center gap-5 py-8 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-light text-content mb-1">Cartão atualizado!</h3>
                <p className="text-sm text-content-3">Suas próximas cobranças usarão o novo cartão.</p>
              </div>
              <button
                onClick={() => { onClose(); if (onSuccess) onSuccess(); }}
                className="px-6 py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
              >
                Concluir
              </button>
            </div>
          ) : (
            <div className="relative min-h-[300px] flex items-center justify-center">
              <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 ${clientSecret ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                <div className="w-7 h-7 rounded-full border-2 border-line border-t-content animate-spin" />
                <span className="text-xs text-content-3 uppercase tracking-wider">Carregando ambiente seguro...</span>
              </div>

              <div className={`w-full transition-opacity duration-300 ${clientSecret ? "opacity-100" : "opacity-0"}`}>
                {clientSecret && (
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                    <CheckoutForm
                      onCancel={onClose}
                      clientSecret={clientSecret}
                      onSuccess={handleSuccess}
                      submitLabel="Salvar novo cartão"
                    />
                  </Elements>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
