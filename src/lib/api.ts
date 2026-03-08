const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = "Erro na requisição";
    try {
      const data = await res.json();
      message = data.detail || message;
    } catch {
      // Ignore
    }
    throw new Error(message);
  }

  return res.json();
}

export async function register(data: any) {
  return fetchApi("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(email: string, password: string) {
  return fetchApi("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyWhatsapp(phone: string, code: string) {
  return fetchApi("/auth/verify-whatsapp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export async function verify2fa(phone: string, code: string) {
  return fetchApi("/auth/verify-2fa", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export async function googleAuth(idToken: string) {
  return fetchApi("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}

export async function googleComplete(data: any) {
  return fetchApi("/auth/google/complete", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function resendCode(phone: string, purpose: string) {
  return fetchApi("/auth/resend-code", {
    method: "POST",
    body: JSON.stringify({ phone, purpose }),
  });
}

export async function acceptTerms(token: string) {
  return fetchApi("/auth/accept-terms", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMe(token: string) {
  return fetchApi("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getBillingOverview(token: string) {
  return fetchApi("/billing/subscription", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getBillingPlans(token: string) {
  return fetchApi("/billing/plans", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function openBillingPortal(token: string) {
  return fetchApi("/billing/portal", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function cancelBilling(token: string) {
  return fetchApi("/billing/cancel", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function setupPaymentMethod(token: string) {
  return fetchApi("/billing/setup-payment-method", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateDefaultPayment(token: string, paymentMethodId: string) {
  return fetchApi("/billing/update-default-payment", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  });
}

export async function subscribeBilling(token: string, priceId?: string) {
  return fetchApi("/billing/subscribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(priceId ? { price_id: priceId } : {}),
  });
}

export async function requestPhoneChange(token: string, newPhone: string) {
  return fetchApi("/auth/change-phone/request", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ new_phone: newPhone }),
  });
}

export async function verifyPhoneChange(token: string, newPhone: string, code: string) {
  return fetchApi("/auth/change-phone/verify", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ new_phone: newPhone, code }),
  });
}

export async function getUsageLimits(token: string) {
  return fetchApi("/api/usage/limits", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getPlanFeatures(token: string) {
  return fetchApi("/api/plan/features", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function upgradePlan(token: string, planCode: string) {
  return fetchApi("/billing/upgrade", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan_code: planCode }),
  });
}

export async function getActiveCampaign(token: string) {
  return fetchApi("/api/campaigns/active", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getAdminCampaigns(token: string) {
  return fetchApi("/admin/campaigns", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createAdminCampaign(token: string, payload: any) {
  return fetchApi("/admin/campaigns", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCampaign(token: string, campaignId: number, payload: any) {
  return fetchApi(`/admin/campaigns/${campaignId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCampaign(token: string, campaignId: number) {
  return fetchApi(`/admin/campaigns/${campaignId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getIntegrations(token: string) {
  return fetchApi("/integrations", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createIntegration(token: string, payload: any) {
  return fetchApi("/integrations", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function updateIntegration(token: string, integrationId: number, payload: any) {
  return fetchApi(`/integrations/${integrationId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function removeIntegration(token: string, integrationId: number) {
  return fetchApi(`/integrations/${integrationId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --- Tasks ---

export async function fetchWithAuth(endpoint: string, options: { token: string; method?: string; body?: any }) {
  const reqOptions: RequestInit = {
    method: options.method || "GET",
    headers: { Authorization: `Bearer ${options.token}` },
  };
  if (options.body) {
    reqOptions.body = options.body;
  }
  return fetchApi(endpoint, reqOptions);
}

export async function fetchTasks(token: string, status?: string, limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.toString();
  return fetchApi(`/api/tasks${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createTask(token: string, data: any) {
  return fetchApi("/api/tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function updateTask(token: string, id: number, data: any) {
  return fetchApi(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function deleteTask(token: string, id: number) {
  return fetchApi(`/api/tasks/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --- Reminders ---

export async function fetchReminders(token: string, status?: string, limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.toString();
  return fetchApi(`/api/reminders${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createReminder(token: string, data: any) {
  return fetchApi("/api/reminders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function cancelReminder(token: string, id: number) {
  return fetchApi(`/api/reminders/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
