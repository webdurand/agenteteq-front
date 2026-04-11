import { useState } from "react";

interface CancellationModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

const REASONS = [
  { id: "expensive", label: "Muito caro para mim" },
  { id: "not_using", label: "Nao estou usando o suficiente" },
  { id: "alternative", label: "Encontrei uma alternativa" },
  { id: "missing_feature", label: "Falta alguma funcionalidade" },
  { id: "other", label: "Outro motivo" },
];

export function CancellationModal({ onConfirm, onClose }: CancellationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState("");

  const retentionMessage = (() => {
    switch (reason) {
      case "expensive":
        return "Que tal pausar sua assinatura por 1 mes? Voce mantem seus dados e pode reativar quando quiser.";
      case "not_using":
        return "Talvez voce ainda nao tenha explorado tudo. Sabia que o Teq pode gerar carrosseis, monitorar redes sociais e agendar lembretes?";
      case "alternative":
        return "Gostaríamos de entender o que a alternativa oferece que nos nao temos. Quer compartilhar?";
      case "missing_feature":
        return "Nos conte o que falta! Estamos sempre melhorando com base no feedback dos usuarios.";
      default:
        return "Antes de ir, considere que voce pode pausar sua assinatura e voltar quando fizer sentido.";
    }
  })();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-up border border-line rounded-2xl w-full max-w-md p-6 md:p-8 shadow-2xl">
        {/* Step 1: Reason selection */}
        {step === 1 && (
          <>
            <h3 className="text-lg font-medium text-content mb-2">Por que quer cancelar?</h3>
            <p className="text-sm text-content-3 mb-6">Seu feedback nos ajuda a melhorar.</p>
            <div className="space-y-2 mb-6">
              {REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    reason === r.id
                      ? "border-content bg-surface-card"
                      : "border-line hover:border-line-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="accent-content"
                  />
                  <span className="text-sm text-content">{r.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="w-1/2 py-3 rounded-xl border border-line text-sm tracking-wider uppercase text-content hover:bg-surface-card transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => reason && setStep(2)}
                disabled={!reason}
                className="w-1/2 py-3 rounded-xl bg-content text-surface text-sm tracking-wider uppercase font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {/* Step 2: Retention offer */}
        {step === 2 && (
          <>
            <h3 className="text-lg font-medium text-content mb-2">Antes de ir...</h3>
            <div className="bg-surface-card border border-line rounded-xl p-4 mb-6">
              <p className="text-sm text-content-2 leading-relaxed">{retentionMessage}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-content text-surface text-sm tracking-wider uppercase font-medium hover:opacity-90 transition-opacity"
              >
                Manter minha assinatura
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-full py-2.5 text-content-3 hover:text-content text-xs uppercase tracking-wider transition-colors"
              >
                Quero cancelar mesmo assim
              </button>
            </div>
          </>
        )}

        {/* Step 3: Final confirmation */}
        {step === 3 && (
          <>
            <h3 className="text-lg font-medium text-content mb-2">Confirmar cancelamento</h3>
            <p className="text-sm text-content-3 mb-6">
              Sua assinatura sera cancelada ao fim do periodo atual. Voce continuara com acesso ate la.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="w-1/2 py-3 rounded-xl border border-line text-sm tracking-wider uppercase text-content hover:bg-surface-card transition-colors"
              >
                Manter
              </button>
              <button
                onClick={onConfirm}
                className="w-1/2 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm tracking-wider uppercase font-medium hover:bg-red-500/20 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
