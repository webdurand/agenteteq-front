import React, { useState } from 'react';
import { 
  useStripe, 
  useElements, 
  CardNumberElement, 
  CardExpiryElement, 
  CardCvcElement,
  ExpressCheckoutElement
} from '@stripe/react-stripe-js';

interface CheckoutFormProps {
  onCancel: () => void;
}

const ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff', // Cor branca para contraste perfeito no dark mode
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '15px',
      '::placeholder': {
        color: '#3a3a3a', // Corresponde ao text-content-4
      },
      iconColor: '#666666',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
};

export const CheckoutForm = ({ onCancel }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [cpf, setCpf] = useState("");
  const [hasExpressCheckout, setHasExpressCheckout] = useState(false);

  const formatCpf = (val: string) => {
    return val.replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/dashboard?checkout=success',
        payment_method_data: {
          billing_details: {
            name: cardholderName,
          }
        }
      },
    });

    if (confirmError) {
      setError(confirmError.message || 'Ocorreu um erro ao processar o pagamento.');
    }
    setLoading(false);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Express Checkout (Apple Pay, Google Pay) */}
      <div className={`w-full ${!hasExpressCheckout ? 'hidden' : ''}`}>
        <ExpressCheckoutElement 
          onReady={(e) => {
            if (e.availablePaymentMethods) {
              setHasExpressCheckout(true);
            }
          }}
          onConfirm={() => {
            // ExpressCheckout handles confirmation automatically
          }}
        />
      </div>

      {hasExpressCheckout && (
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line"></div>
          </div>
          <div className="relative bg-surface-up px-4 text-xs tracking-widest uppercase text-content-4">
            Ou pague com cartão
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-4">
          {/* Nome no Cartão */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-content-3 mb-2">Nome no Cartão</label>
            <div className="bg-transparent border border-line rounded-xl p-3 focus-within:border-line-strong transition-colors">
              <input 
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Como impresso no cartão"
                className="w-full bg-transparent text-[#ffffff] placeholder-content-4 text-[15px] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* CPF */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-content-3 mb-2">CPF do Titular</label>
            <div className="bg-transparent border border-line rounded-xl p-3 focus-within:border-line-strong transition-colors">
              <input 
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                className="w-full bg-transparent text-[#ffffff] placeholder-content-4 text-[15px] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Número do Cartão */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-content-3 mb-2">Número do Cartão</label>
            <div className="bg-transparent border border-line rounded-xl p-3 focus-within:border-line-strong transition-colors">
              <CardNumberElement options={{...ELEMENT_OPTIONS, showIcon: true}} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Validade */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-content-3 mb-2">Validade</label>
              <div className="bg-transparent border border-line rounded-xl p-3 focus-within:border-line-strong transition-colors">
                <CardExpiryElement options={ELEMENT_OPTIONS} />
              </div>
            </div>

            {/* CVC */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-content-3 mb-2">CVC</label>
              <div className="bg-transparent border border-line rounded-xl p-3 focus-within:border-line-strong transition-colors">
                <CardCvcElement options={ELEMENT_OPTIONS} />
              </div>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-3 mt-2">
          <button
            type="submit"
            disabled={!stripe || loading}
            className="w-full py-3.5 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar Assinatura'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-transparent border border-line text-content font-medium tracking-wider uppercase text-sm hover:bg-surface-card transition-colors disabled:opacity-50"
          >
            Voltar
          </button>
        </div>
      </form>
    </div>
  );
};