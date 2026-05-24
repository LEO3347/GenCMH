import Constants from "expo-constants";
import type { LocalOrder, OfflineManifest, Reward, VenueTable } from "./types";

const primaryApiUrl = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000";
const localApiUrl = Constants.expoConfig?.extra?.localApiUrl ?? primaryApiUrl;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
  }
}

function apiTargets(preferLocal: boolean) {
  const hostUri = Constants.expoConfig?.hostUri;
  const expoHost = hostUri?.split(":")[0];
  const inferredLanApi = expoHost ? `http://${expoHost}:4000` : undefined;
  const targets = preferLocal
    ? [inferredLanApi, localApiUrl, primaryApiUrl]
    : [inferredLanApi, primaryApiUrl, localApiUrl];
  return Array.from(new Set(targets.filter(Boolean))) as string[];
}

async function fetchWithTimeout(url: string, options: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, token?: string, options: RequestInit = {}, preferLocal = true): Promise<T> {
  const targets = apiTargets(preferLocal);
  let lastError: unknown;

  for (const base of targets) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`, {
        ...options,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(options.headers ?? {})
        }
      });
      if (!res.ok) {
        const body = await res.text();
        let code: string | undefined;
        try {
          const parsed = JSON.parse(body) as { error?: string };
          code = parsed.error;
        } catch {
          code = body || undefined;
        }
        throw new ApiError(code ?? "request_failed", res.status, code);
      }
      return (await res.json()) as T;
    } catch (error) {
      if (error instanceof ApiError && error.status && error.status < 500) throw error;
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("network_unavailable");
}

export async function login(email: string, password: string) {
  return request<{ token: string }>("/api/auth/login", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password })
  }, false);
}

export async function register(email: string, password: string, name: string) {
  return request<{ token: string }>("/api/auth/register", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password, name })
  }, false);
}

export async function getOfflineManifest(token: string) {
  return request<OfflineManifest>("/api/commerce/offline-manifest", token);
}

export async function syncOrders(token: string, deviceId: string, orders: LocalOrder[]) {
  return request<{
    syncedAt: string;
    accepted: Array<{ order: any; pickupQr: { token: string; image: string } }>;
    rejected: Array<{ clientOrderId: string; reason: string }>;
  }>("/api/commerce/sync", token, {
    method: "POST",
    body: JSON.stringify({
      deviceId,
      orders: orders
        .filter((order) => order.status === "queued_offline")
        .map((order) => ({
          eventId: order.eventId,
          clientOrderId: order.clientOrderId,
          deviceId: order.deviceId,
          offlineCreatedAt: order.offlineCreatedAt,
          items: order.items
        }))
    })
  });
}

export async function getTableMap(token: string, eventId: string) {
  return request<{ tables: VenueTable[]; zones: any[] }>(`/api/tables/events/${eventId}/map`, token);
}

export async function holdTable(token: string, tableId: string) {
  return request<{ reservation: any; table: VenueTable }>(`/api/tables/${tableId}/hold`, token, {
    method: "POST",
    body: JSON.stringify({ splitPaymentEnabled: true, invitedUsers: [] })
  });
}

export async function getRewards(token: string) {
  return request<{ rewards: Reward[] }>("/api/rewards/mine", token);
}
