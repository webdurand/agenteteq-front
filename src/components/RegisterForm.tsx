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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!isGoogle && formData.password !== formData.confirm_password) {
      setLocalError("As senhas não coincidem.");
      return;
    }

    if (formData.password.length < 8) {
      setLocalError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    const cleanedPhone = formData.phone.replace(/\D/g, "");
    if (cleanedPhone.length < 12) {
      setLocalError("Digite um número de telefone válido (DDI+DDD+Numero).");
      return;
    }

    auth.handleRegister({
      ...formData,
      phone: cleanedPhone,
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

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full text-center mb-8">
        <h2 className="text-2xl font-light text-content mb-2">
          {isGoogle ? "Completar Cadastro" : "Criar Conta"}
        </h2>
        <p className="text-content-3 text-sm">
          {isGoogle ? "Quase lá! Precisamos de mais alguns dados." : "Preencha os dados para começar"}
        </p>
      </div>

      {isGoogle && auth.googleData && (
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

        <div className="flex flex-col gap-1">
          <label className="text-content-2 text-xs uppercase tracking-wider">Username</label>
          <input
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="seu.nome"
            required
            className={inputClass}
          />
        </div>

        {!isGoogle && (
          <>
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
              />
            </div>
          </>
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
          />
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
              Termos de Serviço
            </a>{" "}
            e a{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-content-2 hover:text-content">
              Política de Privacidade
            </a>
          </span>
        </label>

        <button
          type="submit"
          disabled={auth.loading || !acceptedTerms}
          className="mt-4 w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {auth.loading && <Spinner size="sm" colorClass="border-surface/30 border-t-surface" />}
          {auth.loading ? "Aguarde..." : (isGoogle ? "Finalizar" : "Cadastrar")}
        </button>
      </form>

      {!isGoogle && (
        <div className="mt-8 text-center">
          <button 
            onClick={() => auth.setScreen("login")}
            className="text-content-3 hover:text-content text-sm transition-colors"
          >
            Já tem uma conta? <span className="underline underline-offset-4">Entrar</span>
          </button>
        </div>
      )}

      {isGoogle && (
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
