"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Gift, Loader2, LogOut, QrCode, RefreshCw, ShoppingBag, Sparkles, Ticket, WalletCards } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://gen-api-2af9.onrender.com";

type Tab = "events" | "tickets" | "shop" | "tables" | "orders" | "rewards";

interface GenEvent {
  id: string;
  title: string;
  slug: string;
  venue_name: string;
  city: string;
  starts_at: string;
  cover_url?: string;
  vip: boolean;
  trending_score: number;
}

interface Product {
  id: string;
  event_id: string;
  name: string;
  description: string;
  category: string;
  image_url?: string;
  price_cents: number;
  currency: string;
  stock: number;
  pickup_zone: string;
}

interface TicketType {
  id: string;
  event_id: string;
  name: string;
  tier: string;
  price_cents: number;
  quantity: number;
}

interface IssuedTicket {
  ticket: {
    id: string;
    attendee_name: string;
    status: string;
    price_cents: number;
  };
  qr: {
    token: string;
    image: string;
  };
}

interface LocalOrder {
  clientOrderId: string;
  eventId: string;
  deviceId: string;
  offlineCreatedAt: string;
  items: Array<{ productId: string; quantity: number }>;
  status: "queued_offline" | "synced" | "rejected";
  totalCents: number;
  pickupCode: string;
  pickupQrImage?: string;
  rejectionReason?: string;
}

interface VenueTable {
  id: string;
  event_id: string;
  label: string;
  min_spend_cents: number;
  seats: number;
  status: "available" | "held" | "reserved" | "occupied" | "closed";
}

interface Reward {
  id: string;
  reward_type: string;
  title: string;
  description: string;
  points: number;
  claimed_at?: string;
}

interface OfflineManifest {
  generatedAt: string;
  events: GenEvent[];
  products: Product[];
  policy: {
    chatEnabledForUsers: false;
    localNetworkMode: boolean;
    syncTarget: string;
  };
}

const emptyManifest: OfflineManifest = {
  generatedAt: new Date().toISOString(),
  events: [],
  products: [],
  policy: {
    chatEnabledForUsers: false,
    localNetworkMode: true,
    syncTarget: "/api/commerce/sync"
  }
};

function money(cents?: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format((cents ?? 0) / 100);
}

async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });
  if (!res.ok) {
    const raw = await res.text();
    let code = raw;
    if (raw.trim().startsWith("{")) {
      code = (JSON.parse(raw) as { error?: string }).error ?? raw;
    }
    throw new Error(code || "request_failed");
  }
  return res.json() as Promise<T>;
}

function deviceId() {
  const key = "gen.web.device";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = `web-${crypto.randomUUID()}`;
  localStorage.setItem(key, next);
  return next;
}

function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem("gen.web.orders") ?? "[]") as LocalOrder[];
  } catch {
    return [];
  }
}

function saveOrders(orders: LocalOrder[]) {
  localStorage.setItem("gen.web.orders", JSON.stringify(orders));
}

export default function Home() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const [tab, setTab] = useState<Tab>("events");
  const [manifest, setManifest] = useState<OfflineManifest>(emptyManifest);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicket | null>(null);
  const [ticketMessage, setTicketMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  const selectedEvent = manifest.events.find((event) => event.id === selectedEventId) ?? manifest.events[0];
  const products = useMemo(() => manifest.products.filter((product) => product.event_id === selectedEvent?.id), [manifest.products, selectedEvent?.id]);
  const total = products.reduce((sum, product) => sum + (cart[product.id] ?? 0) * product.price_cents, 0);
  const ticketAiTip = useMemo(() => {
    if (!selectedEvent) return "Selecciona un evento para recibir una recomendacion.";
    if (selectedEvent.vip) return "IA recomienda comprar VIP si quieres mesa, acceso rapido y mejor experiencia en puerta.";
    if (selectedEvent.trending_score >= 80) return "IA detecta alta demanda: compra tu boleto pronto antes de que suba la disponibilidad.";
    return "IA recomienda acceso general y pick-up anticipado para entrar sin filas.";
  }, [selectedEvent]);

  useEffect(() => {
    localStorage.removeItem("gen.web.token");
    setToken("");
    setOrders(loadOrders());
    setLoading(false);
  }, []);

  async function refreshManifest(activeToken = token) {
    const fresh = await api<OfflineManifest>("/api/commerce/offline-manifest", {}, activeToken);
    setManifest(fresh);
    setSelectedEventId((current) => current || fresh.events[0]?.id || "");
  }

  async function submitAuth() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail.includes("@")) {
      setMessage("Escribe un correo valido.");
      return;
    }
    if (password.length < 8) {
      setMessage("El password debe tener minimo 8 caracteres.");
      return;
    }
    if (mode === "register" && cleanName.length < 2) {
      setMessage("Escribe tu nombre.");
      return;
    }

    setAuthLoading(true);
    setMessage("");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email: cleanEmail, password } : { email: cleanEmail, password, name: cleanName };
      const result = await api<{ token: string }>(path, { method: "POST", body: JSON.stringify(body) });
      setToken(result.token);
      await refreshManifest(result.token);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "email_already_registered") {
        setMessage("Ese correo ya existe. Cambia a Ya tengo cuenta para entrar.");
      } else if (code === "invalid_credentials") {
        setMessage("Correo o password incorrectos.");
      } else if (code === "validation_error") {
        setMessage("Revisa el correo, nombre y password. El password necesita minimo 8 caracteres.");
      } else {
        setMessage("No se pudo conectar con GEN. Intenta otra vez.");
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    localStorage.removeItem("gen.web.token");
    setToken("");
    setManifest(emptyManifest);
    setTab("events");
    setMessage("");
  }

  async function loadTables() {
    if (!selectedEvent) return;
    const result = await api<{ tables: VenueTable[]; zones: unknown[] }>(`/api/tables/events/${selectedEvent.id}/map`, {}, token);
    setTables(result.tables);
  }

  async function loadTickets() {
    if (!selectedEvent) return;
    const result = await api<{ ticketTypes: TicketType[] }>(`/api/events/${selectedEvent.id}`);
    setTicketTypes(result.ticketTypes);
    setTicketTypeId((current) => current || result.ticketTypes[0]?.id || "");
  }

  async function buyTicket() {
    if (!selectedEvent || !ticketTypeId) return;
    const cleanAttendee = attendeeName.trim();
    if (cleanAttendee.length < 2) {
      setTicketMessage("Escribe el nombre del asistente.");
      return;
    }

    setTicketMessage("");
    try {
      const result = await api<IssuedTicket>("/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedEvent.id,
          ticketTypeId,
          attendeeName: cleanAttendee
        })
      }, token);
      setIssuedTicket(result);
      setTicketMessage("Boleto generado. Guarda el QR para el acceso.");
    } catch {
      setTicketMessage("No se pudo comprar el boleto. Intenta otra vez.");
    }
  }

  async function loadRewards() {
    const result = await api<{ rewards: Reward[] }>("/api/rewards/mine", {}, token);
    setRewards(result.rewards);
  }

  async function reserveTable(tableId: string) {
    await api<{ reservation: unknown; table: VenueTable }>(`/api/tables/${tableId}/hold`, {
      method: "POST",
      body: JSON.stringify({ splitPaymentEnabled: true, invitedUsers: [] })
    }, token);
    await loadTables();
  }

  function changeQty(product: Product, delta: number) {
    setCart((current) => ({
      ...current,
      [product.id]: Math.max(0, Math.min(product.stock, (current[product.id] ?? 0) + delta))
    }));
  }

  function placeOfflineOrder() {
    if (!selectedEvent || total === 0) return;
    const order: LocalOrder = {
      clientOrderId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      eventId: selectedEvent.id,
      deviceId: deviceId(),
      offlineCreatedAt: new Date().toISOString(),
      items: Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId, quantity })),
      status: "queued_offline",
      totalCents: total,
      pickupCode: `LOCAL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    };
    const updated = [order, ...orders];
    saveOrders(updated);
    setOrders(updated);
    setCart({});
    setTab("orders");
  }

  async function syncQueuedOrders() {
    setSyncing(true);
    try {
      const current = loadOrders();
      const response = await api<{
        syncedAt: string;
        accepted: Array<{ order: { client_order_id: string; pickup_code?: string }; pickupQr: { image: string } }>;
        rejected: Array<{ clientOrderId: string; reason: string }>;
      }>("/api/commerce/sync", {
        method: "POST",
        body: JSON.stringify({
          deviceId: deviceId(),
          orders: current
            .filter((order) => order.status === "queued_offline")
            .map((order) => ({
              eventId: order.eventId,
              clientOrderId: order.clientOrderId,
              deviceId: order.deviceId,
              offlineCreatedAt: order.offlineCreatedAt,
              items: order.items
            }))
        })
      }, token);

      const rejected = new Map(response.rejected.map((item) => [item.clientOrderId, item.reason]));
      const updated = current.map((order) => {
        const accepted = response.accepted.find((item) => item.order.client_order_id === order.clientOrderId);
        if (accepted) {
          return { ...order, status: "synced" as const, pickupCode: accepted.order.pickup_code ?? order.pickupCode, pickupQrImage: accepted.pickupQr.image };
        }
        if (rejected.has(order.clientOrderId)) {
          return { ...order, status: "rejected" as const, rejectionReason: rejected.get(order.clientOrderId) };
        }
        return order;
      });
      saveOrders(updated);
      setOrders(updated);
      await refreshManifest();
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#03030a] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#00d4ff]" size={34} />
          <p className="mt-4 text-sm font-black text-white/70">Preparando modo offline...</p>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#03030a] p-5 text-white">
        <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-6">
          <div className="mb-6 grid h-16 w-16 place-items-center rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/10">
            <Sparkles className="text-[#00d4ff]" size={30} />
          </div>
          <h1 className="text-6xl font-black">GEN</h1>
          <p className="mt-2 text-white/66">Tu pase, tus eventos y tus compras express incluso cuando la fiesta no tiene internet.</p>
          <div className="mt-7 space-y-3">
            {mode === "register" ? <input className="w-full rounded-md border border-white/10 bg-black/40 p-4" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" /> : null}
            <input className="w-full rounded-md border border-white/10 bg-black/40 p-4" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
            <input className="w-full rounded-md border border-white/10 bg-black/40 p-4" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
            {message ? <p className="rounded-md border border-[#ff2bd6]/25 bg-[#ff2bd6]/10 p-3 text-sm text-[#ff8bcf]">{message}</p> : null}
            <button onClick={submitAuth} disabled={authLoading} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#00d4ff] p-4 font-black text-black">
              {authLoading ? <Loader2 className="animate-spin" size={18} /> : null}
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="w-full rounded-md border border-white/10 p-4 text-sm font-bold text-[#ff2bd6]">
              {mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#03030a] p-4 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-32px)] max-w-6xl flex-col">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.26em] text-[#00d4ff]">GEN USER</p>
            <h1 className="max-w-2xl text-3xl font-black">{selectedEvent?.title ?? "Eventos"}</h1>
          </div>
          <button onClick={logout} className="grid h-11 w-11 place-items-center rounded-md bg-white/10" aria-label="Salir">
            <LogOut size={20} />
          </button>
        </header>

        <nav className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <TabButton active={tab === "events"} label="Eventos" icon={<Ticket size={17} />} onClick={() => setTab("events")} />
          <TabButton active={tab === "tickets"} label="Boletos" icon={<WalletCards size={17} />} onClick={() => { setTab("tickets"); loadTickets(); }} />
          <TabButton active={tab === "shop"} label="Pick-up" icon={<ShoppingBag size={17} />} onClick={() => setTab("shop")} />
          <TabButton active={tab === "tables"} label="Mesas" icon={<Crown size={17} />} onClick={() => { setTab("tables"); loadTables(); }} />
          <TabButton active={tab === "orders"} label="Compras" icon={<RefreshCw size={17} />} onClick={() => setTab("orders")} />
          <TabButton active={tab === "rewards"} label="VIP" icon={<Gift size={17} />} onClick={() => { setTab("rewards"); loadRewards(); }} />
        </nav>

        {tab === "events" ? (
          <section className="space-y-3">
            <div className="rounded-md bg-[#c7ff3d]/10 p-3 text-sm font-black text-[#c7ff3d]">Modo offline listo - Chat no disponible para usuarios</div>
            {manifest.events.map((event) => (
              <button key={event.id} onClick={() => setSelectedEventId(event.id)} className={`flex w-full overflow-hidden rounded-lg border bg-white/[0.06] text-left ${event.id === selectedEvent?.id ? "border-[#00d4ff]/70" : "border-white/10"}`}>
                {event.cover_url ? <img src={event.cover_url} alt={event.title} className="h-36 w-32 object-cover sm:w-44" /> : null}
                <div className="flex flex-1 flex-col justify-center p-4">
                  <h2 className="text-lg font-black">{event.title}</h2>
                  <p className="mt-1 text-sm text-white/58">{event.venue_name} - {event.city}</p>
                  <p className="mt-3 text-xs font-black tracking-[0.22em] text-[#00d4ff]">{event.vip ? "VIP EXPERIENCE" : "GENERAL ACCESS"}</p>
                </div>
              </button>
            ))}
          </section>
        ) : null}

        {tab === "tickets" ? (
          <section className="grid gap-3 md:grid-cols-[1fr_.9fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
              <h2 className="text-xl font-black">Venta de boletos</h2>
              <p className="mt-1 text-white/58">{selectedEvent?.title ?? "Selecciona un evento"}</p>
              <div className="mt-4 rounded-md border border-[#c7ff3d]/30 bg-[#c7ff3d]/10 p-3 text-sm font-bold text-[#c7ff3d]">
                Asistente IA: {ticketAiTip}
              </div>
              <input className="mt-4 w-full rounded-md border border-white/10 bg-black/40 p-4" value={attendeeName} onChange={(event) => setAttendeeName(event.target.value)} placeholder="Nombre del asistente" />
              <div className="mt-4 space-y-3">
                {ticketTypes.map((ticket) => (
                  <button key={ticket.id} onClick={() => setTicketTypeId(ticket.id)} className={`flex w-full items-center justify-between rounded-md border p-4 text-left ${ticket.id === ticketTypeId ? "border-[#00d4ff]/70 bg-[#00d4ff]/10" : "border-white/10 bg-black/20"}`}>
                    <span>
                      <span className="block font-black">{ticket.name}</span>
                      <span className="text-sm text-white/55">{ticket.tier}</span>
                    </span>
                    <span className="font-black text-[#c7ff3d]">{money(ticket.price_cents)}</span>
                  </button>
                ))}
              </div>
              <button onClick={buyTicket} disabled={!ticketTypeId} className="mt-4 w-full rounded-md bg-white p-4 font-black text-black disabled:opacity-40">
                Comprar boleto
              </button>
              {ticketMessage ? <p className="mt-3 rounded-md border border-white/10 bg-black/35 p-3 text-sm text-white/70">{ticketMessage}</p> : null}
            </div>
            <div className="grid place-items-center rounded-lg border border-white/10 bg-white/[0.06] p-6 text-center">
              {issuedTicket ? (
                <div>
                  <img src={issuedTicket.qr.image} alt="QR del boleto GEN" className="mx-auto h-64 w-64 rounded-md bg-white p-3" />
                  <h2 className="mt-4 text-xl font-black">{issuedTicket.ticket.attendee_name}</h2>
                  <p className="mt-1 text-white/58">Estado: {issuedTicket.ticket.status}</p>
                </div>
              ) : (
                <div>
                  <QrCode className="mx-auto text-[#00d4ff]" size={88} />
                  <h2 className="mt-5 text-2xl font-black">QR de acceso</h2>
                  <p className="mt-2 text-white/60">Aqui aparecera el QR despues de comprar.</p>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {tab === "shop" ? (
          <section className="flex flex-1 flex-col">
            <div className="grid flex-1 gap-3 md:grid-cols-2">
              {products.map((product) => (
                <article key={product.id} className="flex overflow-hidden rounded-lg border border-white/10 bg-white/[0.06]">
                  {product.image_url ? <img src={product.image_url} alt={product.name} className="h-40 w-28 object-cover" /> : null}
                  <div className="flex-1 p-4">
                    <h2 className="font-black">{product.name}</h2>
                    <p className="mt-1 text-sm leading-6 text-white/58">{product.description}</p>
                    <p className="mt-2 text-lg font-black text-[#c7ff3d]">{money(product.price_cents, product.currency)}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <button className="grid h-9 w-9 place-items-center rounded-md bg-white/15 text-xl font-black" onClick={() => changeQty(product, -1)}>-</button>
                      <span className="min-w-8 text-center font-black">{cart[product.id] ?? 0}</span>
                      <button className="grid h-9 w-9 place-items-center rounded-md bg-white/15 text-xl font-black" onClick={() => changeQty(product, 1)}>+</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <button onClick={placeOfflineOrder} disabled={total === 0} className="mt-4 rounded-md bg-[#ff2bd6] p-4 font-black disabled:opacity-40">
              Ordenar sin fila - {money(total)}
            </button>
          </section>
        ) : null}

        {tab === "tables" ? (
          <section className="grid gap-3 md:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
              <h2 className="text-xl font-black">Mapa VIP interactivo</h2>
              <p className="mt-1 text-white/58">Elige mesa, aparta y divide pago con amigos.</p>
              <div className="mt-5 space-y-3">
                {tables.map((table) => (
                  <button key={table.id} onClick={() => table.status === "available" ? reserveTable(table.id) : undefined} className={`w-full rounded-md border p-4 text-left ${table.status === "available" ? "border-[#00d4ff]/40 bg-[#00d4ff]/10" : "border-[#ff4d6d]/40 bg-[#ff4d6d]/10"}`}>
                    <p className="font-black">{table.label}</p>
                    <p className="mt-1 font-black text-[#c7ff3d]">{money(table.min_spend_cents)}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid place-items-center rounded-lg border border-white/10 bg-white/[0.06] p-7 text-center">
              <QrCode className="text-[#00d4ff]" size={88} />
              <h2 className="mt-5 text-2xl font-black">QR unico GEN</h2>
              <p className="mt-2 text-white/60">Tu pase, compras y reservas viven en un token cifrado.</p>
            </div>
          </section>
        ) : null}

        {tab === "orders" ? (
          <section className="flex flex-1 flex-col">
            <button onClick={syncQueuedOrders} disabled={syncing} className="mb-4 rounded-md bg-[#00d4ff] p-4 font-black text-black">
              {syncing ? "Sincronizando..." : "Sincronizar por red local"}
            </button>
            <div className="space-y-3">
              {orders.length === 0 ? <p className="rounded-lg border border-white/10 bg-white/[0.06] p-5 text-center text-white/60">Todavia no tienes compras.</p> : null}
              {orders.map((order) => (
                <article key={order.clientOrderId} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                  <h2 className="font-black">{order.pickupCode}</h2>
                  <p className="mt-1 text-white/58">{order.status === "queued_offline" ? "Pendiente offline" : order.status === "synced" ? "Centralizado en cuenta principal" : `Rechazado: ${order.rejectionReason}`}</p>
                  <p className="mt-2 text-lg font-black text-[#c7ff3d]">{money(order.totalCents)}</p>
                  {order.pickupQrImage ? <img src={order.pickupQrImage} alt="QR de pick-up" className="mt-4 h-40 w-40 rounded-md bg-white p-2" /> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "rewards" ? (
          <section className="space-y-3">
            {rewards.length === 0 ? <p className="rounded-lg border border-white/10 bg-white/[0.06] p-5 text-center text-white/60">Tus puntos GEN, cashback, insignias y misiones apareceran aqui.</p> : null}
            {rewards.map((reward) => (
              <article key={reward.id} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                <h2 className="font-black">{reward.title}</h2>
                <p className="mt-1 text-white/58">{reward.description}</p>
                <p className="mt-2 text-lg font-black text-[#c7ff3d]">{reward.points} puntos GEN</p>
              </article>
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}

function TabButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex min-h-12 flex-col items-center justify-center rounded-md text-xs font-black ${active ? "bg-[#00d4ff] text-black" : "bg-white/10 text-white"}`}>
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );
}
