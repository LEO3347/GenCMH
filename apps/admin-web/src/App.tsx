import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis
} from "recharts";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Download,
  Filter,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { api, Expense, KPIResponse } from "./api";
import { useFilters } from "./store";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

const fallbackKpis: KPIResponse = {
  totalMonth: 842300,
  burnRate: 28076,
  budgetDeviation: -6.8,
  monthEndProjection: 898432
};

const fallbackExpenses: Expense[] = [
  {
    id: "e0f1b75d-8c12-4e5e-9f20-2bc739c30110",
    amount: "148000.00",
    currency: "MXN",
    issuedAt: "2026-05-02",
    dueAt: "2026-05-30",
    paymentStatus: "IN_REVIEW",
    vendor: { legalName: "CloudOps Mexico SA", taxId: "COM240101QX1" },
    department: { name: "Operaciones" },
    category: { name: "Licencias de Software", parent: { name: "Operaciones" } }
  },
  {
    id: "1294ea9d-1389-4f27-9d8f-49369493593e",
    amount: "64000.00",
    currency: "MXN",
    issuedAt: "2026-05-08",
    dueAt: "2026-05-24",
    paymentStatus: "OVERDUE",
    vendor: { legalName: "Nodo Fiscal", taxId: "NFI9107142P1" },
    department: { name: "Finanzas" },
    category: { name: "Auditoria", parent: { name: "Servicios Profesionales" } }
  }
];

const areaFallback = [
  { month: "Ene", Operaciones: 220000, Finanzas: 90000, Comercial: 140000 },
  { month: "Feb", Operaciones: 260000, Finanzas: 110000, Comercial: 123000 },
  { month: "Mar", Operaciones: 238000, Finanzas: 132000, Comercial: 151000 },
  { month: "Abr", Operaciones: 310000, Finanzas: 97000, Comercial: 170000 },
  { month: "May", Operaciones: 295000, Finanzas: 120000, Comercial: 196000 }
];

const concentrationFallback = [
  { name: "CloudOps", size: 280000 },
  { name: "Nomina", size: 210000 },
  { name: "Renta", size: 160000 },
  { name: "Legal", size: 95000 },
  { name: "Marketing", size: 88000 }
];

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof TrendingUp; tone: string }) {
  return (
    <section className="stat-card">
      <div className={`icon ${tone}`}><Icon size={19} /></div>
      <p>{label}</p>
      <strong>{value}</strong>
    </section>
  );
}

function statusLabel(status: Expense["paymentStatus"]) {
  return {
    PENDING: "Pendiente",
    PAID: "Pagado",
    SCHEDULED: "Programado",
    OVERDUE: "Vencido",
    IN_REVIEW: "En revision"
  }[status];
}

export function App() {
  const filters = useFilters();
  const [kpis, setKpis] = useState(fallbackKpis);
  const [expenses, setExpenses] = useState(fallbackExpenses);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setBusy(true);
    Promise.all([api.kpis(), api.expenses(filters.toParams())])
      .then(([nextKpis, expenseResult]) => {
        if (live) {
          setKpis(nextKpis);
          setExpenses(expenseResult.expenses);
        }
      })
      .catch(() => undefined)
      .finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [filters.from, filters.to, filters.departmentId, filters.vendorId, filters.paymentStatus, filters.minAmount, filters.maxAmount]);

  const rows = useMemo(() => expenses.map((expense) => ({
    ...expense,
    total: Number(expense.amount)
  })), [expenses]);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><ShieldCheck size={24} /> Admin FinOps</div>
        <nav>
          <button className="active"><TrendingUp size={18} /> BI</button>
          <button><ReceiptText size={18} /> Egresos</button>
          <button><Bell size={18} /> Alertas</button>
          <button><LockKeyhole size={18} /> ABAC</button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Panel restringido</p>
            <h1>Control financiero y operativo</h1>
          </div>
          <div className="actions">
            <button title="Exportar PDF" onClick={() => api.createExport("PDF", Object.fromEntries(filters.toParams()))}><Download size={18} /> PDF</button>
            <button title="Notificaciones"><Bell size={18} /></button>
          </div>
        </header>

        <section className="stats-grid">
          <StatCard label="Gasto total del mes" value={money.format(kpis.totalMonth)} icon={ReceiptText} tone="blue" />
          <StatCard label="Burn rate diario" value={money.format(kpis.burnRate)} icon={TrendingUp} tone="green" />
          <StatCard label="Desviacion presupuestal" value={`${kpis.budgetDeviation.toFixed(1)}%`} icon={ShieldCheck} tone="amber" />
          <StatCard label="Proyeccion cierre" value={money.format(kpis.monthEndProjection)} icon={CalendarDays} tone="red" />
        </section>

        <section className="filters">
          <span><Filter size={16} /> Filtros</span>
          <input type="date" value={filters.from} onChange={(e) => filters.set({ from: e.target.value })} />
          <input type="date" value={filters.to} onChange={(e) => filters.set({ to: e.target.value })} />
          <select value={filters.paymentStatus} onChange={(e) => filters.set({ paymentStatus: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="PAID">Pagado</option>
            <option value="SCHEDULED">Programado</option>
            <option value="OVERDUE">Vencido</option>
            <option value="IN_REVIEW">En revision</option>
          </select>
          <input placeholder="Monto min." value={filters.minAmount} onChange={(e) => filters.set({ minAmount: e.target.value })} />
          <input placeholder="Monto max." value={filters.maxAmount} onChange={(e) => filters.set({ maxAmount: e.target.value })} />
        </section>

        <section className="analytics-grid">
          <div className="panel wide">
            <h2>Evolucion mensual por departamento</h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={areaFallback}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ea" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="Operaciones" stackId="1" stroke="#2563eb" fill="#7db1ff" />
                <Area type="monotone" dataKey="Finanzas" stackId="1" stroke="#059669" fill="#8fd8b7" />
                <Area type="monotone" dataKey="Comercial" stackId="1" stroke="#c2410c" fill="#f6ad7c" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="panel">
            <h2>Concentracion de gasto</h2>
            <ResponsiveContainer width="100%" height={260}>
              <Treemap data={concentrationFallback} dataKey="size" nameKey="name" stroke="#fff" fill="#2563eb" />
            </ResponsiveContainer>
          </div>
        </section>

        <section className="table-panel">
          <div className="table-head">
            <h2>Egresos recientes</h2>
            <button><CheckCircle2 size={17} /> Aprobar seleccion</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" /></th>
                  <th>Proveedor</th>
                  <th>Categoria</th>
                  <th>Departamento</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((expense) => (
                  <tr key={expense.id}>
                    <td><input type="checkbox" /></td>
                    <td>{expense.vendor?.legalName ?? "N/D"}<small>{expense.vendor?.taxId}</small></td>
                    <td>{expense.category?.parent?.name ?? "General"} / {expense.category?.name ?? "N/D"}</td>
                    <td>{expense.department?.name ?? "N/D"}</td>
                    <td>{new Date(expense.dueAt).toLocaleDateString("es-MX")}</td>
                    <td><span className={`status ${expense.paymentStatus.toLowerCase()}`}>{statusLabel(expense.paymentStatus)}</span></td>
                    <td>{money.format(expense.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {busy && <p className="sync">Sincronizando filtros...</p>}
        </section>
      </section>
    </main>
  );
}
