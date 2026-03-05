export const SubscriptionStatus = ({ status, trialEnd, planActive, onSubscribeClick }: { status: string, trialEnd: string | null, planActive?: boolean, onSubscribeClick?: () => void }) => {
  
  let label = 'Desconhecido';
  let color = 'bg-gray-100 text-gray-800';

  if ((!status || status === 'unknown' || status === 'incomplete') && planActive) {
    status = trialEnd ? 'trialing' : 'active';
  }

  const isTrial = status === 'trialing';

  if (status === 'active') {
    label = 'Ativo';
    color = 'bg-green-100 text-green-800 border-transparent';
  } else if (status === 'trialing') {
    label = 'Trial';
    color = 'bg-surface border border-line text-content-2';
    if (trialEnd) {
      const days = Math.ceil((new Date(trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0) label = `Trial (${days} dias restantes)`;
    }
  } else if (status === 'past_due') {
    label = 'Pagamento Pendente';
    color = 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500';
  } else if (status === 'canceled') {
    label = 'Cancelado';
    color = 'bg-red-500/10 border border-red-500/20 text-red-500';
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${color}`}>
        {label}
      </span>
      {isTrial && onSubscribeClick && (
        <button 
          onClick={onSubscribeClick}
          className="text-[10px] font-bold tracking-wider uppercase text-surface bg-accent hover:bg-accent/90 transition-colors px-2 py-0.5 rounded-full"
        >
          Assinar Agora
        </button>
      )}
    </div>
  );
};
