import { useState } from "react";

interface LoginModalProps {
  onLogin: (phone: string) => void;
}

export function LoginModal({ onLogin }: LoginModalProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Digite um número válido com DDD (ex: 11999999999)");
      return;
    }
    onLogin(cleaned);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface-overlay backdrop-blur-sm z-50">
      <div className="w-full max-w-sm mx-4 rounded-2xl p-8 bg-surface-up border border-line shadow-2xl">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 border border-line-strong"
          >
            <span className="text-content text-2xl font-light tracking-widest">T</span>
          </div>
          <h1 className="text-2xl font-light tracking-[0.3em] text-content uppercase mb-1">TEQ</h1>
          <p className="text-content-3 text-sm">Identificação por número</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-content-2 text-xs tracking-widest uppercase">
              Número de telefone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              placeholder="55 11 99999-9999"
              autoFocus
              className="
                w-full px-4 py-3 rounded-xl
                bg-surface-card border border-line
                text-content placeholder-content-4
                focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-line-strong
                transition-all duration-200 text-sm
              "
            />
            {error && (
              <p className="text-red-500 text-xs mt-0.5">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="
              w-full py-3 rounded-xl font-medium text-sm tracking-wider
              bg-content text-surface
              hover:opacity-90 active:opacity-80
              transition-all duration-200 active:scale-[0.98]
            "
          >
            ENTRAR
          </button>
        </form>

        <p className="text-content-3 text-xs text-center mt-6 leading-relaxed">
          Seu número identifica você no Teq —<br />
          a mesma memória do WhatsApp.
        </p>
      </div>
    </div>
  );
}
