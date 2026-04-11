import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CheckoutForm } from './CheckoutForm';
import * as api from '../lib/api';

// Inicializar stripe fora do render para nao recriar a instancia a cada render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface SubscriptionPageProps {
  token: string;
  onLogout?: () => void;
  onPaymentSuccess?: () => void;
}

const formatPrice = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export const SubscriptionPage = ({ token, onLogout, onPaymentSuccess }: SubscriptionPageProps) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'timeout'>('idle');
  const [plan, setPlan] = useState<{ name: string; amount_cents: number; trial_days: number; features_json: string } | null>(null);

  useEffect(() => {
    api.getBillingPlans(token).then((data: any) => {
      const plans = data.plans || data || [];
      const active = Array.isArray(plans) ? plans.find((p: any) => p.code !== 'free') : null;
      if (active) setPlan(active);
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (paymentStatus !== 'processing') return;

    let isPolling = true;
    let attempts = 0;
    const maxAttempts = 20; // 60s max (20 * 3s)

    const pollStatus = async () => {
      attempts++;
      try {
        const data = await api.getBillingOverview(token);
        if ((data.status === 'active' || data.status === 'trialing') && isPolling) {
          setPaymentStatus('success');
          return;
        }
      } catch (err) {
        // ignore errors
      }
      if (attempts >= maxAttempts && isPolling) {
        // Timeout — NÃO assumir sucesso. Mostrar estado de verificação manual.
        setPaymentStatus('timeout');
      }
    };

    const interval = setInterval(pollStatus, 3000);
    pollStatus(); // initial call

    return () => {
      isPolling = false;
      clearInterval(interval);
    };
  }, [paymentStatus, token]);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cria a assinatura no backend e pega o clientSecret
      const data = await api.setupBilling(token);
      setClientSecret(data.client_secret);
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar assinatura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full text-center mb-8">
        <h2 className="text-2xl font-light text-content mb-2">Seja Premium</h2>
        <p className="text-content-3 text-sm">
          Obtenha acesso ilimitado a todas as ferramentas.
        </p>
      </div>

      <div className="w-full max-w-[300px] flex flex-col gap-5">
        {paymentStatus === 'processing' ? (
          <div className="relative w-full py-12 flex flex-col items-center justify-center gap-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full border-4 border-line border-t-accent animate-spin mb-2"></div>
            <div>
              <h3 className="text-2xl font-light text-content mb-2">Processando Pagamento</h3>
              <p className="text-content-3">Aguarde enquanto confirmamos sua assinatura com a operadora...</p>
            </div>
          </div>
        ) : paymentStatus === 'success' ? (
          <div className="relative w-full py-12 flex flex-col items-center justify-center gap-6 text-center animate-in fade-in zoom-in duration-500">
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
                if (onPaymentSuccess) onPaymentSuccess();
              }}
              className="mt-4 w-full py-3.5 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
            >
              Utilizar meu agente
            </button>
          </div>
        ) : paymentStatus === 'timeout' ? (
          <div className="relative w-full py-12 flex flex-col items-center justify-center gap-6 text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-2">
              <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-light text-content mb-2">Verificando pagamento</h3>
              <p className="text-content-3">A confirmação está demorando mais que o normal. Seu pagamento pode estar sendo processado pela operadora.</p>
            </div>
            <button
              onClick={() => setPaymentStatus('processing')}
              className="mt-2 w-full py-3.5 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
            >
              Verificar novamente
            </button>
            <button
              onClick={() => {
                if (onPaymentSuccess) onPaymentSuccess();
              }}
              className="w-full py-2.5 text-content-3 hover:text-content text-xs uppercase tracking-wider transition-colors"
            >
              Voltar ao dashboard
            </button>
          </div>
        ) : !clientSecret ? (
          <div className="flex flex-col gap-4">
            <div className="bg-surface-card border border-line rounded-2xl p-6 text-left">
              <h3 className="text-lg font-medium text-content mb-2 border-b border-line pb-2">{plan?.name || 'Plano Premium'}</h3>
              {plan && (
                <div className="mb-4">
                  <span className="text-3xl font-light text-content">{formatPrice(plan.amount_cents)}</span>
                  <span className="text-content-3 text-sm">/mês</span>
                </div>
              )}
              <ul className="space-y-3 mb-2">
                <li className="flex items-start gap-2 text-sm text-content-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Acesso ilimitado ao WhatsApp</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-content-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Transcrição de áudio sem limites</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-content-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Tarefas e lembretes integrados</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-content-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>{plan?.trial_days || 7} dias gratuitos</span>
                </li>
              </ul>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center">
                {error}
              </div>
            )}
            
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
            >
              {loading ? 'Preparando...' : 'Assinar Agora'}
            </button>
          </div>
        ) : (
          <div className="w-full">
            <Elements stripe={stripePromise} options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  fontFamily: 'inherit',
                  colorText: 'var(--fg)',
                  colorBackground: 'transparent',
                  colorDanger: '#ef4444',
                },
                rules: {
                  '.Input': {
                    borderBottom: '1px solid var(--border)',
                    borderRadius: '0',
                    padding: '8px 0',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                  },
                  '.Input:focus': {
                    borderBottomColor: 'var(--border-strong)',
                    boxShadow: 'none',
                  },
                  '.Label': {
                    color: 'var(--fg-2)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '4px',
                  }
                }
              }
            }}>
              <CheckoutForm 
                onCancel={() => setClientSecret('')} 
                clientSecret={clientSecret}
                onSuccess={() => setPaymentStatus('processing')}
              />
            </Elements>
          </div>
        )}

        {onLogout && (
          <div className="mt-8 text-center">
            <button 
              onClick={onLogout}
              className="text-content-4 hover:text-content-3 text-xs transition-colors uppercase tracking-wider"
            >
              Sair da conta
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
