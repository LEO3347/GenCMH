import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Download,
  KeyRound,
  LockKeyhole,
  LogOut,
  QrCode,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users
} from "lucide-react";
import { api, AdminAccount, AdminSession, Expense, KPIResponse, ScanResult } from "./api";
import { useFilters } from "./store";

type View = "bi" | "camera" | "admins";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

const zeroKpis: KPIResponse = {
  totalMonth: 0,
  burnRate: 0,
  budgetDeviation: 0,
  monthEndProjection: 0
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

export function App() {
  const filters = useFilters();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [view, setView] = useState<View>("bi");
  const [kpis, setKpis] = useState(zeroKpis);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.me().then(setSession).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session) return;
    let live = true;
    setBusy(true);
    Promise.all([api.kpis(), api.expenses(filters.toParams())])
      .then(() => {
        if (live) {
          setKpis(zeroKpis);
          setExpenses([]);
        }
      })
      .catch(() => {
        if (live) {
          setKpis(zeroKpis);
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
          <button className={view === "camera" ? "active" : ""} onClick={() => setView("camera")}><Camera size={18} /> Camara</button>
          <button className={view === "admins" ? "active" : ""} onClick={() => setView("admins")}><Users size={18} /> Administradores</button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Panel restringido</p>
            <h1>{view === "bi" ? "Control operativo" : view === "camera" ? "Lectura de boletos QR" : "Seguridad de acceso"}</h1>
          </div>
          <div className="actions">
            <button title="Exportar PDF" onClick={() => api.createExport("PDF", Object.fromEntries(filters.toParams()))}><Download size={18} /> PDF</button>
            <button title="Salir" onClick={() => api.logout().finally(() => setSession(null))}><LogOut size={18} /></button>
          </div>
        </header>

        {view === "bi" ? (
          <>
            <section className="stats-grid">
              <StatCard label="Ventas del mes" value={money.format(kpis.totalMonth)} icon={ReceiptText} tone="blue" />
              <StatCard label="Promedio diario" value={money.format(kpis.burnRate)} icon={TrendingUp} tone="green" />
              <StatCard label="Desviacion" value={`${kpis.budgetDeviation.toFixed(1)}%`} icon={ShieldCheck} tone="amber" />
              <StatCard label="Proyeccion" value={money.format(kpis.monthEndProjection)} icon={KeyRound} tone="red" />
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

        {view === "camera" ? <CameraPanel /> : null}
        {view === "admins" ? <AdminsPanel /> : null}
      </section>
    </main>
  );
}
