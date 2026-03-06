import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../contexts/ToastContext";
import { LineChart, BarChart, PieChart } from "./MetricsCharts";

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const centsToDisplay = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

const displayToCents = (display: string) => {
  const digits = display.replace(/\D/g, "");
  return parseInt(digits || "0", 10);
};

const CONFIG_TOOLTIPS: Record<string, string> = {
  max_concurrent_images: "Quantas imagens podem ser geradas ao mesmo tempo dentro de um único carrossel. Valor baixo = menos memória usada, mas o carrossel demora mais. Ex: 3 significa que dos 8 slides, 3 são gerados em paralelo.",
  max_image_workers: "Número de threads dedicadas à API do Gemini para gerar imagens. Impacta diretamente o uso de CPU/RAM. Se o servidor dá OOM, reduza esse valor.",
  max_global_processing: "Quantas tasks (carrosséis/edições) podem ser processadas ao mesmo tempo no servidor inteiro. Se houver 3 processando e chegar a 4ª, ela espera na fila.",
  task_timeout_minutes: "Tempo máximo que uma task pode ficar 'processando' antes de ser considerada travada e re-enfileirada. Se suas gerações demoram mais de 5 min, aumente.",
  max_tasks_per_user: "Quantos pedidos simultâneos (pendentes + processando) um usuário pode ter. Evita que um usuário monopolize a fila. Ex: 2 = no máximo 2 carrosséis na fila ao mesmo tempo.",
  max_tasks_per_user_daily: "Limite de gerações de imagens por dia por usuário. Controla o custo da API do Gemini. Quando atinge, o usuário recebe uma mensagem e só pode usar novamente no dia seguinte.",
};

type ConfigCategory = "infra" | "plan";
const CONFIG_CATEGORY: Record<string, ConfigCategory> = {
  max_concurrent_images: "infra",
  max_image_workers: "infra",
  max_global_processing: "infra",
  task_timeout_minutes: "infra",
  max_tasks_per_user: "plan",
  max_tasks_per_user_daily: "plan",
};

function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-1.5 cursor-help">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-4 hover:text-accent transition-colors">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl bg-surface-up border border-line shadow-lg text-xs text-content-2 leading-relaxed pointer-events-none">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-surface-up border-r border-b border-line rotate-45" />
      </div>
    </div>
  );
}

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
  const { showToast } = useToast();
  const [tab, setTab] = useState<"negocio" | "saude" | "admins" | "planos" | "assinaturas" | "usuarios" | "sistema">("negocio");

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [plansData, setPlansData] = useState<any[]>([]);
  const [subsData, setSubsData] = useState<any[]>([]);
  
  const [systemQueue, setSystemQueue] = useState<any>(null);
  const [systemConfigs, setSystemConfigs] = useState<any>({});
  const [systemTasks, setSystemTasks] = useState<any[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [metricsDays, setMetricsDays] = useState(7);
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "paid">("trial");
  
  const [searchUser, setSearchUser] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [manualSubPhone, setManualSubPhone] = useState("");
  const [manualSubPlan, setManualSubPlan] = useState("pro_mensal");
  const [manualSubDays, setManualSubDays] = useState(30);

  const [planForm, setPlanForm] = useState({
    code: "pro_mensal",
    name: "Plano Pro Mensal",
    description: "Acesso completo ao Teq com 7 dias gratis.",
    amount_cents: 4990,
    trial_days: 7,
    stripe_price_id: "",
    features_json: '["Acesso completo","WhatsApp","Tarefas","Lembretes","Chat por voz"]',
  });

  useEffect(() => {
    fetchAdminData();
    
    let interval: any;
    if (tab === "sistema") {
      interval = setInterval(() => {
        fetchSystemQueueData();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tab, metricsDays]);

  const fetchSystemQueueData = async () => {
    try {
      const q = await api.fetchWithAuth("/admin/system/queue", { token });
      setSystemQueue(q);
      const t = await api.fetchWithAuth("/admin/system/tasks?limit=10", { token });
      setSystemTasks(t.tasks || []);
    } catch (e) {
      console.error("Erro no polling da fila", e);
    }
  };

  const fetchAdminData = async () => {
    try {
      if (tab === "negocio") {
        const analytics = await api.fetchWithAuth(`/admin/business/analytics?days=${metricsDays}`, { token });
        setAnalyticsData(analytics);
      } else if (tab === "saude") {
        const health = await api.fetchWithAuth("/admin/health/summary", { token });
        setHealthData(health);
      } else if (tab === "sistema") {
        const [q, c, t, m] = await Promise.all([
          api.fetchWithAuth("/admin/system/queue", { token }),
          api.fetchWithAuth("/admin/system/config", { token }),
          api.fetchWithAuth("/admin/system/tasks?limit=20", { token }),
          api.fetchWithAuth(`/admin/system/metrics?days=${metricsDays}`, { token }),
        ]);
        setSystemQueue(q);
        setSystemConfigs(c);
        setSystemTasks(t.tasks || []);
        setSystemMetrics(m);
      } else if (tab === "admins" || tab === "usuarios") {
        const usrs = await api.fetchWithAuth("/admin/business/users", { token });
        setUsersData(usrs);
      } else if (tab === "planos") {
        const p = await api.fetchWithAuth("/admin/billing/plans", { token });
        setPlansData(p);
        if (p.length > 0) {
          const first = p[0];
          setPlanForm((prev) => ({
            ...prev,
            code: first.code,
            name: first.name,
            description: first.description || "",
            amount_cents: first.amount_cents,
            trial_days: first.trial_days,
            stripe_price_id: first.stripe_price_id || "",
            features_json: first.features_json || prev.features_json,
          }));
        }
      } else if (tab === "assinaturas") {
        const s = await api.fetchWithAuth("/admin/billing/subscriptions", { token });
        setSubsData(s);
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
      showToast("Admin promovido com sucesso", "success");
      fetchAdminData();
    } catch (e: any) {
      showToast(e.message || "Erro ao promover admin", "error");
    }
  };

  const handleDemoteAdmin = async (phone: string) => {
    if (!confirm(`Remover acesso de Admin de ${phone}?`)) return;
    try {
      await api.fetchWithAuth(`/admin/admins/${phone}`, {
        method: "DELETE",
        token
      });
      showToast("Admin removido com sucesso", "success");
      fetchAdminData();
    } catch (e: any) {
      showToast(e.message || "Erro ao remover admin", "error");
    }
  };

  const handleCreatePlan = async () => {
    try {
      await api.fetchWithAuth("/admin/billing/plans", {
        token,
        method: "POST",
        body: JSON.stringify(planForm),
      });
      showToast("Plano criado com sucesso", "success");
      fetchAdminData();
    } catch (e: any) {
      showToast(e.message || "Erro ao criar plano", "error");
    }
  };

  const handleUpdatePlan = async (code: string) => {
    try {
      await api.fetchWithAuth(`/admin/billing/plans/${code}`, {
        token,
        method: "PUT",
        body: JSON.stringify({
          name: planForm.name,
          description: planForm.description,
          amount_cents: planForm.amount_cents,
          trial_days: planForm.trial_days,
          stripe_price_id: planForm.stripe_price_id,
          features_json: planForm.features_json,
          is_active: true,
        }),
      });
      showToast("Plano atualizado com sucesso", "success");
      fetchAdminData();
    } catch (e: any) {
      showToast(e.message || "Erro ao atualizar plano", "error");
    }
  };

  const handleDeletePlan = async (code: string) => {
    if (!confirm(`Tem certeza que deseja apagar o plano ${code}?`)) return;
    try {
      await api.fetchWithAuth(`/admin/billing/plans/${code}`, {
        token,
        method: "DELETE",
      });
      showToast("Plano apagado com sucesso", "success");
      if (planForm.code === code) {
        setPlanForm({
          code: "", name: "", description: "", amount_cents: 0, trial_days: 0, stripe_price_id: "", features_json: '[]'
        });
      }
      fetchAdminData();
    } catch (e: any) {
      showToast(e.message || "Erro ao apagar plano", "error");
    }
  };

  const handleAddManualSubscription = async () => {
    if (!manualSubPhone) {
      showToast("Preencha o telefone do usuario", "error");
      return;
    }
    try {
      await api.fetchWithAuth("/admin/billing/subscriptions/manual", {
        token,
        method: "POST",
        body: JSON.stringify({
          phone_number: manualSubPhone.replace(/\D/g, ""),
          plan_code: manualSubPlan,
          days: manualSubDays,
        }),
      });
      showToast("Assinatura manual adicionada com sucesso", "success");
      setManualSubPhone("");
      fetchAdminData();
    } catch (e: any) {
      showToast(e.message || "Erro ao adicionar assinatura manual", "error");
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
            onClick={() => setTab("sistema")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "sistema" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Sistema / Fila
          </button>
          <button 
            onClick={() => setTab("saude")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "saude" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Saúde
          </button>
          <button 
            onClick={() => setTab("usuarios")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "usuarios" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Usuários
          </button>
          <button 
            onClick={() => setTab("admins")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "admins" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Admins
          </button>
          <button 
            onClick={() => setTab("planos")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "planos" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Planos
          </button>
          <button 
            onClick={() => setTab("assinaturas")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "assinaturas" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Assinaturas
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-surface">
          {tab === "negocio" && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-light text-content">Métricas de Negócio</h2>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-content-4">Período:</span>
                  <select 
                    className="bg-surface-card border border-line text-sm rounded-lg px-3 py-1 text-content"
                    value={metricsDays}
                    onChange={e => setMetricsDays(parseInt(e.target.value))}
                  >
                    <option value={7}>Últimos 7 dias</option>
                    <option value={30}>Últimos 30 dias</option>
                    <option value={90}>Últimos 90 dias</option>
                  </select>
                </div>
              </div>

              {/* Financeiro */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Financeiro</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wider text-content-3">MRR (Receita Recorrente)</span>
                    <span className="text-3xl font-light text-green-500">{formatBRL(analyticsData?.financial?.mrr_cents || 0)}</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wider text-content-3">Assinantes Ativos</span>
                    <span className="text-3xl font-light text-accent">{analyticsData?.financial?.active_subs || 0}</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wider text-content-3">Status de Assinaturas</span>
                    <div className="flex-1 -mx-4">
                      {analyticsData?.financial?.status_distribution?.length > 0 ? (
                        <PieChart data={analyticsData.financial.status_distribution} height={100} />
                      ) : (
                        <div className="h-[100px] flex items-center justify-center text-xs text-content-4">Sem dados</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Engajamento */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Engajamento de Usuários</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                    <span className="text-xs uppercase tracking-wider text-content-3">Usuários Ativos por Dia (DAU)</span>
                    {analyticsData?.engagement?.dau?.length > 0 ? (
                      <BarChart data={analyticsData.engagement.dau} xKey="date" barKey="users" barName="Usuários" color="#3b82f6" height={250} />
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                    )}
                  </div>
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                    <span className="text-xs uppercase tracking-wider text-content-3">Mensagens por Dia</span>
                    {analyticsData?.engagement?.messages_by_day?.length > 0 ? (
                      <LineChart 
                        data={analyticsData.engagement.messages_by_day} 
                        xKey="date" 
                        lines={[
                          { key: 'received', name: 'Recebidas (Usuário)', color: '#8b5cf6' },
                          { key: 'sent', name: 'Enviadas (Agente)', color: '#10b981' }
                        ]} 
                        height={250} 
                      />
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Uso de Features</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                    <span className="text-xs uppercase tracking-wider text-content-3">Top Tools (Chamadas)</span>
                    {analyticsData?.features?.tools_ranking?.length > 0 ? (
                      <BarChart data={analyticsData.features.tools_ranking.slice(0, 5)} xKey="name" barKey="calls" barName="Chamadas" color="#f59e0b" height={250} />
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                    )}
                  </div>
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                    <span className="text-xs uppercase tracking-wider text-content-3">Tendência de Tools</span>
                    {analyticsData?.features?.tools_trend_by_day?.length > 0 ? (
                      <LineChart 
                        data={analyticsData.features.tools_trend_by_day} 
                        xKey="date" 
                        lines={
                          Object.keys(analyticsData.features.tools_trend_by_day[0] || {})
                            .filter(k => k !== 'date')
                            .map((k, i) => ({ key: k, name: k, color: ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'][i % 5] }))
                        }
                        height={250} 
                      />
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Operacional */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Operacional ({metricsDays} dias)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wider text-content-3">Taxa de Erro (Tools)</span>
                    <span className={`text-3xl font-light ${analyticsData?.operational?.error_rate > 5 ? 'text-red-500' : 'text-green-500'}`}>
                      {analyticsData?.operational?.error_rate || 0}%
                    </span>
                  </div>
                  <div className="md:col-span-2 p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-4">
                    <span className="text-xs uppercase tracking-wider text-content-3">Latência Média por Tool (ms)</span>
                    <div className="flex flex-wrap gap-2">
                      {analyticsData?.operational?.latency_by_tool?.map((l: any, i: number) => (
                        <div key={i} className="px-3 py-1.5 bg-surface border border-line rounded-lg text-xs flex gap-2 items-center">
                          <span className="text-content-2 font-mono">{l.name}</span>
                          <span className={`font-medium ${l.avg_ms > 3000 ? 'text-red-500' : l.avg_ms > 1000 ? 'text-orange-500' : 'text-green-500'}`}>{l.avg_ms}ms</span>
                        </div>
                      ))}
                      {!analyticsData?.operational?.latency_by_tool?.length && (
                        <span className="text-sm text-content-4">Sem dados de latência</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "sistema" && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-light text-content">Sistema e Fila</h2>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-content-4">Período:</span>
                  <select 
                    className="bg-surface-card border border-line text-sm rounded-lg px-3 py-1 text-content"
                    value={metricsDays}
                    onChange={e => setMetricsDays(parseInt(e.target.value))}
                  >
                    <option value={1}>Hoje</option>
                    <option value={7}>Últimos 7 dias</option>
                    <option value={30}>Últimos 30 dias</option>
                  </select>
                </div>
              </div>
              
              {/* Fila Real-time */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Fila em Tempo Real</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-content-3">Na Fila</span>
                    <span className="text-2xl font-light text-accent">{systemQueue?.pending || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-content-3">Processando</span>
                    <span className="text-2xl font-light text-orange-500">{systemQueue?.processing || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-content-3">Concluídas (24h)</span>
                    <span className="text-2xl font-light text-green-500">{systemQueue?.done_today || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-content-3">Falhas (24h)</span>
                    <span className="text-2xl font-light text-red-500">{systemQueue?.failed_today || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-content-3">Tempo Médio</span>
                    <span className="text-2xl font-light text-content">{systemQueue?.avg_wait || 0}s</span>
                  </div>
                </div>
              </div>

              {/* Infraestrutura (global) */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Infraestrutura (Global)</h3>
                <div className="bg-surface-card border border-line rounded-2xl p-4 space-y-4">
                  {Object.entries(systemConfigs)
                    .filter(([key]) => {
                      const base = key.split(":")[0];
                      return CONFIG_CATEGORY[base] === "infra";
                    })
                    .map(([key, val]: any) => (
                      <div key={key} className="flex flex-col gap-1">
                        <div className="flex items-center">
                          <label className="text-xs text-content font-mono">{key}</label>
                          {CONFIG_TOOLTIPS[key] && <Tooltip text={CONFIG_TOOLTIPS[key]} />}
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 bg-surface border border-line rounded-lg px-3 py-1.5 text-sm text-content focus:border-accent outline-none"
                            value={val}
                            onChange={(e) => setSystemConfigs({...systemConfigs, [key]: e.target.value})}
                          />
                          <button 
                            onClick={async () => {
                              try {
                                await api.fetchWithAuth("/admin/system/config", {
                                  method: "PUT", token, body: JSON.stringify({ key, value: systemConfigs[key] })
                                });
                                showToast("Salvo", "success");
                              } catch(e) {
                                showToast("Erro", "error");
                              }
                            }}
                            className="px-3 py-1.5 bg-accent/10 text-accent text-xs rounded-lg hover:bg-accent/20"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ))}
                  <div className="mt-2 p-3 bg-blue-500/10 text-blue-400 text-xs rounded-lg border border-blue-500/20">
                    <strong>Guia de escala (eMedium 2GB):</strong> max_concurrent_images: 3 &middot; max_image_workers: 4 &middot; max_global_processing: 3
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Limites por Plano */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-medium tracking-wide text-content-2">Limites por Plano</h3>
                    <div className="flex bg-surface border border-line rounded-lg overflow-hidden">
                      <button 
                        onClick={() => setSelectedPlan("trial")}
                        className={`px-4 py-1.5 text-xs font-medium tracking-wide transition-colors ${selectedPlan === "trial" ? "bg-accent/15 text-accent" : "text-content-3 hover:text-content"}`}
                      >
                        Free / Trial
                      </button>
                      <button 
                        onClick={() => setSelectedPlan("paid")}
                        className={`px-4 py-1.5 text-xs font-medium tracking-wide transition-colors ${selectedPlan === "paid" ? "bg-accent/15 text-accent" : "text-content-3 hover:text-content"}`}
                      >
                        Pago (R$19,90)
                      </button>
                    </div>
                  </div>
                  <div className="bg-surface-card border border-line rounded-2xl p-4 space-y-4">
                    {Object.entries(systemConfigs)
                      .filter(([key]) => {
                        const base = key.split(":")[0];
                        return CONFIG_CATEGORY[base] === "plan" && key.endsWith(`:${selectedPlan}`);
                      })
                      .map(([key, val]: any) => {
                        const base = key.split(":")[0];
                        return (
                          <div key={key} className="flex flex-col gap-1">
                            <div className="flex items-center">
                              <label className="text-xs text-content font-mono">{base}</label>
                              {CONFIG_TOOLTIPS[base] && <Tooltip text={CONFIG_TOOLTIPS[base]} />}
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                className="flex-1 bg-surface border border-line rounded-lg px-3 py-1.5 text-sm text-content focus:border-accent outline-none"
                                value={val}
                                onChange={(e) => setSystemConfigs({...systemConfigs, [key]: e.target.value})}
                              />
                              <button 
                                onClick={async () => {
                                  try {
                                    await api.fetchWithAuth("/admin/system/config", {
                                      method: "PUT", token, body: JSON.stringify({ key, value: systemConfigs[key] })
                                    });
                                    showToast("Salvo", "success");
                                  } catch(e) {
                                    showToast("Erro", "error");
                                  }
                                }}
                                className="px-3 py-1.5 bg-accent/10 text-accent text-xs rounded-lg hover:bg-accent/20"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {Object.entries(systemConfigs)
                      .filter(([key]) => {
                        const base = key.split(":")[0];
                        return CONFIG_CATEGORY[base] === "plan" && key.endsWith(`:${selectedPlan}`);
                      }).length === 0 && (
                        <div className="text-sm text-content-4 italic">Nenhum limite configurado para este plano.</div>
                      )}
                    <div className="mt-2 p-3 bg-amber-500/10 text-amber-400 text-xs rounded-lg border border-amber-500/20">
                      {selectedPlan === "trial" 
                        ? "Plano gratuito / trial. Limites mais restritivos para controlar custo."
                        : "Plano pago (R$19,90/mês). Limites mais generosos para quem assina."
                      }
                    </div>
                  </div>
                </div>

                {/* Top Consumidores */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium tracking-wide text-content-2">Top Consumidores de Imagens</h3>
                  <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
                    {systemMetrics?.user_usage?.map((u: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-4 border-b border-line/50 last:border-0">
                        <span className="text-sm text-content font-mono">{u.user_id}</span>
                        <span className="text-sm font-mono text-content-3 bg-surface px-2 py-1 rounded-md">{u.generates} imgs</span>
                      </div>
                    ))}
                    {!systemMetrics?.user_usage?.length && <div className="p-4 text-sm text-content-4">Sem dados no período</div>}
                  </div>
                </div>
              </div>

              {/* Tabela de Tasks */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Tasks Recentes (Fila)</h3>
                <div className="bg-surface-card border border-line rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-line/50 text-content-3 text-xs uppercase tracking-wider">
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Tipo</th>
                        <th className="p-4 font-medium">Usuário</th>
                        <th className="p-4 font-medium">Criado</th>
                        <th className="p-4 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="text-content">
                      {systemTasks.map((t: any) => (
                        <tr key={t.id} className="border-b border-line/10 hover:bg-surface/50">
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider ${
                              t.status === 'done' ? 'bg-green-500/10 text-green-500' :
                              t.status === 'processing' ? 'bg-orange-500/10 text-orange-500' :
                              t.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                              'bg-content-3/10 text-content-3'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-4 text-content-2 font-mono text-xs">{t.task_type}</td>
                          <td className="p-4 font-mono text-xs">{t.user_id}</td>
                          <td className="p-4 text-content-3 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                          <td className="p-4">
                            {t.status === 'failed' && (
                              <button onClick={async () => {
                                await api.fetchWithAuth(`/admin/system/tasks/${t.id}/retry`, { method: 'POST', token });
                                fetchSystemQueueData();
                              }} className="text-accent text-xs hover:underline mr-3">Retry</button>
                            )}
                            {(t.status === 'pending' || t.status === 'processing') && (
                              <button onClick={async () => {
                                await api.fetchWithAuth(`/admin/system/tasks/${t.id}/cancel`, { method: 'POST', token });
                                fetchSystemQueueData();
                              }} className="text-red-500 text-xs hover:underline">Cancelar</button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {systemTasks.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-content-4 italic">Nenhuma task encontrada</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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

          {tab === "usuarios" && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-light text-content">Gestão de Usuários</h2>
                <div className="w-72">
                  <input 
                    value={searchUser} 
                    onChange={(e) => setSearchUser(e.target.value)} 
                    placeholder="Buscar por nome ou telefone..." 
                    className="w-full bg-surface-card border border-line focus:border-line-strong rounded-full px-4 py-2 text-sm text-content placeholder-content-4 focus:outline-none transition-colors" 
                  />
                </div>
              </div>
              
              <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface-up text-xs uppercase tracking-wider text-content-3">
                      <th className="p-4 font-medium">Telefone</th>
                      <th className="p-4 font-medium">Nome</th>
                      <th className="p-4 font-medium">Status Assinatura</th>
                      <th className="p-4 font-medium">Conta Criada Em</th>
                      <th className="p-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData
                      .filter(u => 
                        (u.name?.toLowerCase() || "").includes(searchUser.toLowerCase()) || 
                        (u.phone_number?.toLowerCase() || "").includes(searchUser.toLowerCase())
                      )
                      .map((u, i) => (
                      <tr key={i} className="border-b border-line/50 last:border-0 hover:bg-surface transition-colors">
                        <td className="p-4 text-sm font-mono text-content-2">{u.phone_number}</td>
                        <td className="p-4 text-sm text-content">{u.name || '-'}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            u.subscription_status === 'active'    ? 'border-green-500 text-green-500 bg-green-500/10' :
                            u.subscription_status === 'pro_trial' ? 'border-green-500 text-green-500 bg-green-500/10' :
                            u.subscription_status === 'trialing'  ? 'border-blue-500 text-blue-500 bg-blue-500/10' :
                            u.subscription_status === 'past_due'  ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                            u.subscription_status === 'canceled'  ? 'border-red-500 text-red-500 bg-red-500/10' :
                            u.subscription_status === 'expired'   ? 'border-orange-500 text-orange-500 bg-orange-500/10' :
                            'border-line text-content-3 bg-surface'
                          }`}>
                            {{
                              active:    'Pro',
                              pro_trial: 'Pro',
                              trialing:  'Trial',
                              past_due:  'Pendente',
                              canceled:  'Cancelado',
                              expired:   'Expirado',
                              none:      'Sem plano',
                            }[u.subscription_status as string] ?? u.subscription_status ?? 'Sem plano'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-content-3">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : '-'}
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => {
                              setManualSubPhone(u.phone_number);
                              setTab("assinaturas");
                            }}
                            className="text-xs text-accent hover:underline"
                          >
                            Gerenciar Plano
                          </button>
                        </td>
                      </tr>
                    ))}
                    {usersData.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-sm text-content-3">Nenhum usuário encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "admins" && (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-light text-content">Gestão de Administradores</h2>
              </div>
              
              <div className="bg-surface-card border border-line rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-medium text-content uppercase tracking-wider">Promover Usuário a Admin</h3>
                <div className="flex gap-4">
                  <input 
                    value={newAdminPhone} 
                    onChange={(e) => setNewAdminPhone(e.target.value)} 
                    placeholder="Telefone do usuário (ex: 55219...)" 
                    className="flex-1 bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors" 
                  />
                  <button 
                    onClick={() => {
                      if (newAdminPhone) {
                        handlePromoteAdmin(newAdminPhone);
                        setNewAdminPhone("");
                      }
                    }} 
                    className="px-4 py-2 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
                  >
                    Promover
                  </button>
                </div>
              </div>

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
                    {usersData.filter(u => u.role === 'admin').map((u, i) => (
                      <tr key={i} className="border-b border-line/50 last:border-0 hover:bg-surface transition-colors">
                        <td className="p-4 text-sm font-mono text-content-2">{u.phone_number}</td>
                        <td className="p-4 text-sm text-content">{u.name || '-'}</td>
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded-full border border-accent text-accent bg-accent/10">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => handleDemoteAdmin(u.phone_number)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    {usersData.filter(u => u.role === 'admin').length === 0 && (
                      <tr><td colSpan={4} className="p-4 text-center text-sm text-content-3">Nenhum admin encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "planos" && (
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-xl font-light text-content">Planos</h2>
              <div className="bg-surface-card border border-line rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input value={planForm.code} onChange={(e) => setPlanForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="codigo" className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors" />
                  <input value={planForm.name} onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="nome" className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors" />
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-content-3 text-sm">R$</span>
                    <input
                      value={centsToDisplay(planForm.amount_cents)}
                      onChange={(e) => setPlanForm((prev) => ({ ...prev, amount_cents: displayToCents(e.target.value) }))}
                      placeholder="0,00"
                      className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 pl-8 text-content placeholder-content-4 focus:outline-none transition-colors"
                    />
                  </div>
                  <input value={planForm.trial_days} onChange={(e) => setPlanForm((prev) => ({ ...prev, trial_days: Number(e.target.value) || 0 }))} placeholder="trial em dias" className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors" />
                  <input value={planForm.stripe_price_id} onChange={(e) => setPlanForm((prev) => ({ ...prev, stripe_price_id: e.target.value }))} placeholder="stripe price id" className="md:col-span-2 w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors" />
                  <input value={planForm.description} onChange={(e) => setPlanForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="descricao" className="md:col-span-2 w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCreatePlan} className="px-4 py-2 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity">Criar plano</button>
                  <button onClick={() => handleUpdatePlan(planForm.code)} className="px-4 py-2 rounded-xl bg-transparent border border-line text-content font-medium tracking-wider uppercase text-sm hover:bg-surface transition-colors">Salvar alterações</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plansData.map((p, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <span className="text-xl text-content">{p.name}</span>
                    <span className="text-sm text-content-3">{p.description}</span>
                    <span className="text-2xl font-light text-accent">{formatBRL(p.amount_cents)}</span>
                    <span className="text-xs uppercase tracking-wider text-content-3">Trial: {p.trial_days} dias</span>
                    <div className="flex items-center gap-4 mt-2">
                      <button onClick={() => setPlanForm((prev) => ({ ...prev, ...p }))} className="text-left text-xs text-accent hover:underline">
                        Editar este plano
                      </button>
                      <button onClick={() => handleDeletePlan(p.code)} className="text-left text-xs text-red-500 hover:underline">
                        Apagar plano
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "assinaturas" && (
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-xl font-light text-content">Assinaturas</h2>

              {/* Manual Subscription Form */}
              <div className="bg-surface-card border border-line rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-medium text-content uppercase tracking-wider">Adicionar Assinatura Manual</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input 
                    value={manualSubPhone} 
                    onChange={(e) => setManualSubPhone(e.target.value)} 
                    placeholder="Telefone (ex: 55219...)" 
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors" 
                  />
                  <select 
                    value={manualSubPlan} 
                    onChange={(e) => setManualSubPlan(e.target.value)} 
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content focus:outline-none transition-colors"
                  >
                    {plansData.map(p => (
                      <option key={p.code} value={p.code} className="bg-surface-up text-content">{p.name}</option>
                    ))}
                  </select>
                  <input 
                    type="number"
                    value={manualSubDays} 
                    onChange={(e) => setManualSubDays(Number(e.target.value))} 
                    placeholder="Dias de acesso" 
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors" 
                  />
                </div>
                <div className="flex justify-end">
                  <button onClick={handleAddManualSubscription} className="px-4 py-2 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity">
                    Conceder Acesso
                  </button>
                </div>
              </div>

              <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface-up text-xs uppercase tracking-wider text-content-3">
                      <th className="p-4 font-medium">Usuário</th>
                      <th className="p-4 font-medium">Plano</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subsData.map((s, i) => (
                      <tr key={i} className="border-b border-line/50 last:border-0 hover:bg-surface transition-colors">
                        <td className="p-4 text-sm font-mono text-content-2">{s.user_id}</td>
                        <td className="p-4 text-sm text-content">{s.plan_code}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full border ${s.status === 'active' ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-line text-content-3 bg-surface'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-content-3">
                          {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                    {subsData.length === 0 && (
                      <tr><td colSpan={4} className="p-4 text-center text-sm text-content-3">Nenhuma assinatura encontrada</td></tr>
                    )}
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