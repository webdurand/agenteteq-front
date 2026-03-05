import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

interface VerifyCodeProps {
  auth: ReturnType<typeof useAuth>;
  purpose: "register" | "login_2fa";
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

export function VerifyCode({ auth, purpose }: VerifyCodeProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(120);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    if (!/^[a-zA-Z0-9]*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const nextFocus = Math.min(pasted.length, 5);
    inputs.current[nextFocus]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) return;

    if (purpose === "register") {
      auth.handleVerifyWhatsapp(fullCode);
    } else {
      auth.handleVerify2fa(fullCode);
    }
  };

  const handleResend = () => {
    auth.handleResendCode(purpose);
    setTimeLeft(120);
    setCode(["", "", "", "", "", ""]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full text-center mb-8">
        <h2 className="text-2xl font-light text-content mb-2">Verificação</h2>
        <p className="text-content-3 text-sm">
          Enviamos um código para o WhatsApp<br />
          <span className="font-medium text-content-2">{formatPhone(auth.phone)}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-6">
        {auth.error && (
          <div className="w-full max-w-[300px] bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center">
            {auth.error}
          </div>
        )}

        <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-medium bg-surface-card border border-line focus:border-line-strong rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-line-strong transition-colors"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={auth.loading || code.join("").length < 6}
          className="w-full max-w-[200px] py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {auth.loading ? "Verificando..." : "Confirmar"}
        </button>
      </form>

      <div className="mt-8 text-center flex flex-col items-center gap-2">
        <p className="text-content-3 text-sm">
          Tempo restante: <span className="font-medium">{formatTime(timeLeft)}</span>
        </p>
        <button
          onClick={handleResend}
          disabled={timeLeft > 0 || auth.loading}
          className="text-content-2 hover:text-content text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed underline underline-offset-4"
        >
          Reenviar código
        </button>
      </div>
      
      <div className="mt-6 text-center">
        <button 
          onClick={() => auth.setScreen("login")}
          className="text-content-4 hover:text-content-3 text-xs transition-colors"
        >
          Voltar para o login
        </button>
      </div>
    </div>
  );
}
