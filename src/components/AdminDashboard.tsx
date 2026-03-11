import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import { ThemeToggle } from "./ui/ThemeToggle";
import { LineChart, BarChart, PieChart, StackedBarChart } from "./MetricsCharts";

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
  voice_live_enabled: "Habilita ou desabilita o modo Voz Real-time (Gemini Live) para este plano. Valores: true / false.",
  voice_live_max_minutes_daily: "Limite diário de minutos de voz real-time por usuário. 0 = desabilitado.",
  tts_enabled: "Habilita ou desabilita a síntese de voz (TTS) para este plano. Valores: true / false.",
  max_searches_daily: "Limite diário de buscas na web por usuário.",
  max_deep_research_daily: "Limite diário de pesquisas profundas (deep research) por usuário.",
};

const INFRA_KEYS = new Set([
  "max_concurrent_images",
  "max_image_workers",
  "max_global_processing",
  "task_timeout_minutes",
  "admin_bypass_limits",
]);

const LIMIT_FIELDS: { key: string; label: string; type: "number" | "boolean" }[] = [
  { key: "max_tasks_per_user", label: "Tarefas simultâneas", type: "number" },
  { key: "max_tasks_per_user_daily", label: "Imagens por dia", type: "number" },
  { key: "voice_live_enabled", label: "Voz real-time", type: "boolean" },
  { key: "voice_live_max_minutes_daily", label: "Minutos de voz/dia", type: "number" },
  { key: "tts_enabled", label: "Síntese de voz (TTS)", type: "boolean" },
  { key: "max_searches_daily", label: "Buscas na web/dia", type: "number" },
  { key: "max_deep_research_daily", label: "Pesquisa profunda/dia", type: "number" },
];

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

function PeriodSelect({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: { value: number; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);

  const close = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [close]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-content hover:text-accent transition-colors cursor-pointer"
      >
        {current?.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] py-1 rounded-xl bg-surface-up border border-line shadow-lg">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                o.value === value ? "text-accent" : "text-content-2 hover:text-content hover:bg-surface-card"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onExitAdmin: () => void;
}

export function AdminDashboard({ token, onLogout, onExitAdmin }: AdminDashboardProps) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"negocio" | "saude" | "admins" | "planos" | "assinaturas" | "usuarios" | "sistema" | "campanhas">("negocio");

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [plansData, setPlansData] = useState<any[]>([]);
  const [subsData, setSubsData] = useState<any[]>([]);
  const [campaignsData, setCampaignsData] = useState<any[]>([]);
  
  const [systemQueue, setSystemQueue] = useState<any>(null);
  const [systemConfigs, setSystemConfigs] = useState<any>({});
  const [systemTasks, setSystemTasks] = useState<any[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [costData, setCostData] = useState<any>(null);
  const [metricsDays, setMetricsDays] = useState(7);
  
  const [searchUser, setSearchUser] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [manualSubPhone, setManualSubPhone] = useState("");
  const [manualSubPlan, setManualSubPlan] = useState("premium");
  const [manualSubDays, setManualSubDays] = useState(30);

  const [planForm, setPlanForm] = useState({
    code: "premium",
    name: "Plano Premium",
    description: "Acesso completo ao Teq com tudo liberado e 7 dias grátis.",
    amount_cents: 4990,
    trial_days: 7,
    stripe_price_id: "",
    features_json: '["Acesso completo","WhatsApp","Tarefas","Lembretes","Chat por voz"]',
    limits_json: '{}',
  });
  const [campaignForm, setCampaignForm] = useState({
    id: 0,
    title: "",
    message: "",
    image_url: "",
    cta_label: "Experimentar Premium",
    cta_action: "open_checkout",
    cta_url: "",
    audience: "all",
    frequency: "once",
    priority: 100,
    active: true,
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
        const [analytics, costs] = await Promise.all([
          api.fetchWithAuth(`/admin/business/analytics?days=${metricsDays}`, { token }),
          api.fetchWithAuth(`/admin/business/cost-per-user?days=${metricsDays}`, { token }),
        ]);
        setAnalyticsData(analytics);
        setCostData(costs);
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
      } else if (tab === "campanhas") {
        const c = await api.getAdminCampaigns(token);
        setCampaignsData(c);
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
          limits_json: planForm.limits_json,
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
          code: "", name: "", description: "", amount_cents: 0, trial_days: 0, stripe_price_id: "", features_json: '[]', limits_json: '{}'
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

  const handleCreateCampaign = async () => {
    try {
      await api.createAdminCampaign(token, {
        title: campaignForm.title,
        message: campaignForm.message,
        image_url: campaignForm.image_url || null,
        cta_label: campaignForm.cta_label || null,
        cta_action: campaignForm.cta_action,
        cta_url: campaignForm.cta_url || null,
        audience: campaignForm.audience,
        frequency: campaignForm.frequency,
        priority: Number(campaignForm.priority) || 100,
        active: campaignForm.active,
      });
      showToast("Campanha criada com sucesso", "success");
      setCampaignForm((prev) => ({
        ...prev,
        id: 0,
        title: "",
        message: "",
        image_url: "",
      }));
      fetchAdminData();
    } catch (e: any) {
      showToast(e.message || "Erro ao criar campanha", "error");
    }
  };

  const handleUpdateCampaign = async () => {
    if (!campaignForm.id) {
      showToast("Selecione uma campanha para editar", "error");
      return;
    }
    try {
      await api.updateAdminCampaign(token, campaignForm.id, {
        title: campaignForm.title,
        message: campaignForm.message,
        image_url: campaignForm.image_url || null,
        cta_label: campaignForm.cta_label || null,
        cta_action: campaignForm.cta_action,
        cta_url: campaignForm.cta_url || null,
        audience: campaignForm.audience,
        frequency: campaignForm.frequency,
        priority: Number(campaignForm.priority) || 100,
        active: campaignForm.active,
      });
      showToast("Campanha atualizada com sucesso", "success");
      fetchAdminData();
    } catch (e: any) {
      showToast(e.message || "Erro ao atualizar campanha", "error");
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover essa campanha?")) return;
    try {
      await api.deleteAdminCampaign(token, id);
      showToast("Campanha removida com sucesso", "success");
      if (campaignForm.id === id) {
        setCampaignForm({
          id: 0,
          title: "",
          message: "",
          image_url: "",
          cta_label: "Experimentar Premium",
          cta_action: "open_checkout",
          cta_url: "",
          audience: "all",
          frequency: "once",
          priority: 100,
          active: true,
        });
      }
      fetchAdminData();
    } catch (e: any) {
      showToast(e.message || "Erro ao remover campanha", "error");
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
          <ThemeToggle />
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
          <button 
            onClick={() => setTab("campanhas")}
            className={`p-3 text-left rounded-xl text-sm tracking-wide font-medium transition-colors ${tab === "campanhas" ? "bg-accent/10 text-accent border border-accent/20" : "text-content-3 hover:bg-surface-card hover:text-content border border-transparent"}`}
          >
            Campanhas
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-8 bg-surface">
          {tab === "negocio" && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-light text-content">Métricas de Negócio</h2>
                <PeriodSelect
                  value={metricsDays}
                  onChange={setMetricsDays}
                  options={[
                    { value: 7, label: "Últimos 7 dias" },
                    { value: 30, label: "Últimos 30 dias" },
                    { value: 90, label: "Últimos 90 dias" },
                  ]}
                />
              </div>

              {/* Financeiro */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Financeiro</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">MRR</span>
                      <Tooltip text="Receita Mensal Recorrente, soma do valor dos planos com assinaturas ativas." />
                    </div>
                    <span className="text-3xl font-light text-green-500">{formatBRL(analyticsData?.financial?.mrr_cents || 0)}</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Assinantes</span>
                      <Tooltip text="Total de assinaturas ativas ou em período de teste pago." />
                    </div>
                    <span className="text-3xl font-light text-accent">{analyticsData?.financial?.active_subs || 0}</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Conversão</span>
                      <Tooltip text="Taxa de conversão: % de usuários que fizeram trial e se tornaram pagantes." />
                    </div>
                    <span className="text-3xl font-light text-blue-500">{analyticsData?.financial?.conversion_rate || 0}%</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Churn</span>
                      <Tooltip text="Taxa de cancelamento no período selecionado: % de assinantes que cancelaram." />
                    </div>
                    <span className="text-3xl font-light text-red-400">{analyticsData?.financial?.churn_rate || 0}%</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Status</span>
                      <Tooltip text="Distribuição dos status das assinaturas (ativa, teste, cancelada, etc)." />
                    </div>
                    <div className="flex-1 -mx-4 -mt-2">
                      {analyticsData?.financial?.status_distribution?.length > 0 ? (
                        <PieChart data={analyticsData.financial.status_distribution} height={140} innerRadius={35} outerRadius={50} />
                      ) : (
                        <div className="h-[140px] flex items-center justify-center text-xs text-content-4">Sem dados</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Engajamento */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Engajamento de Usuários</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Novos Usuários por Dia</span>
                      <Tooltip text="Quantidade de novos cadastros por dia (baseado na data de início do trial)." />
                    </div>
                    {analyticsData?.engagement?.new_users_by_day?.length > 0 ? (
                      <BarChart data={analyticsData.engagement.new_users_by_day} xKey="date" barKey="users" barName="Novos" color="#f59e0b" height={220} />
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                    )}
                  </div>
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Usuários Ativos por Dia (DAU)</span>
                      <Tooltip text="Daily Active Users (DAU): Quantidade de usuários únicos que interagiram com o Teq a cada dia." />
                    </div>
                    {analyticsData?.engagement?.dau?.length > 0 ? (
                      <BarChart data={analyticsData.engagement.dau} xKey="date" barKey="users" barName="Usuários" color="#3b82f6" height={220} />
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                    )}
                  </div>
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Mensagens por Dia</span>
                      <Tooltip text="Volume diário de mensagens processadas. Recebidas são as mensagens do usuário, Enviadas são as respostas do Agente." />
                    </div>
                    {analyticsData?.engagement?.messages_by_day?.length > 0 ? (
                      <LineChart 
                        data={analyticsData.engagement.messages_by_day} 
                        xKey="date" 
                        lines={[
                          { key: 'received', name: 'Recebidas (Usuário)', color: '#8b5cf6' },
                          { key: 'sent', name: 'Enviadas (Agente)', color: '#10b981' }
                        ]} 
                        height={220} 
                      />
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Por Canal */}
              {analyticsData?.channel_metrics && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Por Canal</h3>

                {/* KPI cards — mensagens por canal */}
                {(() => {
                  const ch = analyticsData.channel_metrics;
                  const CHANNEL_LABELS: Record<string, string> = { whatsapp: "WhatsApp", web: "Web", web_live: "Voz" };
                  const CHANNEL_COLORS: Record<string, string> = { whatsapp: "text-green-500", web: "text-blue-500", web_live: "text-purple-500" };
                  const msgs = ch.messages_by_channel || [];
                  const totalReceived = msgs.reduce((s: number, m: any) => s + (m.received || 0), 0);
                  return (
                    <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {msgs.map((m: any) => {
                        const label = CHANNEL_LABELS[m.channel] || m.channel;
                        const colorCls = CHANNEL_COLORS[m.channel] || "text-accent";
                        const pct = totalReceived > 0 ? Math.round((m.received / totalReceived) * 100) : 0;
                        return (
                          <div key={m.channel} className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase tracking-wider text-content-3">{label}</span>
                              <span className="text-[10px] text-content-4">{pct}%</span>
                            </div>
                            <span className={`text-3xl font-light ${colorCls}`}>{m.received || 0}</span>
                            <span className="text-[10px] text-content-4">{m.sent || 0} respostas</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mensagens por dia por canal — stacked */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center">
                          <span className="text-xs uppercase tracking-wider text-content-3">Mensagens / Dia / Canal</span>
                          <Tooltip text="Volume diário de mensagens por canal. Barras sólidas = usuário (recebidas). Barras claras = agente (enviadas)." />
                        </div>
                        {ch.messages_by_day_channel?.length > 0 ? (
                          <StackedBarChart
                            data={ch.messages_by_day_channel}
                            xKey="date"
                            bars={[
                              { key: "whatsapp_received", name: "WhatsApp ↓", color: "#22c55e" },
                              { key: "web_received", name: "Web ↓", color: "#3b82f6" },
                              { key: "web_live_received", name: "Voz ↓", color: "#8b5cf6" },
                              { key: "whatsapp_sent", name: "WhatsApp ↑", color: "#86efac" },
                              { key: "web_sent", name: "Web ↑", color: "#93c5fd" },
                              { key: "web_live_sent", name: "Voz ↑", color: "#c4b5fd" },
                            ]}
                            height={250}
                          />
                        ) : (
                          <div className="h-[250px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                        )}
                      </div>

                      {/* DAU por canal */}
                      <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center">
                          <span className="text-xs uppercase tracking-wider text-content-3">DAU por Canal</span>
                          <Tooltip text="Usuários ativos únicos por dia em cada canal." />
                        </div>
                        {ch.dau_by_channel?.length > 0 ? (
                          <LineChart
                            data={ch.dau_by_channel}
                            xKey="date"
                            lines={[
                              { key: "whatsapp", name: "WhatsApp", color: "#22c55e" },
                              { key: "web", name: "Web", color: "#3b82f6" },
                              { key: "web_live", name: "Voz", color: "#8b5cf6" },
                            ]}
                            height={250}
                          />
                        ) : (
                          <div className="h-[250px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                        )}
                      </div>
                    </div>

                    {/* Tool calls por canal + WhatsApp media mix */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center">
                          <span className="text-xs uppercase tracking-wider text-content-3">Tool Calls por Canal</span>
                          <Tooltip text="Quantidade total de ferramentas acionadas pelo agente em cada canal." />
                        </div>
                        {ch.tools_by_channel?.length > 0 ? (
                          <BarChart
                            data={ch.tools_by_channel.map((t: any) => ({ ...t, channel: CHANNEL_LABELS[t.channel] || t.channel }))}
                            xKey="channel"
                            barKey="calls"
                            barName="Chamadas"
                            color="#f59e0b"
                            height={250}
                          />
                        ) : (
                          <div className="h-[250px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                        )}
                      </div>

                      <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center">
                          <span className="text-xs uppercase tracking-wider text-content-3">WhatsApp: Mix de Mídia</span>
                          <Tooltip text="Proporção de mensagens recebidas via WhatsApp por tipo: texto puro, áudio e imagem." />
                        </div>
                        {ch.whatsapp_media_mix?.some((m: any) => m.value > 0) ? (
                          <PieChart data={ch.whatsapp_media_mix} height={250} innerRadius="55%" outerRadius="75%" />
                        ) : (
                          <div className="h-[250px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                        )}
                      </div>
                    </div>

                    {/* Top tools por canal — tabela lado a lado */}
                    <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-line/50">
                        <span className="text-xs uppercase tracking-wider text-content-3">Top Tools por Canal</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line/50">
                        {(["whatsapp", "web", "web_live"] as const).map((chKey) => (
                          <div key={chKey} className="p-4">
                            <span className={`text-xs font-medium uppercase tracking-wider ${CHANNEL_COLORS[chKey] || "text-content-2"}`}>
                              {CHANNEL_LABELS[chKey] || chKey}
                            </span>
                            <div className="mt-3 space-y-2">
                              {(ch.top_tools_per_channel?.[chKey] || []).length > 0 ? (
                                ch.top_tools_per_channel[chKey].map((t: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center">
                                    <span className="text-xs text-content-2 font-mono truncate">{t.name}</span>
                                    <span className="text-xs font-mono text-content-3 bg-surface px-1.5 py-0.5 rounded-md ml-2">{t.calls}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-content-4">Sem dados</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Latência, erro e voz stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(ch.latency_by_channel || []).map((l: any) => (
                        <div key={l.channel} className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wider text-content-3">
                            Latência {CHANNEL_LABELS[l.channel] || l.channel}
                          </span>
                          <span className={`text-2xl font-light ${l.avg_ms > 5000 ? 'text-red-500' : l.avg_ms > 2000 ? 'text-orange-500' : 'text-green-500'}`}>
                            {(l.avg_ms / 1000).toFixed(1)}s
                          </span>
                          <span className="text-[10px] text-content-4">{l.count} msgs</span>
                        </div>
                      ))}
                      {(ch.error_by_channel || []).map((e: any) => (
                        <div key={e.channel} className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wider text-content-3">
                            Erro {CHANNEL_LABELS[e.channel] || e.channel}
                          </span>
                          <span className={`text-2xl font-light ${e.error_rate > 5 ? 'text-red-500' : 'text-green-500'}`}>
                            {e.error_rate}%
                          </span>
                          <span className="text-[10px] text-content-4">{e.failed}/{e.total} tools</span>
                        </div>
                      ))}
                    </div>

                    {/* Voice Live + Custo LLM */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                        <div className="flex items-center">
                          <span className="text-xs uppercase tracking-wider text-content-3">Sessões Voz Live</span>
                          <Tooltip text="Total de sessões de voz real-time (Gemini Live) e duração média." />
                        </div>
                        <span className="text-3xl font-light text-purple-500">{ch.voice_live_stats?.sessions || 0}</span>
                        <span className="text-xs text-content-4">Duração média: {ch.voice_live_stats?.avg_duration_s || 0}s</span>
                      </div>
                      <div className="md:col-span-2 bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center">
                          <span className="text-xs uppercase tracking-wider text-content-3">Custo LLM por Canal</span>
                          <Tooltip text="Custo estimado de API do LLM (USD) separado por canal de origem." />
                        </div>
                        {ch.cost_by_channel?.length > 0 ? (
                          <BarChart
                            data={ch.cost_by_channel.map((c: any) => ({ ...c, channel: CHANNEL_LABELS[c.channel] || c.channel }))}
                            xKey="channel"
                            barKey="cost_usd"
                            barName="USD"
                            color="#ef4444"
                            height={200}
                          />
                        ) : (
                          <div className="h-[200px] flex items-center justify-center text-sm text-content-4">Sem dados de custo</div>
                        )}
                      </div>
                    </div>
                    </>
                  );
                })()}
              </div>
              )}

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Uso de Features</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Top Tools (Chamadas)</span>
                      <Tooltip text="Ranking das ferramentas mais utilizadas pelo agente para responder aos usuários." />
                    </div>
                    {analyticsData?.features?.tools_ranking?.length > 0 ? (
                      <BarChart data={analyticsData.features.tools_ranking.slice(0, 5)} xKey="name" barKey="calls" barName="Chamadas" color="#f59e0b" height={250} />
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-sm text-content-4">Sem dados no período</div>
                    )}
                  </div>
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Tendência de Tools</span>
                      <Tooltip text="Evolução diária no volume de chamadas das 5 ferramentas mais populares." />
                    </div>
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

              {/* Custo Aproximado por Usuário */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium tracking-wide text-content-2">Custo de API ({metricsDays} dias)</h3>
                  <Tooltip text="Custo de API (Gemini) por usuário. Dados 'reais' usam tokens reportados pelo LLM. Dados 'estimados' usam contagem de mensagens × custo médio." />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wider text-content-3">Custo Total</span>
                    <span className="text-3xl font-light text-red-400">R$ {costData?.total_cost_brl?.toFixed(2) ?? "—"}</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wider text-content-3">Custo Médio / Usuário</span>
                    <span className="text-3xl font-light text-orange-400">R$ {costData?.avg_cost_per_user_brl?.toFixed(2) ?? "—"}</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wider text-content-3">Usuários com Consumo</span>
                    <span className="text-3xl font-light text-accent">{costData?.active_users ?? "—"}</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wider text-content-3">Fonte dos Dados</span>
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-sm text-green-500">{costData?.real_data_users ?? 0} reais (tokens)</span>
                      <span className="text-sm text-content-4">{costData?.estimated_data_users ?? 0} estimados</span>
                    </div>
                  </div>
                </div>

                {costData?.top_users?.length > 0 && (
                  <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-line/50">
                      <span className="text-xs uppercase tracking-wider text-content-3">Top Usuários por Custo</span>
                    </div>
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-line/50 text-left text-xs text-content-4 uppercase tracking-wider">
                            <th className="px-4 py-2">Usuário</th>
                            <th className="px-4 py-2 text-center">Fonte</th>
                            <th className="px-4 py-2 text-right">LLM</th>
                            <th className="px-4 py-2 text-right">Imagens</th>
                            <th className="px-4 py-2 text-right">Tokens</th>
                            <th className="px-4 py-2 text-right font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {costData.top_users.map((u: any, i: number) => (
                            <tr key={i} className="border-b border-line/30 last:border-0 hover:bg-surface/50">
                              <td className="px-4 py-2">
                                <span className="font-mono text-xs">{u.name || u.user_id}</span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${u.source === "real" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                                  {u.source === "real" ? "real" : "est."}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-content-3">
                                {u.source === "real"
                                  ? (u.breakdown.llm > 0 ? `R$${u.breakdown.llm.toFixed(2)}` : "—")
                                  : ((u.breakdown.chat || 0) + (u.breakdown.voice || 0) + (u.breakdown.tts || 0) > 0
                                    ? `R$${((u.breakdown.chat || 0) + (u.breakdown.voice || 0) + (u.breakdown.tts || 0)).toFixed(2)}`
                                    : "—")}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-content-3">{(u.breakdown.images || 0) > 0 ? `R$${u.breakdown.images.toFixed(2)}` : "—"}</td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-content-4">
                                {u.source === "real" && u.breakdown.total_tokens ? u.breakdown.total_tokens.toLocaleString("pt-BR") : "—"}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-red-400">R${u.cost_brl.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Operacional */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Operacional ({metricsDays} dias)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Taxa de Erro (Tools)</span>
                      <Tooltip text="Proporção de falhas nas chamadas de ferramenta pelo agente no período." />
                    </div>
                    <span className={`text-3xl font-light ${analyticsData?.operational?.error_rate > 5 ? 'text-red-500' : 'text-green-500'}`}>
                      {analyticsData?.operational?.error_rate || 0}%
                    </span>
                  </div>
                  <div className="md:col-span-2 p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-4">
                    <div className="flex items-center">
                      <span className="text-xs uppercase tracking-wider text-content-3">Latência Média por Tool (ms)</span>
                      <Tooltip text="Tempo médio de resposta de cada ferramenta, em milissegundos. Valores altos indicam gargalos na API externa ou no processamento." />
                    </div>
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
                <PeriodSelect
                  value={metricsDays}
                  onChange={setMetricsDays}
                  options={[
                    { value: 1, label: "Hoje" },
                    { value: 7, label: "Últimos 7 dias" },
                    { value: 30, label: "Últimos 30 dias" },
                  ]}
                />
              </div>
              
              {/* Fila Real-time */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Fila em Tempo Real</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <div className="flex items-center">
                      <span className="text-[10px] uppercase tracking-wider text-content-3">Na Fila</span>
                      <Tooltip text="Tarefas aguardando processamento no momento atual." />
                    </div>
                    <span className="text-2xl font-light text-accent">{systemQueue?.pending || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <div className="flex items-center">
                      <span className="text-[10px] uppercase tracking-wider text-content-3">Processando</span>
                      <Tooltip text="Tarefas sendo processadas agora pelo servidor." />
                    </div>
                    <span className="text-2xl font-light text-orange-500">{systemQueue?.processing || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <div className="flex items-center">
                      <span className="text-[10px] uppercase tracking-wider text-content-3">Concluídas (24h)</span>
                      <Tooltip text="Tarefas finalizadas com sucesso nas últimas 24 horas." />
                    </div>
                    <span className="text-2xl font-light text-green-500">{systemQueue?.done_today || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <div className="flex items-center">
                      <span className="text-[10px] uppercase tracking-wider text-content-3">Falhas (24h)</span>
                      <Tooltip text="Tarefas que falharam nas últimas 24 horas." />
                    </div>
                    <span className="text-2xl font-light text-red-500">{systemQueue?.failed_today || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-card border border-line flex flex-col gap-1">
                    <div className="flex items-center">
                      <span className="text-[10px] uppercase tracking-wider text-content-3">Tempo Médio</span>
                      <Tooltip text="Tempo médio de espera na fila antes de uma tarefa começar a ser processada." />
                    </div>
                    <span className="text-2xl font-light text-content">{systemQueue?.avg_wait || 0}s</span>
                  </div>
                </div>
              </div>

              {/* Admin Bypass Toggle */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Admin</h3>
                <div className="bg-surface-card border border-line rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-content font-medium">Bypass de limites para Admin</p>
                      <p className="text-[10px] text-content-3 mt-0.5">Quando desligado, admins são tratados como usuários free para testar fluxos de limite.</p>
                    </div>
                    <button
                      onClick={async () => {
                        const current = (systemConfigs["admin_bypass_limits"] ?? "true").toLowerCase();
                        const next = current === "true" ? "false" : "true";
                        try {
                          await api.fetchWithAuth("/admin/system/config", {
                            method: "PUT", token, body: JSON.stringify({ key: "admin_bypass_limits", value: next })
                          });
                          setSystemConfigs({ ...systemConfigs, admin_bypass_limits: next });
                          showToast(next === "true" ? "Bypass ativado" : "Bypass desativado", "success");
                        } catch {
                          showToast("Erro ao salvar", "error");
                        }
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        (systemConfigs["admin_bypass_limits"] ?? "true").toLowerCase() === "true"
                          ? "bg-accent"
                          : "bg-line"
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-transform ${
                        (systemConfigs["admin_bypass_limits"] ?? "true").toLowerCase() === "true"
                          ? "translate-x-[22px] bg-surface"
                          : "translate-x-0.5 bg-white"
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Infraestrutura (global) */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-content-2">Infraestrutura (Global)</h3>
                <div className="bg-surface-card border border-line rounded-2xl p-4 space-y-4">
                  {Object.entries(systemConfigs)
                    .filter(([key]) => INFRA_KEYS.has(key.split(":")[0]))
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
                {/* Limites por Plano — agora configurados dentro de cada plano na aba Planos */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium tracking-wide text-content-2">Limites por Plano</h3>
                  <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-content-3">Os limites de uso agora são configurados diretamente em cada plano.</p>
                    <button onClick={() => setTab("planos")} className="px-4 py-2 rounded-xl bg-accent/10 text-accent text-xs font-medium uppercase tracking-wider hover:bg-accent/20 transition-colors">
                      Ir para Planos
                    </button>
                  </div>
                </div>

                {/* Top Consumidores */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <h3 className="text-sm font-medium tracking-wide text-content-2">Top Consumidores de Imagens</h3>
                    <Tooltip text="Usuários que mais geraram imagens com carrosséis ou edições no período selecionado." />
                  </div>
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
                <div className="flex items-center">
                  <h3 className="text-sm font-medium tracking-wide text-content-2">Tasks Recentes (Fila)</h3>
                  <Tooltip text="Últimas tarefas que passaram ou estão aguardando na fila do sistema." />
                </div>
                <div className="bg-surface-card border border-line rounded-2xl overflow-x-auto scrollbar-thin">
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
                  <div className="flex items-center">
                    <span className="text-xs uppercase tracking-wider text-content-3">Status Geral</span>
                    <Tooltip text="Indica se os serviços principais do Teq estão operando normalmente." />
                  </div>
                  <span className={`text-xl font-medium ${healthData?.status === 'online' ? 'text-green-500' : 'text-red-500'}`}>
                    {healthData?.status?.toUpperCase() || "CARREGANDO..."}
                  </span>
                </div>
                <div className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                  <div className="flex items-center">
                    <span className="text-xs uppercase tracking-wider text-content-3">Banco de Dados</span>
                    <Tooltip text="Status da conexão com o banco de dados principal." />
                  </div>
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
                            u.subscription_status === 'past_due'  ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                            u.subscription_status === 'canceled'  ? 'border-red-500 text-red-500 bg-red-500/10' :
                            'border-line text-content-3 bg-surface'
                          }`}>
                            {{
                              active:    'Premium',
                              pro_trial: 'Premium (Trial)',
                              past_due:  'Pendente',
                              canceled:  'Cancelado',
                              free:      'Free',
                            }[u.subscription_status as string] ?? u.subscription_status ?? 'Free'}
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

                {/* Limites do plano */}
                <div className="border-t border-line pt-4">
                  <h4 className="text-xs uppercase tracking-wider text-content-3 mb-3">Limites de uso</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {LIMIT_FIELDS.map((field) => {
                      const limits = (() => { try { return JSON.parse(planForm.limits_json || "{}"); } catch { return {}; } })();
                      if (field.type === "boolean") {
                        const val = !!limits[field.key];
                        return (
                          <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={val}
                              onChange={(e) => {
                                const updated = { ...limits, [field.key]: e.target.checked };
                                setPlanForm((prev) => ({ ...prev, limits_json: JSON.stringify(updated) }));
                              }}
                              className="accent-accent w-4 h-4"
                            />
                            <span className="text-xs text-content">{field.label}</span>
                            {CONFIG_TOOLTIPS[field.key] && <Tooltip text={CONFIG_TOOLTIPS[field.key]} />}
                          </label>
                        );
                      }
                      return (
                        <div key={field.key} className="flex flex-col gap-1">
                          <div className="flex items-center">
                            <label className="text-xs text-content">{field.label}</label>
                            {CONFIG_TOOLTIPS[field.key] && <Tooltip text={CONFIG_TOOLTIPS[field.key]} />}
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={limits[field.key] ?? 0}
                            onChange={(e) => {
                              const updated = { ...limits, [field.key]: Number(e.target.value) || 0 };
                              setPlanForm((prev) => ({ ...prev, limits_json: JSON.stringify(updated) }));
                            }}
                            className="w-full bg-surface border border-line rounded-lg px-3 py-1.5 text-sm text-content focus:border-accent outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleCreatePlan} className="px-4 py-2 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity">Criar plano</button>
                  <button onClick={() => handleUpdatePlan(planForm.code)} className="px-4 py-2 rounded-xl bg-transparent border border-line text-content font-medium tracking-wider uppercase text-sm hover:bg-surface transition-colors">Salvar alterações</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plansData.map((p, i) => {
                  const planLimits = (() => { try { return JSON.parse(p.limits_json || "{}"); } catch { return {}; } })();
                  return (
                    <div key={i} className="p-6 rounded-2xl bg-surface-card border border-line flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xl text-content">{p.name}</span>
                        {p.code === "free" && <span className="text-[10px] uppercase tracking-wider text-content-4 border border-line px-2 py-0.5 rounded-full">Padrão</span>}
                      </div>
                      <span className="text-sm text-content-3">{p.description}</span>
                      <span className="text-2xl font-light text-accent">{formatBRL(p.amount_cents)}</span>
                      <span className="text-xs uppercase tracking-wider text-content-3">Trial: {p.trial_days} dias</span>
                      {/* Limites resumidos */}
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                        {LIMIT_FIELDS.map((f) => (
                          <div key={f.key} className="flex justify-between text-[11px]">
                            <span className="text-content-3">{f.label}</span>
                            <span className="text-content font-mono">
                              {f.type === "boolean" ? (planLimits[f.key] ? "✓" : "✗") : (planLimits[f.key] ?? "—")}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <button onClick={() => setPlanForm((prev) => ({ ...prev, ...p, limits_json: p.limits_json || "{}" }))} className="text-left text-xs text-accent hover:underline">
                          Editar este plano
                        </button>
                        {p.code !== "free" && (
                          <button onClick={() => handleDeletePlan(p.code)} className="text-left text-xs text-red-500 hover:underline">
                            Apagar plano
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

          {tab === "campanhas" && (
            <div className="max-w-5xl mx-auto space-y-8">
              <h2 className="text-xl font-light text-content">Campanhas de Popup</h2>

              <div className="bg-surface-card border border-line rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-medium text-content uppercase tracking-wider">Criar / editar campanha</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Título"
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
                  />
                  <input
                    value={campaignForm.image_url}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, image_url: e.target.value }))}
                    placeholder="URL da imagem"
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
                  />
                  <input
                    value={campaignForm.message}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Mensagem"
                    className="md:col-span-2 w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
                  />
                  <input
                    value={campaignForm.cta_label}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, cta_label: e.target.value }))}
                    placeholder="Texto do botão CTA"
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
                  />
                  <select
                    value={campaignForm.cta_action}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, cta_action: e.target.value }))}
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content focus:outline-none transition-colors"
                  >
                    <option value="open_checkout" className="bg-surface-up text-content">Abrir checkout</option>
                    <option value="open_account" className="bg-surface-up text-content">Abrir conta</option>
                    <option value="external_url" className="bg-surface-up text-content">Link externo</option>
                  </select>
                  <input
                    value={campaignForm.cta_url}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, cta_url: e.target.value }))}
                    placeholder="URL externa (se aplicável)"
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
                  />
                  <select
                    value={campaignForm.audience}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, audience: e.target.value }))}
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content focus:outline-none transition-colors"
                  >
                    <option value="all" className="bg-surface-up text-content">Todos</option>
                    <option value="free_only" className="bg-surface-up text-content">Somente Free Tier</option>
                    <option value="paid_only" className="bg-surface-up text-content">Somente Premium</option>
                  </select>
                  <select
                    value={campaignForm.frequency}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, frequency: e.target.value }))}
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content focus:outline-none transition-colors"
                  >
                    <option value="once" className="bg-surface-up text-content">Uma vez</option>
                    <option value="per_session" className="bg-surface-up text-content">Uma vez por sessão</option>
                    <option value="daily" className="bg-surface-up text-content">Uma vez por dia</option>
                  </select>
                  <input
                    type="number"
                    value={campaignForm.priority}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, priority: Number(e.target.value) || 100 }))}
                    placeholder="Prioridade"
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
                  />
                  <label className="flex items-center gap-2 text-sm text-content-2">
                    <input
                      type="checkbox"
                      checked={campaignForm.active}
                      onChange={(e) => setCampaignForm((prev) => ({ ...prev, active: e.target.checked }))}
                    />
                    Campanha ativa
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateCampaign}
                    className="px-4 py-2 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
                  >
                    Criar campanha
                  </button>
                  <button
                    onClick={handleUpdateCampaign}
                    className="px-4 py-2 rounded-xl bg-transparent border border-line text-content font-medium tracking-wider uppercase text-sm hover:bg-surface transition-colors"
                  >
                    Salvar alterações
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaignsData.map((c: any) => (
                  <div key={c.id} className="p-6 rounded-2xl bg-surface-card border border-line space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg text-content">{c.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full border ${c.active ? "border-green-500 text-green-500 bg-green-500/10" : "border-line text-content-3"}`}>
                        {c.active ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <p className="text-sm text-content-3">{c.message}</p>
                    <div className="text-xs text-content-4 space-y-1">
                      <div>Audiência: {c.audience}</div>
                      <div>Frequência: {c.frequency}</div>
                      <div>Prioridade: {c.priority}</div>
                      <div>Ação CTA: {c.cta_action}</div>
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <button
                        onClick={() => setCampaignForm({
                          id: c.id,
                          title: c.title || "",
                          message: c.message || "",
                          image_url: c.image_url || "",
                          cta_label: c.cta_label || "Experimentar Premium",
                          cta_action: c.cta_action || "open_checkout",
                          cta_url: c.cta_url || "",
                          audience: c.audience || "all",
                          frequency: c.frequency || "once",
                          priority: c.priority || 100,
                          active: Boolean(c.active),
                        })}
                        className="text-xs text-accent hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(c.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
                {campaignsData.length === 0 && (
                  <div className="text-sm text-content-4 italic">Nenhuma campanha cadastrada.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}