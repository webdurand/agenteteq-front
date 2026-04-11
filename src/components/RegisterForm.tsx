import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "./ui/Spinner";

interface RegisterFormProps {
  auth: ReturnType<typeof useAuth>;
}

export function RegisterForm({ auth }: RegisterFormProps) {
  const isGoogle = auth.registerMode === "google";
  const prev = auth.pendingRegistration;

  const maskPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
    if (digits.length <= 9) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  };

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    username: prev?.username || "",
    name: prev?.name || auth.googleData?.name || "",
    email: prev?.email || auth.googleData?.email || "",
    birth_date: prev?.birth_date || "",
    phone: prev?.phone ? maskPhone(prev.phone) : "",
    password: "",
    confirm_password: "",
  });

  const [localError, setLocalError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const validateStep = (s: number): boolean => {
    setLocalError("");
    if (s === 1) {
      if (!isGoogle) {
        if (!formData.email) { setLocalError("Preencha o e-mail."); return false; }
        if (!formData.password || formData.password.length < 8) { setLocalError("A senha deve ter no minimo 8 caracteres."); return false; }
        if (!/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) { setLocalError("A senha deve conter pelo menos uma letra maiuscula e um numero."); return false; }
        if (formData.password !== formData.confirm_password) { setLocalError("As senhas nao coincidem."); return false; }
      } else {
        if (!formData.password || formData.password.length < 8) { setLocalError("Crie uma senha com no minimo 8 caracteres."); return false; }
        if (!/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) { setLocalError("A senha deve conter pelo menos uma letra maiuscula e um numero."); return false; }
      }
    }
    if (s === 2) {
      if (!formData.username) { setLocalError("Escolha um username."); return false; }
      if (!isGoogle && !formData.name) { setLocalError("Preencha seu nome."); return false; }
      const cleanedPhone = formData.phone.replace(/\D/g, "");
      if (cleanedPhone.length < 12) { setLocalError("Digite um numero de telefone valido (DDI+DDD+Numero)."); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    auth.handleRegister({
      ...formData,
      phone: formData.phone.replace(/\D/g, ""),
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setFormData(prev => ({ ...prev, phone: maskPhone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const inputClass = "w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors";

  const stepTitles = [
    isGoogle ? "Criar senha" : "Conta",
    "Perfil",
    "Finalizar",
  ];

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full text-center mb-6">
        <h2 className="text-2xl font-light text-content mb-2">
          {isGoogle ? "Completar Cadastro" : "Criar Conta"}
        </h2>
        <p className="text-content-3 text-sm">{stepTitles[step - 1]}</p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i + 1 === step ? "w-6 bg-content" : i + 1 < step ? "bg-content/60" : "bg-line"
            }`}
          />
        ))}
      </div>

      {isGoogle && auth.googleData && step === 1 && (
        <div className="w-full max-w-[300px] mb-6 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-card border border-line">
          <div className="w-8 h-8 rounded-full bg-content/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-content">{auth.googleData.name.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-content truncate">{auth.googleData.name}</p>
            <p className="text-xs text-content-3 truncate">{auth.googleData.email}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-[300px] flex flex-col gap-5">
        {(localError || auth.error) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center">
            {localError || auth.error}
          </div>
        )}

        {/* Step 1: Email + Password */}
        {step === 1 && (
          <>
            {!isGoogle && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-content-2 text-xs uppercase tracking-wider">E-mail</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    required
                    className={inputClass}
                    autoFocus
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-content-2 text-xs uppercase tracking-wider">Senha</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={8}
                className={inputClass}
                autoFocus={isGoogle}
              />
              <span className="text-[10px] text-content-4 mt-1">Min. 8 caracteres, 1 maiuscula, 1 numero</span>
            </div>

            {!isGoogle && (
              <div className="flex flex-col gap-1">
                <label className="text-content-2 text-xs uppercase tracking-wider">Confirmar Senha</label>
                <input
                  name="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className={inputClass}
                />
              </div>
            )}

            <button
              type="button"
              onClick={nextStep}
              className="mt-4 w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
            >
              Continuar
            </button>
          </>
        )}

        {/* Step 2: Profile */}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-content-2 text-xs uppercase tracking-wider">Username</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="seu.nome"
                required
                className={inputClass}
                autoFocus
              />
            </div>

            {!isGoogle && (
              <div className="flex flex-col gap-1">
                <label className="text-content-2 text-xs uppercase tracking-wider">Nome</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                  required
                  className={inputClass}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-content-2 text-xs uppercase tracking-wider">Data de Nascimento</label>
              <input
                name="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-content-2 text-xs uppercase tracking-wider">Telefone (WhatsApp)</label>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+55 (21) 99999-9999"
                required
                className={inputClass}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-xl bg-transparent border border-line text-content font-medium tracking-wider uppercase text-sm hover:bg-surface-card transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="w-2/3 py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {/* Step 3: Terms + Submit */}
        {step === 3 && (
          <>
            <div className="bg-surface-card border border-line rounded-xl p-4 text-sm text-content-2 space-y-2">
              <p><span className="text-content font-medium">E-mail:</span> {formData.email || auth.googleData?.email}</p>
              <p><span className="text-content font-medium">Username:</span> @{formData.username}</p>
              <p><span className="text-content font-medium">Telefone:</span> {formData.phone}</p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-content"
              />
              <span className="text-xs text-content-3 leading-relaxed">
                Li e aceito os{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-content-2 hover:text-content">
                  Termos de Servico
                </a>{" "}
                e a{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-content-2 hover:text-content">
                  Politica de Privacidade
                </a>
              </span>
            </label>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-3 rounded-xl bg-transparent border border-line text-content font-medium tracking-wider uppercase text-sm hover:bg-surface-card transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={auth.loading || !acceptedTerms}
                className="w-2/3 py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {auth.loading && <Spinner size="sm" colorClass="border-surface/30 border-t-surface" />}
                {auth.loading ? "Aguarde..." : "Cadastrar"}
              </button>
            </div>
          </>
        )}
      </form>

      {step === 1 && !isGoogle && (
        <div className="mt-8 text-center">
          <button
            onClick={() => auth.setScreen("login")}
            className="text-content-3 hover:text-content text-sm transition-colors"
          >
            Ja tem uma conta? <span className="underline underline-offset-4">Entrar</span>
          </button>
        </div>
      )}

      {step === 1 && isGoogle && (
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              auth.setRegisterMode("register");
              auth.setScreen("login");
            }}
            className="text-content-4 hover:text-content-3 text-xs transition-colors"
          >
            Voltar para o login
          </button>
        </div>
      )}
    </div>
  );
}
