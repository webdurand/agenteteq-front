import { useEffect, useMemo, useState } from "react";
import * as api from "../lib/api";
import type { UserInfo } from "../hooks/useAuth";
import { UpdatePaymentModal } from "./UpdatePaymentModal";
import { formatPhone } from "../lib/formatters";

interface AccountSettingsModalProps {
  token: string;
  user: UserInfo;
  open: boolean;
  onClose: () => void;
  onOpenCheckout?: (priceId?: string) => void;
  onReplayOnboarding?: () => void;
}

export function AccountSettingsModal({ token, user, open, onClose, onOpenCheckout, onReplayOnboarding }: AccountSettingsModalProps) {
  const [billing, setBilling] = useState<any>(null);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"idle" | "editing" | "confirming" | "verify">("idle");
  const [phoneLoading, setPhoneLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setBilling(null);
      setPlans([]);
      setMessage("");
      setPhoneStep("idle");
      setNewPhone("");
      setCode("");
      return;
    }
    setLoading(true);
    setBilling(null);
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

  const refreshBilling = () => {
    api.getBillingOverview(token)
      .then((data) => setBilling(data))
      .catch(() => {});
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Cancelar a assinatura ao fim do período atual?")) return;
    const data = await api.cancelBilling(token);
    setMessage(data.status === "canceled_at_period_end" ? "Assinatura configurada para cancelamento no fim do período." : "Assinatura atualizada.");
  };

  const handleStartEdit = () => {
    setNewPhone(user.phone_number || "");
    setMessage("");
    setPhoneStep("editing");
  };

  const handleSavePhone = () => {
    if (!newPhone.trim()) return;
    setPhoneStep("confirming");
  };

  const handleConfirmPhone = async () => {
    setPhoneLoading(true);
    setMessage("");
    try {
      const cleanedPhone = newPhone.replace(/\D/g, "");
      const data = await api.requestPhoneChange(token, cleanedPhone);
      setMessage(data.message || "Código enviado para o novo número.");
      setPhoneStep("verify");
    } catch (err: any) {
      setMessage(err.message || "Erro ao enviar código.");
      setPhoneStep("editing");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneChange = async () => {
    setPhoneLoading(true);
    try {
      const cleanedPhone = newPhone.replace(/\D/g, "");
      const data = await api.verifyPhoneChange(token, cleanedPhone, code);
      localStorage.setItem("teq_token", data.token);
      window.location.reload();
    } catch (err: any) {
      setMessage(err.message || "Código inválido.");
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-up border border-line shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-light text-content">Conta e Assinatura</h2>
              <p className="text-sm text-content-3">Perfil, plano, pagamento e segurança</p>
            </div>
            {loading && (
              <div className="w-4 h-4 rounded-full border-2 border-line border-t-content-3 animate-spin ml-1" />
            )}
          </div>
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-surface-card border border-line text-content-3 hover:text-content text-xs font-medium uppercase tracking-wider">
            Fechar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="text-sm uppercase tracking-wider text-content-3 mb-3">Perfil</h3>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="w-16 h-3 bg-line/30 rounded animate-pulse" />
                      <div className="w-40 h-4 bg-line/20 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
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
                {onReplayOnboarding && (
                  <div className="pt-2">
                    <div className="text-content-4 uppercase tracking-wider text-xs mb-1">Onboarding</div>
                    <button
                      onClick={onReplayOnboarding}
                      className="px-3 py-1.5 rounded-lg border border-line text-content-2 text-xs font-medium uppercase tracking-wider hover:bg-surface-card transition-colors"
                    >
                      Rever onboarding
                    </button>
                  </div>
                )}
                <div>
                  <div className="text-content-4 uppercase tracking-wider text-xs mb-1">WhatsApp</div>
                  {phoneStep === "editing" ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={newPhone}
                        onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                        placeholder="+55 (21) 99999-9999"
                        className="w-full bg-transparent border-b border-line-strong focus:border-content py-1.5 text-content placeholder-content-4 focus:outline-none transition-colors text-sm"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSavePhone}
                          disabled={!newPhone.trim()}
                          className="px-3 py-1.5 rounded-lg bg-content text-surface text-xs font-medium uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => { setPhoneStep("idle"); setNewPhone(""); setMessage(""); }}
                          className="px-3 py-1.5 rounded-lg border border-line text-content-3 text-xs font-medium uppercase tracking-wider hover:text-content transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : phoneStep === "verify" ? (
                    <div className="space-y-2">
                      <div className="text-content text-sm">{newPhone}</div>
                      <div className="text-xs text-content-3">Código enviado para o novo número</div>
                      <input
                        autoFocus
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Código de verificação"
                        className="w-full bg-transparent border-b border-line-strong focus:border-content py-1.5 text-content placeholder-content-4 focus:outline-none transition-colors text-sm"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleVerifyPhoneChange}
                          disabled={!code.trim() || phoneLoading}
                          className="px-3 py-1.5 rounded-lg bg-content text-surface text-xs font-medium uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
                        >
                          {phoneLoading && <span className="w-3 h-3 rounded-full border-2 border-surface/40 border-t-surface animate-spin" />}
                          Confirmar
                        </button>
                        <button
                          onClick={() => { setPhoneStep("idle"); setNewPhone(""); setCode(""); setMessage(""); }}
                          className="px-3 py-1.5 rounded-lg border border-line text-content-3 text-xs font-medium uppercase tracking-wider hover:text-content transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span className="text-content text-sm">{user.phone_number || "-"}</span>
                      <span className={`text-xs ${user.whatsapp_verified ? "text-green-500" : "text-yellow-500"}`}>
                        {user.whatsapp_verified ? "✓" : "pendente"}
                      </span>
                      <button
                        onClick={handleStartEdit}
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ml-1 text-content-4 hover:text-content text-xs underline underline-offset-2"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}
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
                    <button
                      onClick={() => setShowUpdatePayment(true)}
                      className="px-4 py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity"
                    >
                      Atualizar cartão
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

      <UpdatePaymentModal
        token={token}
        open={showUpdatePayment}
        onClose={() => setShowUpdatePayment(false)}
        onSuccess={refreshBilling}
      />

      {/* Popup de confirmação de número */}
      {phoneStep === "confirming" && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-up border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-base font-medium text-content">Confirmar novo número</h3>
            <p className="text-sm text-content-3">
              Vamos enviar um código de verificação para:
            </p>
            <div className="bg-surface-card border border-line rounded-xl px-4 py-3 text-content font-medium tracking-wide">
              {newPhone}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleConfirmPhone}
                disabled={phoneLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {phoneLoading && <span className="w-3.5 h-3.5 rounded-full border-2 border-surface/40 border-t-surface animate-spin" />}
                Sim, enviar código
              </button>
              <button
                onClick={() => setPhoneStep("editing")}
                disabled={phoneLoading}
                className="flex-1 px-4 py-3 rounded-xl border border-line text-content font-medium tracking-wider uppercase text-sm hover:bg-surface-card transition-colors"
              >
                Corrigir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
