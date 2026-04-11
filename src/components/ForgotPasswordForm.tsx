import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "./ui/Spinner";
import * as api from "../lib/api";

interface ForgotPasswordFormProps {
  auth: ReturnType<typeof useAuth>;
}

export function ForgotPasswordForm({ auth }: ForgotPasswordFormProps) {
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const inputClass = "w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors";

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.forgotPassword(email);
      if (data.phone_hint) {
        setPhoneHint(data.phone_hint);
      }
      setMessage(data.message);
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Erro ao enviar codigo.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }
    if (newPassword.length < 8) {
      setError("A senha deve ter no minimo 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.resetPassword(phone, code, newPassword);
      setMessage(data.message);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full text-center mb-8">
        <h2 className="text-2xl font-light text-content mb-2">
          {step === "done" ? "Senha atualizada" : "Recuperar senha"}
        </h2>
        <p className="text-content-3 text-sm">
          {step === "email" && "Informe seu e-mail para receber o codigo via WhatsApp."}
          {step === "code" && `Codigo enviado para WhatsApp ****${phoneHint || "****"}`}
          {step === "done" && "Voce ja pode fazer login com a nova senha."}
        </p>
      </div>

      <div className="w-full max-w-[300px]">
        {message && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-xl text-center mb-5">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center mb-5">
            {error}
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-content-2 text-xs uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className={inputClass}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size="sm" colorClass="border-surface/30 border-t-surface" />}
              {loading ? "Enviando..." : "Enviar codigo"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-content-2 text-xs uppercase tracking-wider">Seu telefone (WhatsApp)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="5521999999999"
                required
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-content-2 text-xs uppercase tracking-wider">Codigo</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                required
                className={inputClass}
                maxLength={6}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-content-2 text-xs uppercase tracking-wider">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-content-2 text-xs uppercase tracking-wider">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size="sm" colorClass="border-surface/30 border-t-surface" />}
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </button>
          </form>
        )}

        {step === "done" && (
          <button
            onClick={() => auth.setScreen("login")}
            className="w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
          >
            Ir para o login
          </button>
        )}

        {step !== "done" && (
          <div className="mt-8 text-center">
            <button
              onClick={() => auth.setScreen("login")}
              className="text-content-3 hover:text-content text-sm transition-colors"
            >
              Voltar para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
