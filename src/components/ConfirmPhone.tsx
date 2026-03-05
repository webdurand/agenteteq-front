import { useAuth } from "../hooks/useAuth";
import { Spinner } from "./ui/Spinner";

interface ConfirmPhoneProps {
  auth: ReturnType<typeof useAuth>;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 12) {
    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) {
      return `+${ddi} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
    return `+${ddi} (${ddd}) ${rest}`;
  }
  return `+${digits}`;
}

export function ConfirmPhone({ auth }: ConfirmPhoneProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full text-center mb-8">
        <h2 className="text-2xl font-light text-content mb-2">Confirmar Número</h2>
        <p className="text-content-3 text-sm">
          Vamos enviar um código de verificação para este número via WhatsApp.
        </p>
      </div>

      {auth.error && (
        <div className="w-full max-w-[300px] bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center mb-6">
          {auth.error}
        </div>
      )}

      <div className="w-full max-w-[300px] mb-8 p-5 rounded-xl bg-surface-card border border-line text-center">
        <p className="text-content-4 text-xs uppercase tracking-wider mb-3">Número informado</p>
        <p className="text-2xl font-light text-content tracking-wide">{formatPhone(auth.phone)}</p>
      </div>

      <div className="w-full max-w-[300px] flex flex-col gap-3">
        <button
          onClick={auth.confirmRegistration}
          disabled={auth.loading}
          className="w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {auth.loading && <Spinner size="sm" colorClass="border-surface/30 border-t-surface" />}
          {auth.loading ? "Enviando..." : "Confirmar e Enviar Código"}
        </button>

        <button
          onClick={auth.editPhone}
          disabled={auth.loading}
          className="w-full py-3 rounded-xl bg-transparent border border-line text-content-2 font-medium tracking-wider uppercase text-sm hover:border-line-strong hover:text-content transition-colors disabled:opacity-50"
        >
          Editar Número
        </button>
      </div>
    </div>
  );
}
