"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Printer, TrendingUp } from "lucide-react";
import { api, downloadCSV } from "@/lib/client";
import { addDays, fmtDay, fmtTime, limaToday, soles } from "@/lib/format";
import { useCatalog } from "./useCatalog";

type Row = Record<string, any>;
type Report = { pending: number; from: string; to: string; totals: Row; byStore: Row[]; bySeller: Row[]; byBrand: Row[]; byDay: Row[]; byMethod: Row[]; stock: Row[]; stockBrand: Row[] };
type Preset = "hoy" | "ayer" | "semana" | "mes" | "rango";

function range(p: Preset): [string, string] {
  const t = limaToday();
  if (p === "hoy") return [t, t];
  if (p === "ayer") return [addDays(t, -1), addDays(t, -1)];
  if (p === "semana") {
    const dow = (new Date(t + "T00:00:00Z").getUTCDay() + 6) % 7; // lunes = 0
    return [addDays(t, -dow), t];
  }
  return [t.slice(0, 8) + "01", t];
}

export default function Reports({ role, home = false, defaultPreset = "hoy" }: { role: "admin" | "seller" | "gerencia"; home?: boolean; defaultPreset?: Preset }) {
  const { cat } = useCatalog();
  const [preset, setPreset] = useState<Preset>(defaultPreset);
  const [[from, to], setRange] = useState<[string, string]>(range(defaultPreset));
  const [store, setStore] = useState("");
  const [seller, setSeller] = useState("");
  const [users, setUsers] = useState<Row[]>([]);
  const [r, setR] = useState<Report | null>(null);
  const [recent, setRecent] = useState<Row[]>([]);
  const seller_ = role === "seller";

  useEffect(() => { if (!seller_) api<{ users: Row[] }>("/api/users").then((x) => setUsers(x.users.filter((u) => u.role === "seller"))).catch(() => {}); }, [seller_]);

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ from, to });
    if (store) sp.set("store", store);
    if (seller) sp.set("seller", seller);
    setR(await api<Report>(`/api/reports?${sp}`));
    sp.set("status", "ok");
    const s = await api<{ sales: Row[] }>(`/api/sales?${sp}`);
    setRecent(s.sales);
  }, [from, to, store, seller]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const h = () => load(); window.addEventListener("pm-new-alert", h); return () => window.removeEventListener("pm-new-alert", h); }, [load]);

  function pick(p: Preset) { setPreset(p); if (p !== "rango") setRange(range(p)); }
  const t = r?.totals;
  const maxDay = Math.max(1, ...(r?.byDay.map((d) => Number(d.revenue)) ?? [0]));
  const maxBrand = Math.max(1, ...(r?.byBrand.map((d) => Number(d.revenue)) ?? [0]));

  function exportSales() {
    downloadCSV(`ventas-${from}_${to}.csv`, [
      ["N°", "Fecha", "Hora", "Tienda", "Vendedora", "Equipo", "IMEI", "Cliente", "DNI", "Monto", "Medios de pago", "Modificada"],
      ...recent.map((s) => [s.number, fmtDay(s.day), fmtTime(s.created_at), s.store_name, s.seller_name, `${s.item.model} ${s.item.ram ?? ""}/${s.item.storage ?? ""}`, s.item.imei1, s.customer_name, s.dni, s.price,
        s.payments.map((p: Row) => `${p.method} ${p.amount}`).join(" + "), s.modified ? "Sí" : ""]),
    ]);
  }

  return (
    <div className="space-y-5">
      {!home && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">{seller_ ? "Mi resumen de ventas" : "Informes"}</h1>
            <p className="text-sm text-slate-500">Se generan solos con cada venta y cada ingreso de stock.</p></div>
          <div className="no-print flex gap-2"><button onClick={exportSales} className="btn-ghost"><Download className="h-4 w-4" /> Ventas CSV</button><button onClick={() => window.print()} className="btn-ghost"><Printer className="h-4 w-4" /> Imprimir</button></div>
        </div>
      )}

      <div className="card no-print flex flex-wrap items-center gap-2 p-3">
        {(["hoy", "ayer", "semana", "mes", "rango"] as Preset[]).map((p) => (
          <button key={p} onClick={() => pick(p)} className={`chip !py-1.5 capitalize ${preset === p ? "chip-on" : ""}`}>{p === "semana" ? "Esta semana" : p === "mes" ? "Este mes" : p === "rango" ? "Rango" : p}</button>
        ))}
        {preset === "rango" && <><input type="date" className="input !w-auto !py-1.5" value={from} onChange={(e) => setRange([e.target.value, to])} /><span>–</span><input type="date" className="input !w-auto !py-1.5" value={to} onChange={(e) => setRange([from, e.target.value])} /></>}
        {!seller_ && (
          <div className="ml-auto flex flex-wrap gap-2">
            <select className="input !w-auto !py-1.5" value={store} onChange={(e) => setStore(e.target.value)}><option value="">Ambas tiendas</option>{cat?.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className="input !w-auto !py-1.5" value={seller} onChange={(e) => setSeller(e.target.value)}><option value="">Todas las vendedoras</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500">Periodo: <b>{fmtDay(from)}{from !== to ? ` al ${fmtDay(to)}` : ""}</b></p>

      {!r ? <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" /></div> : (
        <>
          {role === "admin" && r.pending > 0 && (
            <Link href="/ventas?estado=pending" className="anim-pop flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 lift">
              <span>⚠ {r.pending} venta{r.pending > 1 ? "s" : ""} fuera de tiempo por aprobar</span><span className="text-amber-700">Revisar →</span>
            </Link>
          )}
          <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Total vendido" value={soles(t?.revenue)} num={Number(t?.revenue)} accent />
            <Kpi label="Ventas" tone="green" value={String(t?.sales)} num={Number(t?.sales)} sub={`${t?.units} unidades`} />
            {!seller_ ? <Kpi tone="amber" label="Utilidad estimada" value={t?.profit === null ? "—" : soles(t?.profit)} sub="según precios de compra" /> : <Kpi label="Ticket promedio" value={soles(Number(t?.sales) ? Number(t?.revenue) / Number(t?.sales) : 0)} />}
            {!seller_ ? <Kpi label="Ventas con corrección" value={String(t?.modified ?? 0)} sub="datos modificados" tone={Number(t?.modified) > 0 ? "rose" : undefined} /> : <Kpi label="Equipos vendidos" value={String(t?.units)} />}
          </div>

          {home ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {!seller_ && <Panel title="Por vendedora">
              {r.bySeller.length === 0 ? <Empty /> : <ul className="divide-y divide-slate-100">{r.bySeller.map((s) => (
                <li key={s.seller_id} className="flex items-center justify-between py-2 text-sm"><span><b>{s.seller_name}</b><span className="block text-xs text-slate-400">{s.store_name}</span></span><span className="text-right"><b>{soles(s.revenue)}</b><span className="block text-xs text-slate-400">{s.sales} ventas</span></span></li>))}</ul>}
            </Panel>}
            <Panel title="Medios de pago">
              {r.byMethod.length === 0 ? <Empty /> : <ul className="space-y-2.5">{r.byMethod.map((m) => (
                <li key={m.method}><div className="flex justify-between text-sm"><span className="font-semibold">{m.method}</span><span>{soles(m.amount)}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(Number(m.amount) / Math.max(1, Number(t?.revenue))) * 100}%` }} /></div></li>))}</ul>}
            </Panel>
          </div>
          ) : (
          <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Ventas por día">
              {r.byDay.length === 0 ? <Empty /> : <div className="flex h-40 items-end gap-1.5">{r.byDay.map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${fmtDay(d.day)}: ${soles(d.revenue)}`}>
                  <span className="text-[10px] font-bold text-slate-500">{d.sales}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-sky-400 transition group-hover:opacity-80" style={{ height: `${Math.max(6, (Number(d.revenue) / maxDay) * 100)}%` }} />
                  <span className="text-[10px] text-slate-400">{d.day.slice(8)}</span>
                </div>))}</div>}
            </Panel>
            <Panel title="Medios de pago">
              {r.byMethod.length === 0 ? <Empty /> : <ul className="space-y-2.5">{r.byMethod.map((m) => (
                <li key={m.method}><div className="flex justify-between text-sm"><span className="font-semibold">{m.method}</span><span>{soles(m.amount)}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(Number(m.amount) / Math.max(1, Number(t?.revenue))) * 100}%` }} /></div></li>))}</ul>}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {!seller_ && <Panel title="Por vendedora">
              {r.bySeller.length === 0 ? <Empty /> : <ul className="divide-y divide-slate-100">{r.bySeller.map((s) => (
                <li key={s.seller_id} className="flex items-center justify-between py-2 text-sm"><span><b>{s.seller_name}</b><span className="block text-xs text-slate-400">{s.store_name}</span></span><span className="text-right"><b>{soles(s.revenue)}</b><span className="block text-xs text-slate-400">{s.sales} ventas</span></span></li>))}</ul>}
            </Panel>}
            {!seller_ && <Panel title="Por tienda">
              {r.byStore.length === 0 ? <Empty /> : <ul className="space-y-3">{r.byStore.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: s.color + "14" }}><b style={{ color: s.color }}>{s.name}</b><span className="text-right text-sm"><b>{soles(s.revenue)}</b><span className="block text-xs text-slate-500">{s.sales} ventas</span></span></li>))}</ul>}
            </Panel>}
            <Panel title="Por marca">
              {r.byBrand.length === 0 ? <Empty /> : <ul className="space-y-2">{r.byBrand.map((b) => (
                <li key={b.brand}><div className="flex justify-between text-sm"><span className="font-semibold">{b.brand}</span><span>{b.sales} · {soles(b.revenue)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(Number(b.revenue) / maxBrand) * 100}%` }} /></div></li>))}</ul>}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Stock actual por tienda">
              <ul className="space-y-2">{r.stock.filter((x) => x.id !== 0 || Number(x.units) > 0).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: s.color + "14" }}>
                  <b style={{ color: s.color }}>{s.name}</b><span className="text-right text-sm"><b>{s.units} equipos</b><span className="block text-xs text-slate-500">Valorizado {soles(s.value_suggested)}{s.value_cost ? ` · Costo ${soles(s.value_cost)}` : ""}</span></span></li>))}</ul>
            </Panel>
            <Panel title="Stock por marca" action={<Link href="/stock" className="text-xs font-semibold text-brand-600">Ver stock →</Link>}>
              <div className="flex flex-wrap gap-2">{r.stockBrand.map((b) => <span key={b.brand} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{b.brand} <b className="text-brand-600">{b.units}</b></span>)}</div>
            </Panel>
          </div>

          </>
          )}

          <Panel title={home ? "Últimas ventas" : "Detalle de ventas"} action={<Link href="/ventas" className="text-xs font-semibold text-brand-600">Ver todas →</Link>}>
            {recent.length === 0 ? <Empty /> : (
              <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
                {recent.slice(0, home ? 8 : 30).map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-xs text-slate-400">{fmtTime(s.created_at)}</td>
                    <td className="py-2 pr-3 font-semibold">{s.item.model}{s.modified && <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">CORREGIDA</span>}</td>
                    <td className="py-2 pr-3 text-slate-500">{s.seller_name} · {s.store_name}</td>
                    <td className="py-2 pr-3 text-right font-bold">{soles(s.price)}</td>
                    <td className="py-2 text-right"><Link href={`/recibo/${s.id}`} className="text-xs font-semibold text-brand-600">Constancia</Link></td>
                  </tr>))}
              </tbody></table></div>)}
          </Panel>
        </>
      )}
    </div>
  );
}

function useCountUp(target: number | undefined) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (target === undefined || Number.isNaN(target)) return;
    const start = performance.now(), a = from.current, dur = 700;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
      setV(a + (target - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function Kpi({ label, value, sub, accent, warn, num, tone }: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean; num?: number; tone?: "green" | "amber" | "rose" }) {
  const anim = useCountUp(num);
  const shown = num === undefined ? value : value.startsWith("S/") ? soles(anim) : String(Math.round(anim));
  const look = accent ? "bg-gradient-to-br from-blue-600 to-blue-900 text-white"
    : tone === "green" ? "bg-gradient-to-br from-emerald-400 to-teal-600 text-white"
    : tone === "amber" ? "bg-gradient-to-br from-amber-300 to-orange-500 text-white"
    : warn || tone === "rose" ? "bg-gradient-to-br from-rose-400 to-pink-600 text-white"
    : "card";
  const light = look !== "card";
  return (
    <div className={`lift rounded-2xl p-4 shadow-sm ${look}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${light ? "text-white/80" : "text-slate-500"}`}>{accent && <TrendingUp className="h-3.5 w-3.5" />}{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">{shown}</div>
      {sub && <div className={`text-xs ${light ? "text-white/75" : "text-slate-400"}`}>{sub}</div>}
    </div>
  );
}
function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="card p-4"><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sky-400 to-blue-700" />{title}</h3>{action}</div>{children}</section>;
}
const Empty = () => <p className="py-6 text-center text-sm text-slate-400">Sin datos en este periodo.</p>;
