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
    <div className="fixed inset-0 flex items-center justify-center bg-navy-900/95 backdrop-blur-sm z-50">
      <div
        className="
          w-full max-w-sm mx-4 rounded-2xl p-8
          bg-navy-800/60 backdrop-blur-md
          border border-navy-600/30
        "
        style={{
          boxShadow: "0 0 60px 10px rgba(30, 58, 138, 0.15), 0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo / título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{
              background: "radial-gradient(circle at 38% 35%, #1e40af 0%, #0a1628 80%)",
              boxShadow: "0 0 30px 8px rgba(59, 130, 246, 0.2)",
            }}
          >
            <span className="text-navy-200 text-2xl font-light tracking-widest">T</span>
          </div>
          <h1 className="text-2xl font-light tracking-[0.3em] text-white uppercase mb-1">TEQ</h1>
          <p className="text-navy-400 text-sm">Identificação por número</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-navy-300 text-xs tracking-widest uppercase">
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
                bg-navy-900/60 border border-navy-600/40
                text-white placeholder-navy-500
                focus:outline-none focus:border-navy-400/60 focus:ring-1 focus:ring-navy-400/30
                transition-all duration-200 text-sm
              "
            />
            {error && (
              <p className="text-red-400 text-xs mt-0.5">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="
              w-full py-3 rounded-xl font-medium text-sm tracking-wider
              bg-navy-600 hover:bg-navy-500 active:bg-navy-700
              text-white transition-all duration-200 active:scale-98
              border border-navy-500/30
            "
            style={{
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.15)",
            }}
          >
            ENTRAR
          </button>
        </form>

        <p className="text-navy-500 text-xs text-center mt-6 leading-relaxed">
          Seu número identifica você no Teq —<br />
          a mesma memória do WhatsApp.
        </p>
      </div>
    </div>
  );
}
