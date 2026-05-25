import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Download,
  KeyRound,
  LockKeyhole,
  LogOut,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  ShieldCheck,
  TicketCheck,
  TrendingUp,
  UserPlus,
  Users
} from "lucide-react";
import { api, AdminAccount, AdminEvent, AdminSession, AdminTicketType, Expense, KPIResponse, OperationsSummary, ScanResult, SoldTicket } from "./api";
import { useFilters } from "./store";

type View = "bi" | "tickets" | "events" | "pricing" | "camera" | "admins";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

const zeroKpis: KPIResponse = {
  totalMonth: 0,
  burnRate: 0,
  budgetDeviation: 0,
  monthEndProjection: 0
};

const zeroSummary: OperationsSummary = {
  ticketsSold: 0,
  ticketsUsed: 0,
  grossCents: 0,
  activeEvents: 0
};

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof TrendingUp; tone: string }) {
  return (
    <section className="stat-card">
      <div className={`icon ${tone}`}><Icon size={19} /></div>
      <p>{label}</p>
      <strong>{value}</strong>
    </section>
  );
}

function Login({ onReady }: { onReady: (session: AdminSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      onReady(await api.login(email.trim().toLowerCase(), password));
    } catch {
      setError("No se pudo entrar. Revisa correo y contrasena de administrador.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-mark"><ShieldCheck size={30} /></div>
        <p className="eyebrow">Acceso seguro</p>
        <h1>Admin GEN</h1>
        <div className="login-form">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo admin" autoComplete="username" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contrasena" type="password" autoComplete="current-password" />
          {error ? <p className="form-error">{error}</p> : null}
          <button onClick={submit} disabled={busy || !email || password.length < 8}>
            <LockKeyhole size={18} /> {busy ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </section>
    </main>
  );
}

function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraStatus, setCameraStatus] = useState("Camara lista para leer QR.");
  const [busy, setBusy] = useState(false);

  async function validate(token: string) {
    if (!token.trim()) return;
    setBusy(true);
    try {
      setScanResult(await api.validateQr(token.trim()));
    } catch {
      setScanResult({ valid: false, reason: "No se pudo validar el QR." });
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraStatus("Camara encendida. Si tu navegador no detecta el QR automaticamente, pega el codigo abajo.");
    } catch {
      setCameraStatus("No se pudo abrir la camara. Puedes pegar el token del QR manualmente.");
    }
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return (
    <section className="panel camera-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Control de acceso</p>
          <h2>Camara QR</h2>
        </div>
        <button onClick={startCamera}><Camera size={18} /> Abrir camara</button>
      </div>
      <div className="camera-grid">
        <div className="camera-view">
          <video ref={videoRef} autoPlay muted playsInline />
          <QrCode size={74} />
        </div>
        <div className="scanner-box">
          <p>{cameraStatus}</p>
          <textarea value={manualToken} onChange={(event) => setManualToken(event.target.value)} placeholder="Pega aqui el contenido del QR GEN" />
          <button onClick={() => validate(manualToken)} disabled={busy || !manualToken.trim()}><CheckCircle2 size={18} /> Validar QR</button>
          {scanResult ? (
            <div className={`scan-result ${scanResult.valid ? "ok" : "bad"}`}>
              <strong>{scanResult.valid ? "Acceso aceptado" : "Acceso rechazado"}</strong>
              <span>{scanResult.valid ? scanResult.attendee?.name : scanResult.reason}</span>
              {scanResult.attendee ? <small>{scanResult.attendee.event} / {scanResult.attendee.tier}</small> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AdminsPanel() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setAdmins((await api.admins()).admins);
    } catch {
      setAdmins([]);
    }
  }

  async function create() {
    setMessage("");
    try {
      const result = await api.createAdmin(form);
      setAdmins((current) => [result.admin, ...current]);
      setForm({ fullName: "", email: "", password: "" });
      setMessage("Administrador creado.");
    } catch {
      setMessage("No se pudo crear. Revisa que el API admin ya este desplegado y que el correo no exista.");
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="panel admins-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Seguridad</p>
          <h2>Cuentas de administradores</h2>
        </div>
      </div>
      <div className="admin-grid">
        <div className="admin-form">
          <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Nombre" />
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Correo" />
          <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Contrasena inicial" type="password" />
          <button onClick={create} disabled={!form.fullName || !form.email || form.password.length < 8}><UserPlus size={18} /> Crear admin</button>
          {message ? <p className="sync">{message}</p> : null}
        </div>
        <div className="admin-list">
          {admins.length === 0 ? <p className="empty">Aun no hay administradores guardados en base de datos.</p> : null}
          {admins.map((admin) => (
            <article key={admin.id}>
              <strong>{admin.fullName}</strong>
              <span>{admin.email}</span>
              <small>{admin.role} / {admin.isActive ? "Activo" : "Inactivo"}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TicketsPanel() {
  const [query, setQuery] = useState("");
  const [tickets, setTickets] = useState<SoldTicket[]>([]);
  const [message, setMessage] = useState("");

  async function load(q = query) {
    try {
      setTickets((await api.soldTickets(q)).tickets);
    } catch {
      setTickets([]);
      setMessage("No se pudieron cargar boletos. Revisa que gen-admin-api este en verde.");
    }
  }

  async function changeStatus(ticketId: string, status: SoldTicket["status"]) {
    await api.updateTicketStatus(ticketId, status);
    await load();
  }

  useEffect(() => { void load(""); }, []);

  return (
    <section className="table-panel">
      <div className="table-head">
        <h2>Boletos vendidos</h2>
        <div className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, correo o ID" />
          <button onClick={() => load(query)}>Buscar</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Asistente</th>
              <th>Evento</th>
              <th>Comprador</th>
              <th>QR</th>
              <th>Estado</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>{ticket.attendee_name}<small>{ticket.id}</small></td>
                <td>{ticket.event_title}<small>{ticket.ticket_type}</small></td>
                <td>{ticket.display_name}<small>{ticket.email}</small></td>
                <td><span className="status">{ticket.qr_status ?? "N/D"}</span></td>
                <td><span className={`status ${ticket.status}`}>{ticket.status}</span></td>
                <td>{money.format(ticket.price_cents / 100)}</td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => changeStatus(ticket.id, "used")}>Usado</button>
                    <button onClick={() => changeStatus(ticket.id, "cancelled")}>Cancelar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tickets.length === 0 ? <p className="empty">{message || "No hay boletos vendidos todavia."}</p> : null}
    </section>
  );
}

function EventsPanel() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    venueName: "",
    city: "",
    startsAt: "",
    capacity: 500,
    vip: false,
    status: "draft",
    description: "",
    coverUrl: ""
  });
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setEvents((await api.adminEvents()).events);
    } catch {
      setEvents([]);
      setMessage("No se pudieron cargar eventos.");
    }
  }

  async function create() {
    setMessage("");
    try {
      const startsAt = new Date(form.startsAt).toISOString();
      const result = await api.createEvent({ ...form, startsAt });
      setEvents((current) => [result.event, ...current]);
      setForm({ ...form, title: "", slug: "", venueName: "", city: "", description: "", coverUrl: "" });
      setMessage("Evento creado.");
    } catch {
      setMessage("No se pudo crear el evento. Revisa slug, fecha y campos requeridos.");
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Operacion</p>
          <h2>Eventos</h2>
        </div>
      </div>
      <div className="admin-grid">
        <div className="admin-form">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Nombre del evento" />
          <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="slug-del-evento" />
          <input value={form.venueName} onChange={(event) => setForm({ ...form, venueName: event.target.value })} placeholder="Venue" />
          <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Ciudad" />
          <input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
          <input type="number" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} placeholder="Capacidad" />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descripcion" />
          <label className="toggle-line"><input type="checkbox" checked={form.vip} onChange={(event) => setForm({ ...form, vip: event.target.checked })} /> VIP</label>
          <button onClick={create} disabled={!form.title || !form.slug || !form.venueName || !form.city || !form.startsAt}><Plus size={18} /> Crear evento</button>
          {message ? <p className="sync">{message}</p> : null}
        </div>
        <div className="admin-list">
          {events.length === 0 ? <p className="empty">Aun no hay eventos.</p> : null}
          {events.map((event) => (
            <article key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.venue_name} / {event.city}</span>
              <small>{event.status} / {event.tickets_sold ?? 0} boletos / {money.format((event.gross_cents ?? 0) / 100)}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingPanel() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [types, setTypes] = useState<AdminTicketType[]>([]);
  const [form, setForm] = useState({ eventId: "", name: "", tier: "", priceCents: 0, quantity: 100, perUserLimit: 8 });
  const [message, setMessage] = useState("");

  async function load(eventId = form.eventId) {
    try {
      const loadedEvents = (await api.adminEvents()).events;
      setEvents(loadedEvents);
      const selected = eventId || loadedEvents[0]?.id || "";
      setForm((current) => ({ ...current, eventId: current.eventId || selected }));
      setTypes((await api.ticketTypes(selected)).ticketTypes);
    } catch {
      setMessage("No se pudieron cargar precios.");
    }
  }

  async function create() {
    setMessage("");
    try {
      const result = await api.createTicketType(form);
      setTypes((current) => [result.ticketType, ...current]);
      setForm({ ...form, name: "", tier: "", priceCents: 0, quantity: 100 });
      setMessage("Tipo de boleto creado.");
    } catch {
      setMessage("No se pudo crear el precio. Revisa que el evento exista.");
    }
  }

  useEffect(() => { void load(""); }, []);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Venta de boletos</p>
          <h2>Precios y cupos</h2>
        </div>
      </div>
      <div className="admin-grid">
        <div className="admin-form">
          <select value={form.eventId} onChange={(event) => { setForm({ ...form, eventId: event.target.value }); void load(event.target.value); }}>
            {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
          </select>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="General Wave 1" />
          <input value={form.tier} onChange={(event) => setForm({ ...form, tier: event.target.value })} placeholder="general, vip, backstage" />
          <input type="number" value={form.priceCents / 100} onChange={(event) => setForm({ ...form, priceCents: Math.round(Number(event.target.value) * 100) })} placeholder="Precio MXN" />
          <input type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} placeholder="Cupo" />
          <input type="number" value={form.perUserLimit} onChange={(event) => setForm({ ...form, perUserLimit: Number(event.target.value) })} placeholder="Limite por usuario" />
          <button onClick={create} disabled={!form.eventId || !form.name || !form.tier}><Plus size={18} /> Crear precio</button>
          {message ? <p className="sync">{message}</p> : null}
        </div>
        <div className="admin-list">
          {types.length === 0 ? <p className="empty">Aun no hay precios para este evento.</p> : null}
          {types.map((type) => (
            <article key={type.id}>
              <strong>{type.name}</strong>
              <span>{type.event_title ?? "Evento"} / {type.tier}</span>
              <small>{money.format(type.price_cents / 100)} / {type.quantity} disponibles / limite {type.per_user_limit}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function App() {
  const filters = useFilters();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [view, setView] = useState<View>("bi");
  const [kpis, setKpis] = useState(zeroKpis);
  const [summary, setSummary] = useState(zeroSummary);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.me().then(setSession).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session) return;
    let live = true;
    setBusy(true);
    Promise.all([api.kpis(), api.expenses(filters.toParams()), api.operationsSummary()])
      .then(([, , nextSummary]) => {
        if (live) {
          setKpis(zeroKpis);
          setSummary(nextSummary);
          setExpenses([]);
        }
      })
      .catch(() => {
        if (live) {
          setKpis(zeroKpis);
          setSummary(zeroSummary);
          setExpenses([]);
        }
      })
      .finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [session, filters.from, filters.to, filters.departmentId, filters.vendorId, filters.paymentStatus, filters.minAmount, filters.maxAmount]);

  const rows = useMemo(() => expenses.map((expense) => ({ ...expense, total: Number(expense.amount) })), [expenses]);

  if (!session) return <Login onReady={setSession} />;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><ShieldCheck size={24} /> Admin GEN</div>
        <nav>
          <button className={view === "bi" ? "active" : ""} onClick={() => setView("bi")}><TrendingUp size={18} /> BI</button>
          <button className={view === "tickets" ? "active" : ""} onClick={() => setView("tickets")}><TicketCheck size={18} /> Boletos</button>
          <button className={view === "events" ? "active" : ""} onClick={() => setView("events")}><ReceiptText size={18} /> Eventos</button>
          <button className={view === "pricing" ? "active" : ""} onClick={() => setView("pricing")}><Plus size={18} /> Precios</button>
          <button className={view === "camera" ? "active" : ""} onClick={() => setView("camera")}><Camera size={18} /> Camara</button>
          <button className={view === "admins" ? "active" : ""} onClick={() => setView("admins")}><Users size={18} /> Administradores</button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Panel restringido</p>
            <h1>{view === "bi" ? "Control operativo" : view === "tickets" ? "Boletos vendidos" : view === "events" ? "Eventos" : view === "pricing" ? "Precios y cupos" : view === "camera" ? "Lectura de boletos QR" : "Seguridad de acceso"}</h1>
          </div>
          <div className="actions">
            <button title="Exportar PDF" onClick={() => api.createExport("PDF", Object.fromEntries(filters.toParams()))}><Download size={18} /> PDF</button>
            <button title="Salir" onClick={() => api.logout().finally(() => setSession(null))}><LogOut size={18} /></button>
          </div>
        </header>

        {view === "bi" ? (
          <>
            <section className="stats-grid">
              <StatCard label="Ventas" value={money.format(summary.grossCents / 100)} icon={ReceiptText} tone="blue" />
              <StatCard label="Boletos vendidos" value={`${summary.ticketsSold}`} icon={TicketCheck} tone="green" />
              <StatCard label="Accesos usados" value={`${summary.ticketsUsed}`} icon={ShieldCheck} tone="amber" />
              <StatCard label="Eventos activos" value={`${summary.activeEvents}`} icon={KeyRound} tone="red" />
            </section>

            <section className="table-panel">
              <div className="table-head">
                <h2>Movimientos recientes</h2>
                <button><CheckCircle2 size={17} /> Revisar</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Categoria</th>
                      <th>Departamento</th>
                      <th>Estado</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.vendor?.legalName ?? "N/D"}<small>{expense.vendor?.taxId}</small></td>
                        <td>{expense.category?.parent?.name ?? "General"} / {expense.category?.name ?? "N/D"}</td>
                        <td>{expense.department?.name ?? "N/D"}</td>
                        <td><span className={`status ${expense.paymentStatus.toLowerCase()}`}>{expense.paymentStatus}</span></td>
                        <td>{money.format(expense.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length === 0 ? <p className="empty">Todo esta en cero. Aun no hay ventas registradas para este lanzamiento.</p> : null}
              {busy && <p className="sync">Sincronizando...</p>}
            </section>
          </>
        ) : null}

        {view === "tickets" ? <TicketsPanel /> : null}
        {view === "events" ? <EventsPanel /> : null}
        {view === "pricing" ? <PricingPanel /> : null}
        {view === "camera" ? <CameraPanel /> : null}
        {view === "admins" ? <AdminsPanel /> : null}
      </section>
    </main>
  );
}
