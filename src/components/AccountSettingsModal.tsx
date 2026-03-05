import { useEffect, useMemo, useState } from "react";
import * as api from "../lib/api";
import type { UserInfo } from "../hooks/useAuth";

interface AccountSettingsModalProps {
  token: string;
  user: UserInfo;
  open: boolean;
  onClose: () => void;
  onOpenCheckout?: (priceId?: string) => void;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
}

export function AccountSettingsModal({ token, user, open, onClose, onOpenCheckout }: AccountSettingsModalProps) {
  const [billing, setBilling] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"idle" | "verify">("idle");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([api.getBillingOverview(token), api.getBillingPlans(token)])
      .then(([billingData, plansData]) => {
        setBilling(billingData);
        setPlans(plansData.plans || []);
      })
      .catch((err) => setMessage(err.message || "Erro ao carregar dados da conta"))
      .finally(() => setLoading(false));
  }, [open, token]);

  const formattedPrice = useMemo(() => {
    if (!billing?.amount_cents) return null;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: (billing.currency || "BRL").toUpperCase() }).format(
      billing.amount_cents / 100
    );
  }, [billing]);

  if (!open) return null;

  const handlePortal = async () => {
    const data = await api.openBillingPortal(token);
    window.location.href = data.url;
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Cancelar a assinatura ao fim do período atual?")) return;
    const data = await api.cancelBilling(token);
    setMessage(data.status === "canceled_at_period_end" ? "Assinatura configurada para cancelamento no fim do período." : "Assinatura atualizada.");
  };

  const handleRequestPhoneChange = async () => {
    setMessage("");
    const cleanedPhone = newPhone.replace(/\D/g, "");
    const data = await api.requestPhoneChange(token, cleanedPhone);
    setMessage(data.message);
    setStep("verify");
  };

  const handleVerifyPhoneChange = async () => {
    const cleanedPhone = newPhone.replace(/\D/g, "");
    const data = await api.verifyPhoneChange(token, cleanedPhone, code);
    localStorage.setItem("teq_token", data.token);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-up border border-line shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <div>
            <h2 className="text-xl font-light text-content">Conta e Assinatura</h2>
            <p className="text-sm text-content-3">Perfil, plano, pagamento e segurança</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium uppercase tracking-wider">
            Fechar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="text-sm uppercase tracking-wider text-content-3 mb-3">Perfil</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-content-4 uppercase tracking-wider text-xs">Nome</div>
                  <div className="text-content">{user.name || "-"}</div>
                </div>
                <div>
                  <div className="text-content-4 uppercase tracking-wider text-xs">Usuário</div>
                  <div className="text-content">{user.username || "-"}</div>
                </div>
                <div>
                  <div className="text-content-4 uppercase tracking-wider text-xs">E-mail</div>
                  <div className="text-content">{user.email || "-"}</div>
                </div>
                <div>
                  <div className="text-content-4 uppercase tracking-wider text-xs">WhatsApp</div>
                  <div className="text-content">{user.phone_number || "-"}</div>
                  <div className="text-xs text-content-3 mt-1">{user.whatsapp_verified ? "Validado" : "Pendente de validação"}</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-line">
              <h3 className="text-sm uppercase tracking-wider text-content-3 mb-3">Trocar telefone</h3>
              <div className="space-y-3">
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(maskPhone(e.target.value))}
                  placeholder="+55 (21) 99999-9999"
                  className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
                />
                {step === "verify" && (
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Código recebido no novo WhatsApp"
                    className="w-full bg-transparent border-b border-line focus:border-line-strong py-2 text-content placeholder-content-4 focus:outline-none transition-colors"
                  />
                )}
                <div className="flex gap-3">
                  {step === "idle" ? (
                    <button onClick={handleRequestPhoneChange} className="px-4 py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity">
                      Enviar código
                    </button>
                  ) : (
                    <button onClick={handleVerifyPhoneChange} className="px-4 py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity">
                      Confirmar troca
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-3xl p-6 relative min-h-[400px]">
            {/* Skeleton Overlay */}
            <div className={`absolute inset-6 z-10 transition-opacity duration-500 flex flex-col space-y-5 ${
              billing ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}>
              <div>
                <div className="w-24 h-4 bg-line/30 rounded animate-pulse mb-3"></div>
                <div className="space-y-2">
                  <div className="w-48 h-6 bg-line/30 rounded animate-pulse"></div>
                  <div className="w-full h-4 bg-line/20 rounded animate-pulse"></div>
                  <div className="w-32 h-8 bg-line/30 rounded animate-pulse mt-2"></div>
                  <div className="w-40 h-3 bg-line/20 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="pt-4 border-t border-line">
                <div className="w-32 h-4 bg-line/30 rounded animate-pulse mb-3"></div>
                <div className="space-y-3">
                  <div className="w-full h-32 bg-line/20 rounded-2xl animate-pulse"></div>
                  <div className="w-full h-32 bg-line/20 rounded-2xl animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className={`transition-opacity duration-500 space-y-5 ${billing ? "opacity-100" : "opacity-0"}`}>
              {billing && (
                billing.has_stripe_subscription ? (
              <>
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-content-3 mb-3">Meu plano</h3>
                  <div className="space-y-2">
                    <div className="text-xl text-content">{billing.plan_name}</div>
                    <div className="text-content-3 text-sm">{billing.plan_description}</div>
                    <div className="text-accent text-2xl font-light">{formattedPrice}</div>
                    <div className="text-xs uppercase tracking-wider text-content-3">
                      Status: {billing.status === "trialing" ? "Período de teste" : billing.status === "active" ? "Ativo" : billing.status === "past_due" ? "Pagamento pendente" : billing.status === "canceled" ? "Cancelado" : billing.status}
                    </div>
                    {billing.current_period_end && (
                      <div className="text-xs text-content-3">
                        {billing.cancel_at_period_end ? "Acesso até" : billing.status === "trialing" ? "Trial termina em" : "Próxima renovação"}:{" "}
                        {new Date(billing.current_period_end).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-line">
                  <h3 className="text-sm uppercase tracking-wider text-content-3 mb-3">Métodos de pagamento</h3>
                  <div className="space-y-2">
                    {billing.payment_methods?.length ? (
                      billing.payment_methods.map((method: any) => (
                        <div key={method.id} className="rounded-2xl border border-line p-4 text-sm text-content flex justify-between">
                          <span>{method.brand?.toUpperCase() || "Cartão"} final {method.last4}</span>
                          <span className="text-content-3">{String(method.exp_month).padStart(2, "0")}/{method.exp_year}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-content-3">Nenhum método salvo ainda.</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <button onClick={handlePortal} className="px-4 py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity">
                      Gerenciar pagamento
                    </button>
                    {!billing.cancel_at_period_end && billing.status !== "canceled" && (
                      <button onClick={handleCancelSubscription} className="px-4 py-3 rounded-xl bg-transparent border border-line text-content font-medium tracking-wider uppercase text-sm hover:bg-surface-card transition-colors">
                        Cancelar assinatura
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-content-3 mb-3">Meu plano</h3>
                  {billing?.status === "trialing" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-lg text-content">Período de teste gratuito</span>
                      </div>
                      <div className="text-content-3 text-sm">
                        Você tem acesso completo até{" "}
                        <span className="text-content font-medium">
                          {billing.trial_end ? new Date(billing.trial_end).toLocaleDateString("pt-BR") : "-"}
                        </span>
                      </div>
                      <div className="text-content-4 text-xs">Assine um plano para continuar usando após o trial.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-lg text-content">Sem plano ativo</div>
                      <div className="text-content-3 text-sm">Assine um plano para ter acesso completo ao Teq.</div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-line">
                  <h3 className="text-sm uppercase tracking-wider text-content-3 mb-3">Planos disponíveis</h3>
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div key={plan.code} className="rounded-2xl border border-line p-5 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-content text-lg">{plan.name}</div>
                            <div className="text-content-3 text-sm">{plan.description}</div>
                          </div>
                          <div className="text-accent text-xl font-light whitespace-nowrap">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: (plan.currency || "BRL").toUpperCase() }).format(plan.amount_cents / 100)}
                            <span className="text-xs text-content-4">/mês</span>
                          </div>
                        </div>
                        {plan.trial_days > 0 && (
                          <div className="text-xs text-content-3">{plan.trial_days} dias grátis para testar</div>
                        )}
                        <button
                          onClick={() => onOpenCheckout && onOpenCheckout(plan.code)}
                          className="w-full px-4 py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
                        >
                          Assinar plano
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ))}
            </div>
          </div>
        </div>

        {message && <div className="px-6 pb-6 text-sm text-content-3">{message}</div>}
      </div>
    </div>
  );
}
