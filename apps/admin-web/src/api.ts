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

export type OperationsSummary = {
  ticketsSold: number;
  ticketsUsed: number;
  grossCents: number;
  activeEvents: number;
};

export type SoldTicket = {
  id: string;
  attendee_name: string;
  status: "issued" | "used" | "cancelled" | "refunded";
  price_cents: number;
  created_at: string;
  email: string;
  display_name: string;
  event_title: string;
  ticket_type: string;
  qr_status?: string | null;
};

export type AdminEvent = {
  id: string;
  title: string;
  slug: string;
  venue_name: string;
  city: string;
  starts_at: string;
  capacity: number;
  vip: boolean;
  status: string;
  tickets_sold?: number;
  gross_cents?: number;
};

export type AdminTicketType = {
  id: string;
  event_id: string;
  event_title?: string;
  name: string;
  tier: string;
  price_cents: number;
  currency: string;
  quantity: number;
  per_user_limit: number;
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
  operationsSummary: () => request<OperationsSummary>("/api/v1/operations/summary"),
  soldTickets: (q = "") => request<{ tickets: SoldTicket[] }>(`/api/v1/operations/tickets?q=${encodeURIComponent(q)}`),
  updateTicketStatus: (ticketId: string, status: SoldTicket["status"]) =>
    request<{ ticket: { id: string; status: string } }>(`/api/v1/operations/tickets/${ticketId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  adminEvents: () => request<{ events: AdminEvent[] }>("/api/v1/operations/events"),
  createEvent: (input: {
    title: string;
    slug: string;
    venueName: string;
    city: string;
    startsAt: string;
    capacity: number;
    vip: boolean;
    status: string;
    description: string;
    coverUrl: string;
  }) => request<{ event: AdminEvent }>("/api/v1/operations/events", { method: "POST", body: JSON.stringify(input) }),
  ticketTypes: (eventId = "") => request<{ ticketTypes: AdminTicketType[] }>(`/api/v1/operations/ticket-types?eventId=${encodeURIComponent(eventId)}`),
  createTicketType: (input: { eventId: string; name: string; tier: string; priceCents: number; quantity: number; perUserLimit: number }) =>
    request<{ ticketType: AdminTicketType }>("/api/v1/operations/ticket-types", { method: "POST", body: JSON.stringify(input) }),
  createExport: (format: "XLSX" | "CSV" | "PDF", filters: Record<string, unknown>) =>
    request<{ job: { id: string; status: string } }>("/api/v1/exports", { method: "POST", body: JSON.stringify({ format, filters }) })
};
