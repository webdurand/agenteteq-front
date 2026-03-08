import { useEffect, useState, useCallback } from "react";
import * as api from "../lib/api";
import { Spinner } from "./ui/Spinner";

interface IntegrationsTabProps {
  token: string;
}

export function IntegrationsTab({ token }: IntegrationsTabProps) {
  const [loading, setLoading] = useState(true);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [connectedIntegrations, setConnectedIntegrations] = useState<any[]>([]);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Como não criamos um endpoint de providers disponiveis ainda com fetch especifico, 
      // podemos mockar ou usar um caso exista.
      // O backend ja tem GET /integrations/available
      const [providers, connected] = await Promise.all([
        api.fetchWithAuth("/integrations/available", { token }),
        api.getIntegrations(token)
      ]);
      setAvailableProviders(providers);
      setConnectedIntegrations(connected);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar integrações");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemoveIntegration = async (id: number) => {
    if (!confirm("Tem certeza que deseja desconectar esta conta? O agente não terá mais acesso a ela.")) return;
    try {
      await api.removeIntegration(token, id);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao remover integração");
    }
  };

  const PROVIDER_SCOPES: Record<string, string> = {
    gmail: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
    google_calendar: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
  };

  const initGoogleAuth = useCallback((providerId: string) => {
    if (!window.google?.accounts?.oauth2) {
      alert("Google SDK ainda não carregou. Tente novamente em alguns segundos.");
      return;
    }
    
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    if (!clientId) {
      alert("VITE_GOOGLE_CLIENT_ID não configurado.");
      return;
    }

    const scope = PROVIDER_SCOPES[providerId];
    if (!scope) return;

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope,
      ux_mode: "popup",
      callback: async (response: any) => {
        if (response.error) {
          alert("Erro na autorização do Google");
          return;
        }
        
        try {
          await api.createIntegration(token, {
            provider: providerId,
            code: response.code
          });
          loadData();
        } catch (err: any) {
          alert(err.message || "Erro ao vincular conta do Google");
        }
      },
    });

    client.requestCode();
  }, [token, loadData]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-light text-content">Integrações</h3>
        <p className="text-sm text-content-3">
          Conecte outras ferramentas para permitir que o agente leia e execute ações em seu nome.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableProviders.map(provider => {
            const connected = connectedIntegrations.filter(i => i.provider === provider.id);

            return (
              <div key={provider.id} className="bg-glass backdrop-blur-xl border border-glass-border rounded-3xl p-6 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-card border border-line flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {provider.icon === "gmail" ? (
                      <svg viewBox="52 42 88 66" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/>
                        <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/>
                        <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/>
                        <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/>
                        <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.46-14.4-.22-14.4 7.2"/>
                      </svg>
                    ) : provider.icon === "google_calendar" ? (
                      <svg viewBox="0 0 200 200" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#fff" d="M152 192H48l-8-8V48l8-8h104l8 8v136z"/>
                        <path fill="#1a73e8" d="M72 80h56v16H72zm0 28h56v16H72zm0 28h40v16H72z"/>
                        <path fill="#ea4335" d="M152 40H48c-4.4 0-8 3.6-8 8v8h120v-8c0-4.4-3.6-8-8-8z"/>
                        <path fill="#34a853" d="M40 184c0 4.4 3.6 8 8 8h104c4.4 0 8-3.6 8-8v-8H40z"/>
                        <path fill="#4285f4" d="M152 40c4.4 0 8 3.6 8 8v136c0 4.4-3.6 8-8 8" opacity=".2"/>
                        <path fill="#1a73e8" d="M48 40c-4.4 0-8 3.6-8 8v136c0 4.4 3.6 8 8 8" opacity=".2"/>
                      </svg>
                    ) : (
                      <span className="text-xs uppercase tracking-wider font-bold text-content-2">
                        {provider.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-medium text-content">{provider.name}</h4>
                    <p className="text-xs text-content-3 mt-1 leading-relaxed">{provider.description}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {connected.length > 0 ? (
                    connected.map(conn => (
                      <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-card border border-line">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm text-content truncate">{conn.account_email || conn.account_id}</span>
                          <span className="text-[10px] uppercase tracking-wider text-green-500">Conectado</span>
                        </div>
                        <button
                          onClick={() => handleRemoveIntegration(conn.id)}
                          className="px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-500/10 text-xs font-medium uppercase tracking-wider transition-colors flex-shrink-0 ml-2"
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-content-4 italic">Nenhuma conta conectada.</div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (provider.id === "gmail" || provider.id === "google_calendar") {
                        initGoogleAuth(provider.id);
                      } else {
                        alert("Integração não implementada ainda.");
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface-card text-content hover:bg-line text-sm font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Conectar Conta
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
