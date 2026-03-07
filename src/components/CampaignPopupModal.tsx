interface CampaignPopup {
  id: number;
  title: string;
  message: string;
  image_url?: string | null;
  cta_label?: string | null;
  cta_action?: "open_checkout" | "open_account" | "external_url";
  cta_url?: string | null;
}

interface CampaignPopupModalProps {
  open: boolean;
  campaign: CampaignPopup | null;
  onClose: () => void;
  onOpenCheckout: () => void;
  onOpenAccount: () => void;
}

export function CampaignPopupModal({
  open,
  campaign,
  onClose,
  onOpenCheckout,
  onOpenAccount,
}: CampaignPopupModalProps) {
  if (!open || !campaign) return null;

  const handleAction = () => {
    const action = campaign.cta_action || "open_checkout";
    if (action === "open_checkout") {
      onOpenCheckout();
      return;
    }
    if (action === "open_account") {
      onOpenAccount();
      return;
    }
    if (action === "external_url" && campaign.cta_url) {
      window.open(campaign.cta_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl rounded-3xl bg-surface-up border border-line shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface/70 backdrop-blur-md border border-line text-content-2 hover:text-content"
          aria-label="Fechar popup"
        >
          ×
        </button>

        {campaign.image_url ? (
          <img src={campaign.image_url} alt={campaign.title} className="w-full h-52 object-cover" />
        ) : (
          <div className="w-full h-52 bg-gradient-to-br from-indigo-300/40 via-blue-300/30 to-pink-300/40" />
        )}

        <div className="p-6 sm:p-8">
          <h3 className="text-3xl font-light text-content">{campaign.title}</h3>
          <p className="mt-3 text-content-2 leading-relaxed">{campaign.message}</p>
          <button
            onClick={handleAction}
            className="mt-6 px-6 py-3 rounded-full bg-content text-surface text-sm font-medium tracking-wider uppercase hover:opacity-90 transition-opacity"
          >
            {campaign.cta_label || "Experimentar Premium"}
          </button>
        </div>
      </div>
    </div>
  );
}
