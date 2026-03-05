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

export async function getMe(token: string) {
  return fetchApi("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
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

export async function fetchTasks(token: string, status?: string) {
  const url = status ? `/api/tasks?status=${status}` : "/api/tasks";
  return fetchApi(url, {
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

export async function fetchReminders(token: string, status?: string) {
  const url = status ? `/api/reminders?status=${status}` : "/api/reminders";
  return fetchApi(url, {
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
