import { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CheckoutForm } from './CheckoutForm';
import * as api from '../lib/api';

// Inicializar stripe fora do render para nao recriar a instancia a cada render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface SubscriptionPageProps {
  token: string;
  onLogout?: () => void;
}

export const SubscriptionPage = ({ token, onLogout }: SubscriptionPageProps) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cria a assinatura no backend e pega o clientSecret
      const data = await api.subscribeBilling(token);
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
        {!clientSecret ? (
          <div className="flex flex-col gap-4">
            <div className="bg-surface-card border border-line rounded-2xl p-6 text-left">
              <h3 className="text-lg font-medium text-content mb-4 border-b border-line pb-2">Plano Pro</h3>
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
                  <span>7 dias gratuitos</span>
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
                  colorText: 'var(--color-content)',
                  colorBackground: 'transparent',
                  colorDanger: 'var(--color-red-500)',
                },
                rules: {
                  '.Input': {
                    borderBottom: '1px solid var(--color-line)',
                    borderRadius: '0',
                    padding: '8px 0',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                  },
                  '.Input:focus': {
                    borderBottomColor: 'var(--color-line-strong)',
                    boxShadow: 'none',
                  },
                  '.Label': {
                    color: 'var(--color-content-2)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '4px',
                  }
                }
              }
            }}>
              <CheckoutForm onCancel={() => setClientSecret('')} />
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
