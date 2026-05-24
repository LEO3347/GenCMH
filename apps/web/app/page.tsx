"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, LogOut, QrCode, Ticket, UserRound } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://gen-api-2af9.onrender.com";

interface EventCard {
  id: string;
  title: string;
  city: string;
  venue_name: string;
  starts_at: string;
  cover_url?: string;
  min_price?: number;
  vip: boolean;
  trending_score: number;
}

interface TicketType {
  id: string;
  name: string;
  tier: string;
  price_cents: number;
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

function money(cents?: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format((cents ?? 0) / 100);
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
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export default function Home() {
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("fan@gen.mx");
  const [password, setPassword] = useState("GenDemo123!");
  const [name, setName] = useState("Fan GEN");
  const [events, setEvents] = useState<EventCard[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventCard | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [attendeeName, setAttendeeName] = useState("Fan GEN");
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedTicketType = useMemo(() => ticketTypes.find((item) => item.id === ticketTypeId), [ticketTypeId, ticketTypes]);

  useEffect(() => {
    setToken(localStorage.getItem("gen.web.token") ?? "");
    api<{ events: EventCard[] }>("/api/events")
      .then((result) => {
        setEvents(result.events);
        setSelectedEvent(result.events[0] ?? null);
      })
      .catch(() => setMessage("No se pudieron cargar eventos desde la API."));
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    api<{ ticketTypes: TicketType[] }>(`/api/events/${selectedEvent.id}`)
      .then((result) => {
        setTicketTypes(result.ticketTypes);
        setTicketTypeId(result.ticketTypes[0]?.id ?? "");
      })
      .catch(() => setMessage("No se pudieron cargar boletos para este evento."));
  }, [selectedEvent]);

  async function submitAuth() {
    setLoading(true);
    setMessage("");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const result = await api<{ token: string }>(path, { method: "POST", body: JSON.stringify(body) });
      localStorage.setItem("gen.web.token", result.token);
      setToken(result.token);
      setMessage("Listo. Ya entraste a GEN.");
    } catch {
      setMessage("No se pudo entrar. Revisa email/password o crea una cuenta nueva.");
    } finally {
      setLoading(false);
    }
  }

  async function buyTicket() {
    if (!token || !selectedEvent || !ticketTypeId) {
      setMessage("Primero entra y selecciona un boleto.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await api<IssuedTicket>(
        "/api/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            eventId: selectedEvent.id,
            ticketTypeId,
            attendeeName
          })
        },
        token
      );
      setIssuedTicket(result);
      setMessage("Boleto generado. Guarda el QR para el acceso.");
    } catch {
      setMessage("No se pudo generar el boleto. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("gen.web.token");
    setToken("");
    setIssuedTicket(null);
  }

  return (
    <main className="min-h-screen bg-[#03030a] text-white">
      <header className="border-b border-white/10 bg-black/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-[#00d4ff] font-black text-black">G</div>
            <div>
              <p className="text-lg font-black tracking-[0.22em]">GEN</p>
              <p className="text-xs text-white/55">Boletos, QR y acceso online</p>
            </div>
          </div>
          {token ? (
            <button onClick={logout} className="flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm font-bold">
              <LogOut size={16} /> Salir
            </button>
          ) : null}
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
          <div className="mb-5 flex items-center gap-3">
            <UserRound className="text-[#00d4ff]" />
            <div>
              <h1 className="text-2xl font-black">{token ? "Cuenta activa" : mode === "login" ? "Entrar" : "Crear cuenta"}</h1>
              <p className="text-sm text-white/58">Usa GEN desde cualquier navegador.</p>
            </div>
          </div>

          {!token ? (
            <div className="space-y-3">
              {mode === "register" ? (
                <input className="w-full rounded-md border border-white/10 bg-black/40 p-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
              ) : null}
              <input className="w-full rounded-md border border-white/10 bg-black/40 p-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              <input className="w-full rounded-md border border-white/10 bg-black/40 p-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
              <button onClick={submitAuth} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#00d4ff] p-3 font-black text-black">
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                {mode === "login" ? "Entrar" : "Crear cuenta"}
              </button>
              <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="w-full rounded-md border border-white/10 p-3 text-sm font-bold text-[#ff2bd6]">
                {mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
              </button>
            </div>
          ) : (
            <div className="rounded-md border border-[#c7ff3d]/30 bg-[#c7ff3d]/10 p-4 text-sm text-white/78">
              <CheckCircle2 className="mb-2 text-[#c7ff3d]" />
              Ya puedes generar boletos QR desde la web pública.
            </div>
          )}

          {message ? <p className="mt-4 rounded-md border border-white/10 bg-black/35 p-3 text-sm text-white/70">{message}</p> : null}
        </aside>

        <section className="space-y-5">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
            <div className="mb-4 flex items-center gap-3">
              <Ticket className="text-[#00d4ff]" />
              <div>
                <h2 className="text-2xl font-black">Eventos disponibles</h2>
                <p className="text-sm text-white/58">Datos cargados desde Render/Postgres.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => {
                    setSelectedEvent(event);
                    setIssuedTicket(null);
                  }}
                  className={`overflow-hidden rounded-lg border text-left transition ${selectedEvent?.id === event.id ? "border-[#00d4ff]" : "border-white/10"}`}
                >
                  <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${event.cover_url ?? ""})` }} />
                  <div className="p-4">
                    <p className="text-lg font-black">{event.title}</p>
                    <p className="text-sm text-white/58">{event.city} · {event.venue_name}</p>
                    <p className="mt-2 text-sm font-bold text-[#00d4ff]">Desde {money(event.min_price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedEvent ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                <h3 className="text-xl font-black">Comprar boleto demo</h3>
                <p className="mt-1 text-sm text-white/58">{selectedEvent.title}</p>
                <select className="mt-4 w-full rounded-md border border-white/10 bg-black p-3" value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)}>
                  {ticketTypes.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>{ticket.name} · {money(ticket.price_cents)}</option>
                  ))}
                </select>
                <input className="mt-3 w-full rounded-md border border-white/10 bg-black/40 p-3" value={attendeeName} onChange={(e) => setAttendeeName(e.target.value)} placeholder="Nombre del asistente" />
                <button onClick={buyTicket} disabled={loading || !token} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-white p-3 font-black text-black disabled:opacity-40">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Generar QR {selectedTicketType ? `· ${money(selectedTicketType.price_cents)}` : ""}
                </button>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                <h3 className="text-xl font-black">Tu QR</h3>
                {issuedTicket ? (
                  <div className="mt-4">
                    <img src={issuedTicket.qr.image} alt="QR del boleto GEN" className="mx-auto h-64 w-64 rounded-md bg-white p-3" />
                    <p className="mt-4 text-center font-black">{issuedTicket.ticket.attendee_name}</p>
                    <p className="text-center text-sm text-white/58">Estado: {issuedTicket.ticket.status}</p>
                  </div>
                ) : (
                  <div className="mt-4 grid h-72 place-items-center rounded-md border border-dashed border-white/15 text-center text-white/55">
                    <div>
                      <QrCode className="mx-auto mb-3 text-[#00d4ff]" size={54} />
                      Genera un boleto para ver el QR.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
