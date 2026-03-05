import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "./ui/Spinner";

declare global {
  interface Window {
    google: any;
  }
}

interface LoginFormProps {
  auth: ReturnType<typeof useAuth>;
}

export function LoginForm({ auth }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const googleContainerRef = useRef<HTMLDivElement>(null);
  const authRef = useRef(auth);
  authRef.current = auth;

  const renderGoogleButton = useCallback(() => {
    if (!window.google || !googleContainerRef.current) return;
    
    googleContainerRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
      callback: (response: any) => {
        authRef.current.handleGoogleAuth(response.credential);
      },
    });
    window.google.accounts.id.renderButton(
      googleContainerRef.current,
      { theme: document.documentElement.classList.contains("dark") ? "filled_black" : "outline", size: "large", shape: "pill", width: 300 }
    );
  }, []);

  useEffect(() => {
    const scriptId = "google-gsi-script";
    const existing = document.getElementById(scriptId);
    
    if (existing && window.google) {
      renderGoogleButton();
      return;
    }

    if (!existing) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => renderGoogleButton();
      document.body.appendChild(script);
    }
  }, [renderGoogleButton]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    auth.handleLogin(email, password);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full text-center mb-8">
        <h2 className="text-2xl font-light text-content mb-2">Bem-vindo</h2>
        <p className="text-content-3 text-sm">Faça login para continuar</p>
      </div>

      <div className="w-full flex flex-col items-center gap-4 mb-6">
        <div ref={googleContainerRef} className="h-[40px] flex items-center justify-center"></div>
        
        <div className="flex items-center w-full max-w-[300px] gap-4">
          <div className="flex-1 h-px bg-line"></div>
          <span className="text-content-4 text-xs font-medium uppercase tracking-widest">ou</span>
          <div className="flex-1 h-px bg-line"></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-[300px] flex flex-col gap-5">
        {auth.error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center">
            {auth.error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-content-2 text-xs uppercase tracking-wider">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-content-2 text-xs uppercase tracking-wider">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={auth.loading}
          className="mt-4 w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {auth.loading && <Spinner size="sm" colorClass="border-surface/30 border-t-surface" />}
          {auth.loading ? "Aguarde..." : "Entrar"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button 
          onClick={() => {
            auth.setRegisterMode("register");
            auth.setScreen("register");
          }}
          className="text-content-3 hover:text-content text-sm transition-colors"
        >
          Não tem uma conta? <span className="underline underline-offset-4">Cadastre-se</span>
        </button>
      </div>
    </div>
  );
}
