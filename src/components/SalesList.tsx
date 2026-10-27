"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Clock, Download, FileText, Search, X } from "lucide-react";
import { api, downloadCSV } from "@/lib/client";
import { addDays, fmtDay, fmtTime, limaToday, METHODS, soles } from "@/lib/format";
import { useCatalog } from "./useCatalog";

type S = Record<string, any>;
type Preset = "hoy" | "ayer" | "semana" | "mes" | "rango";

function range(p: Preset): [string, string] {
  const t = limaToday();
  if (p === "hoy") return [t, t];
  if (p === "ayer") return [addDays(t, -1), addDays(t, -1)];
  if (p === "semana") return [addDays(t, -((new Date(t + "T00:00:00Z").getUTCDay() + 6) % 7)), t];
  return [t.slice(0, 8) + "01", t];
}

export default function SalesList({ role }: { role: "admin" | "seller" | "gerencia" }) {
  const { cat } = useCatalog();
  const [preset, setPreset] = useState<Preset>("hoy");
  const [[from, to], setRange] = useState<[string, string]>(range("hoy"));
  const [q, setQ] = useState("");
  const [store, setStore] = useState("");
  const [seller, setSeller] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<S[]>([]);
  const [rows, setRows] = useState<S[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("estado") === "pending") { setStatus("pending"); setPreset("rango"); setRange(["2020-01-01", limaToday()]); }
  }, []);
  useEffect(() => { if (role !== "seller") api<{ users: S[] }>("/api/users").then((r) => setUsers(r.users.filter((u) => u.role === "seller"))).catch(() => {}); }, [role]);
  const load = useCallback(async () => {
    const sp = new URLSearchParams({ from, to });
    if (q) sp.set("q", q); if (store) sp.set("store", store); if (seller) sp.set("seller", seller); if (method) sp.set("method", method); if (status) sp.set("status", status);
    setRows((await api<{ sales: S[] }>(`/api/sales?${sp}`)).sales);
  }, [from, to, q, store, seller, method, status]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  function pick(p: Preset) { setPreset(p); if (p !== "rango") setRange(range(p)); }
  async function decide(s: S, action: "approve" | "reject") {
    setMsg("");
    try { await api(`/api/sales/${s.id}`, { method: "PATCH", body: { action } }); load(); } catch (e) { setMsg((e as Error).message); }
  }

  const valid = rows.filter((r) => r.status === "ok");
  const total = valid.reduce((s, r) => s + Number(r.price), 0);
  const pending = rows.filter((r) => r.status === "pending");

  return (
    <div className="stagger space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight">{role === "seller" ? "Mis ventas" : "Ventas"}</h1>
          <p className="text-sm text-slate-500"><b className="text-slate-800">{valid.length}</b> ventas · <b className="text-slate-800">{soles(total)}</b>{pending.length > 0 && <span className="ml-2 font-semibold text-amber-700">· {pending.length} pendiente(s) de aprobación</span>}</p></div>
        <div className="flex gap-2">
          {role === "seller" && <Link href="/vender" className="btn-primary">Ingresar venta</Link>}
          <button className="btn-ghost" onClick={() => downloadCSV(`ventas-${from}_${to}.csv`, [["N°", "Fecha", "Hora", "Estado", "Tienda", "Vendedora", "Equipo", "IMEI", "Cód.", "Cliente", "DNI", "Celular", "Monto", "Pagos"],
            ...rows.map((s) => [s.number, fmtDay(s.day), fmtTime(s.created_at), s.status === "ok" ? "Válida" : s.status === "pending" ? "Pendiente" : "Rechazada", s.store_name, s.seller_name, s.item.model, s.item.imei1, s.item.code, s.customer_name, s.dni, s.phone, s.price, s.payments.map((p: S) => `${p.method} ${p.amount}`).join(" + ")])])}>
            <Download className="h-4 w-4" /> CSV</button>
        </div>
      </div>

      <div className="card space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["hoy", "ayer", "semana", "mes", "rango"] as Preset[]).map((p) => <button key={p} onClick={() => pick(p)} className={`chip !py-1.5 capitalize ${preset === p ? "chip-on" : ""}`}>{p === "semana" ? "Esta semana" : p === "mes" ? "Este mes" : p}</button>)}
          {preset === "rango" && <><input type="date" className="input !w-auto !py-1.5" value={from} onChange={(e) => setRange([e.target.value, to])} /><input type="date" className="input !w-auto !py-1.5" value={to} onChange={(e) => setRange([from, e.target.value])} /></>}
          <div className="relative ml-auto min-w-44 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" /><input className="input !py-1.5 pl-9" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {role !== "seller" && (
          <div className="flex flex-wrap gap-2">
            <select className="input !w-auto !py-1.5" value={store} onChange={(e) => setStore(e.target.value)}><option value="">Ambas tiendas</option>{cat?.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className="input !w-auto !py-1.5" value={seller} onChange={(e) => setSeller(e.target.value)}><option value="">Todas las vendedoras</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
            <select className="input !w-auto !py-1.5" value={method} onChange={(e) => setMethod(e.target.value)}><option value="">Todo medio de pago</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
            <select className="input !w-auto !py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todas</option><option value="ok">Válidas</option><option value="pending">Por aprobar</option><option value="rejected">Rechazadas</option></select>
          </div>
        )}
      </div>
      {msg && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{msg}</p>}

      <div className="card overflow-hidden"><div className="max-h-[70dvh] overflow-auto"><table className="w-full border-separate border-spacing-0">
        <thead><tr>{["N°", "Fecha", "Tienda", "Vendedora", "Equipo", "Cliente", "Pago", "Monto", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={9} className="td py-12 text-center text-slate-400">No hay ventas en este periodo.</td></tr>}
          {rows.map((s) => (
            <Fragment key={s.id}>
              <tr className={s.status === "pending" ? "bg-amber-50/60" : s.status === "rejected" ? "bg-rose-50/50 text-slate-400" : "hover:bg-slate-50"}>
                <td className="td font-mono text-xs font-bold">{s.number}</td>
                <td className="td text-slate-500">{fmtDay(s.day)}{s.late ? "" : ` ${fmtTime(s.created_at)}`}</td>
                <td className="td">{s.store_name}</td><td className="td font-semibold">{s.seller_name}</td>
                <td className="td font-semibold">{s.item.model}
                  {s.status === "pending" && <Badge tone="amber" icon={<Clock className="h-3 w-3" />}>{role === "admin" ? "FUERA DE TIEMPO · POR APROBAR" : "ADVERTENCIA · FUERA DE TIEMPO, PENDIENTE"}</Badge>}
                  {s.status === "rejected" && <Badge tone="rose" icon={<X className="h-3 w-3" />}>RECHAZADA</Badge>}
                  {s.manual ? <Badge tone="slate" icon={<AlertTriangle className="h-3 w-3" />}>MANUAL</Badge> : null}
                  {s.modified && <button onClick={() => setOpen(open === s.id ? null : s.id)} className="ml-2 rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">CORREGIDA</button>}</td>
                <td className="td">{s.customer_name}</td>
                <td className="td text-xs">{s.payments.map((p: S) => p.method).join(" + ")}</td>
                <td className="td text-right font-bold">{soles(s.price)}</td>
                <td className="td">
                  <Link href={`/recibo/${s.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><FileText className="h-3.5 w-3.5" /> Constancia</Link>
                  {role === "admin" && s.status === "pending" && <>
                    <button onClick={() => decide(s, "approve")} className="ml-3 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white"><Check className="h-3 w-3" /> Aprobar</button>
                    <button onClick={() => decide(s, "reject")} className="ml-1.5 inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700"><X className="h-3 w-3" /> Rechazar</button></>}
                  {role === "admin" && s.status === "ok" && <button onClick={async () => { if (confirm(`¿Anular la venta ${s.number}? El equipo volverá al stock.`)) { await api(`/api/sales/${s.id}`, { method: "DELETE" }); load(); } }} className="ml-3 text-xs font-semibold text-rose-600">Anular</button>}
                </td>
              </tr>
              {open === s.id && s.modified && (
                <tr><td colSpan={9} className="bg-amber-50 px-4 py-2 text-xs text-amber-900">
                  {Object.entries(s.modified as Record<string, { from: unknown; to: unknown }>).map(([k, v]) => <span key={k} className="mr-4"><b>{k}</b>: {String(v.from ?? "—")} → {String(v.to ?? "—")}</span>)}</td></tr>)}
            </Fragment>))}
        </tbody></table></div></div>
    </div>
  );
}

function Badge({ tone, icon, children }: { tone: "amber" | "rose" | "slate"; icon: React.ReactNode; children: React.ReactNode }) {
  const c = { amber: "bg-amber-100 text-amber-800", rose: "bg-rose-100 text-rose-700", slate: "bg-slate-100 text-slate-600" }[tone];
  return <span className={`ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${c}`}>{icon}{children}</span>;
}
