const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type KPIResponse = {
  totalMonth: number;
  burnRate: number;
  budgetDeviation: number;
  monthEndProjection: number;
};

export type AdminSession = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
};

export type AdminAccount = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
};

export type ScanResult = {
  valid: boolean;
  reason?: string;
  attendee?: {
    name: string;
    buyer: string;
    event: string;
    tier: string;
  } | null;
};

export type Expense = {
  id: string;
  amount: string;
  currency: string;
  issuedAt: string;
  dueAt: string;
  paymentStatus: "PENDING" | "PAID" | "SCHEDULED" | "OVERDUE" | "IN_REVIEW";
  vendor?: { legalName: string; taxId: string };
  department?: { name: string };
  category?: { name: string; parent?: { name: string } | null };
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<AdminSession>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<AdminSession>("/api/v1/auth/me"),
  logout: () => fetch(`${API_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" }),
  kpis: () => request<KPIResponse>("/api/v1/analytics/kpis"),
  expenses: (params: URLSearchParams) => request<{ expenses: Expense[] }>(`/api/v1/expenses?${params}`),
  spendByDepartment: () => request<{ series: Array<{ month: string; department: string; total: number }> }>("/api/v1/analytics/spend-by-department"),
  concentration: () => request<{ items: Array<{ vendor: string; total: number }> }>("/api/v1/analytics/spend-concentration"),
  validateQr: (token: string) =>
    request<ScanResult>("/api/v1/scans/validate", { method: "POST", body: JSON.stringify({ token, deviceId: "admin-camera-web" }) }),
  admins: () => request<{ admins: AdminAccount[] }>("/api/v1/admins"),
  createAdmin: (input: { fullName: string; email: string; password: string }) =>
    request<{ admin: AdminAccount }>("/api/v1/admins", { method: "POST", body: JSON.stringify(input) }),
  createExport: (format: "XLSX" | "CSV" | "PDF", filters: Record<string, unknown>) =>
    request<{ job: { id: string; status: string } }>("/api/v1/exports", { method: "POST", body: JSON.stringify({ format, filters }) })
};
