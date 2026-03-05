import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { useTheme } from "../hooks/useTheme";

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onExitAdmin: () => void;
}

function ThemeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-line text-content-3 hover:text-content transition-colors duration-200"
      aria-label={dark ? "Modo claro" : "Modo escuro"}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function AdminDashboard({ token, onLogout, onExitAdmin }: AdminDashboardProps) {
  const { dark, toggle } = useTheme();
  const [tab, setTab] = useState<"negocio" | "saude" | "admins">("negocio");

  const [businessData, setBusinessData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [toolsData, setToolsData] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminData();
  }, [tab]);

  const fetchAdminData = async () => {
    try {
      if (tab === "negocio") {
        const [sum, usrs, tls] = await Promise.all([
          api.fetchWithAuth("/admin/business/summary", { token }),
          api.fetchWithAuth("/admin/business/users", { token }),
          api.fetchWithAuth("/admin/business/tools", { token }),
        ]);
        setBusinessData(sum);
        setUsersData(usrs);
        setToolsData(tls);
      } else if (tab === "saude") {
        const health = await api.fetchWithAuth("/admin/health/summary", { token });
        setHealthData(health);
      } else if (tab === "admins") {
        const usrs = await api.fetchWithAuth("/admin/business/users", { token });
        setUsersData(usrs);
      }
    } catch (e) {
      console.error("Erro ao buscar dados do admin:", e);
    }
  };

  const handlePromoteAdmin = async (phone: string) => {
    if (!confirm(`Promover ${phone} a Admin?`)) return;
    try {
      await api.fetchWithAuth("/admin/admins", {
        method: "POST",
        token,
        body: JSON.stringify({ phone_number: phone })
      });
      fetchAdminData();
    } catch (e) {
      alert("Erro ao promover admin");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-surface overflow-hidden transition-colors duration-300">
      {/* Topbar */}
      <header className="flex-shrink-0 px-4 lg:px-8 py-4 lg:py-6 flex items-center justify-between z-10 border-b border-line bg-surface">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold tracking-[0.4em] uppercase text-content">TEQ ADMIN</h1>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <ThemeToggle dark={dark} toggle={toggle} />
          <button 
            onClick={onExitAdmin}
            className="px-4 py-2 lg:px-5 lg:py-2.5 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium tracking-wider uppercase transition-colors"
          >
            Voltar
          </button>
          <button 
            onClick={onLogout}
            className="px-4 py-2 lg:px-5 lg:py-2.5 rounded-full bg-surface-card border border-line text-red-500 hover:bg-red-500/10 text-xs font-medium tracking-wider uppercase transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-64 border-r border-line bg-surface-up p-4 flex flex-col gap-2">
          <button 
            onClick={() => setTab("negocio")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "negocio" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Negócio
          </button>
          <button 
            onClick={() => setTab("saude")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "saude" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Saúde
          </button>
          <button 
            onClick={() => setTab("admins")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "admins" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Admins
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-surface">
          {tab === "negocio" && (
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-xl font-light text-content">Métricas de Negócio</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-content-3">Total Usuários</span>
                  <span className="text-3xl font-light text-content">{businessData?.total_users || 0}</span>
                </div>
                <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-content-3">Usuários Verificados</span>
                  <span className="text-3xl font-light text-accent">{businessData?.verified_users || 0}</span>
                </div>
                <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-content-3">Total Mensagens</span>
                  <span className="text-3xl font-light text-content">{businessData?.total_messages || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium tracking-wide text-content-2">Top Tools</h3>
                  <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
                    {toolsData.map((t, i) => (
                      <div key={i} className="flex justify-between items-center p-4 border-b border-line/50 last:border-0">
                        <span className="text-sm text-content">{t.name}</span>
                        <span className="text-sm font-mono text-content-3 bg-surface px-2 py-1 rounded-md">{t.calls}</span>
                      </div>
                    ))}
                    {toolsData.length === 0 && <div className="p-4 text-sm text-content-4">Sem dados de tools</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "saude" && (
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-xl font-light text-content">Saúde do Sistema</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-content-3">Status Geral</span>
                  <span className={`text-xl font-medium ${healthData?.status === 'online' ? 'text-green-500' : 'text-red-500'}`}>
                    {healthData?.status?.toUpperCase() || "CARREGANDO..."}
                  </span>
                </div>
                <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-content-3">Banco de Dados</span>
                  <span className={`text-sm ${healthData?.database === 'ok' ? 'text-green-500' : 'text-red-500'}`}>
                    {healthData?.database || "..."}
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === "admins" && (
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-xl font-light text-content">Gestão de Administradores</h2>
              
              <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface-up text-xs uppercase tracking-wider text-content-3">
                      <th className="p-4 font-medium">Telefone</th>
                      <th className="p-4 font-medium">Nome</th>
                      <th className="p-4 font-medium">Papel</th>
                      <th className="p-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.map((u, i) => (
                      <tr key={i} className="border-b border-line/50 last:border-0 hover:bg-surface transition-colors">
                        <td className="p-4 text-sm font-mono text-content-2">{u.phone_number}</td>
                        <td className="p-4 text-sm text-content">{u.name}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full border ${u.role === 'admin' ? 'border-accent text-accent bg-accent/10' : 'border-line text-content-3 bg-surface'}`}>
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.role !== 'admin' && (
                            <button 
                              onClick={() => handlePromoteAdmin(u.phone_number)}
                              className="text-xs text-accent hover:underline"
                            >
                              Promover
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}