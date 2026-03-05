import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

interface CheckoutFormProps {
  onCancel: () => void;
}

export const CheckoutForm = ({ onCancel }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/dashboard?checkout=success',
      },
    });

    if (confirmError) {
      setError(confirmError.message || 'Ocorreu um erro ao processar o pagamento.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <PaymentElement options={{
          layout: {
            type: 'accordion',
            defaultCollapsed: false,
            radios: true,
            spacedAccordionItems: true
          }
        }} />
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center">
          {error}
        </div>
      )}
      
      <div className="flex flex-col gap-3 mt-4">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Confirmar Assinatura'}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-transparent border border-line text-content font-medium tracking-wider uppercase text-sm hover:bg-surface-card transition-colors disabled:opacity-50"
        >
          Voltar
        </button>
      </div>
    </form>
  );
};
