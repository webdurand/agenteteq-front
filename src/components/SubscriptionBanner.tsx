import { useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { Spinner } from './ui/Spinner';

export const SubscriptionBanner = ({ token, planActive, status }: { token: string, planActive: boolean, status: string }) => {
  const [loading, setLoading] = useState(false);

  const handlePortal = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/billing/portal', { token, method: 'POST' });
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (planActive && status !== 'past_due') return null;

  return (
    <div className="bg-yellow-500/10 border-l-4 border-yellow-500/30 p-4 mb-4 rounded-r-md">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium text-yellow-500">
            {status === 'past_due' ? 'Falha no pagamento' : 'Sua assinatura expirou'}
          </h3>
          <p className="mt-1 text-sm text-yellow-500/80">
            {status === 'past_due' 
              ? 'Tivemos um problema ao cobrar seu cartão. Atualize seus dados para não perder o acesso.'
              : 'Você precisa assinar um plano para continuar usando o Teq.'}
          </p>
        </div>
        <div>
          {status === 'past_due' ? (
            <button
              onClick={handlePortal}
              disabled={loading}
              className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 text-sm font-medium rounded transition-colors flex items-center gap-2"
            >
              {loading && <Spinner size="sm" colorClass="border-yellow-500/30 border-t-yellow-500" />}
              {loading ? 'Aguarde...' : 'Atualizar Cartão'}
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()} // Forca reload pra ir pro SubscriptionPage (gerenciado no App.tsx)
              className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 text-sm font-medium rounded transition-colors"
            >
              Ver Planos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
