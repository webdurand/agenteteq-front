export const SubscriptionStatus = ({ status, trialEnd, planActive, hasStripeSubscription, onSubscribeClick }: { status: string, trialEnd: string | null, planActive?: boolean, hasStripeSubscription?: boolean, onSubscribeClick?: () => void }) => {
  
  let label = 'Desconhecido';
  let color = 'bg-gray-100 text-gray-800';

  // Se tem assinatura Stripe ativa (mesmo em trial pago), é Premium
  const isPro = hasStripeSubscription && (status === 'trialing' || status === 'active');
  const isFree = !hasStripeSubscription && (status === 'free' || status === 'incomplete' || !status || status === 'unknown');

  if (isPro) {
    label = 'Premium';
    color = 'bg-green-500/15 border border-green-500/30 text-green-500';
    if (status === 'trialing' && trialEnd) {
      const days = Math.ceil((new Date(trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0) label = `Premium (Trial ${days}d)`;
    }
  } else if (isFree) {
    label = 'Free';
    color = 'bg-surface border border-line text-content-2';
  } else if (status === 'past_due') {
    label = 'Pagamento Pendente';
    color = 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500';
  } else if (status === 'canceled') {
    label = 'Cancelado';
    color = 'bg-red-500/10 border border-red-500/20 text-red-500';
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] uppercase tracking-wider font-medium whitespace-nowrap ${color}`}>
        {label}
      </span>
      {isFree && onSubscribeClick && (
        <button 
          onClick={onSubscribeClick}
          className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-surface bg-accent hover:bg-accent/90 transition-colors px-2 py-0.5 rounded-full whitespace-nowrap"
        >
          Assinar Agora
        </button>
      )}
    </div>
  );
};
