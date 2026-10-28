"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Pencil, Plus, QrCode, Search, Trash2, Upload, X } from "lucide-react";
import { api, downloadCSV } from "@/lib/client";
import { fmtDay, soles, storageLabel } from "@/lib/format";
import { useCatalog } from "./useCatalog";
import ImportModal from "./ImportModal";
import DuplicateImei from "./DuplicateImei";

type P = {
  id: number; kind: string; store_id: number; store_name: string; brand: string | null; model: string; imei1: string | null; imei2: string | null;
  ident: string | null; code: string | null; ram: number | null; storage: number | null; color: string | null; condition: string | null; qty: number;
  price_suggested: number | null; entry_date: string; status: string; is_test?: number; flag?: string | null;
};

export default function StockTable({ role }: { role: "admin" | "seller" | "gerencia" }) {
  const { cat, brandColor, colorHex } = useCatalog();
  const [rows, setRows] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [store, setStore] = useState("");
  const [brand, setBrand] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("stock");
  const [group, setGroup] = useState(false);
  const [adv, setAdv] = useState(false);
  const [f, setF] = useState({ color: "", ram: "", storage: "", condition: "", from: "", to: "", pmin: "", pmax: "", noprice: "" });
  const activeAdv = Object.values(f).filter(Boolean).length;
  const [edit, setEdit] = useState<P | null>(null);
  const [importing, setImporting] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [aqty, setAqty] = useState("");
  const toggle = (id: number) => setSel((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ status });
    if (q) sp.set("q", q);
    if (store) sp.set("store", store);
    if (brand) sp.set("brand", brand);
    if (kind) sp.set("kind", kind);
    Object.entries(f).forEach(([k, v]) => v && sp.set(k, v));
    const r = await api<{ products: P[] }>(`/api/products?${sp}`);
    setRows(r.products);
    setLoading(false);
  }, [q, store, brand, kind, status, f]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const totals = useMemo(() => ({
    units: rows.reduce((s, r) => s + (r.status === "stock" ? r.qty : 0), 0),
    value: rows.reduce((s, r) => s + (r.status === "stock" ? (r.price_suggested ?? 0) * r.qty : 0), 0),
  }), [rows]);

  const grouped = useMemo(() => {
    if (!group) return [["", rows] as [string, P[]]];
    const m = new Map<string, P[]>();
    rows.forEach((r) => m.set(r.brand ?? "Otros", [...(m.get(r.brand ?? "Otros") ?? []), r]));
    return [...m.entries()];
  }, [rows, group]);

  async function assign(to: number) {
    const ids = [...sel];
    if (!ids.length) return;
    const one = ids.length === 1 ? rows.find((r) => r.id === ids[0]) : null;
    await api("/api/products/assign", { body: { ids, store_id: to, qty: one && one.kind === "accesorio" && Number(aqty) > 0 ? Number(aqty) : undefined } });
    setSel(new Set()); setAqty(""); load();
  }
  const oneSel = sel.size === 1 ? rows.find((r) => sel.has(r.id)) : null;

  function exportCsv() {
    downloadCSV(`stock-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Tienda", "Tipo", "Marca", "Modelo", "RAM", "Almacenamiento", "Color", "Estado caja", "Cód. interno", "IMEI 1", "IMEI 2", "Cód. identificación", "Cantidad", "Precio sugerido", "Fecha ingreso", "Situación"],
      ...rows.map((r) => [r.store_name, r.kind, r.brand, r.model, r.ram || "", r.storage ? storageLabel(r.storage) : "", r.color, r.condition, r.code, r.imei1, r.imei2, r.ident, r.qty, r.price_suggested, fmtDay(r.entry_date), r.status === "stock" ? "En stock" : "Vendido"]),
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">Stock</h1>
          <p className="text-sm text-slate-500"><b className="text-slate-800">{totals.units}</b> unidades · valorizado a precio sugerido <b className="text-slate-800">{soles(totals.value)}</b></p>
        </div>
        <div className="flex gap-2">
          {role === "admin" && <Link href="/stock/editar" className="btn-primary !bg-amber-500 hover:!bg-amber-600"><Pencil className="h-4 w-4" /> Editar</Link>}
          {role === "admin" && <button onClick={() => setImporting(true)} className="btn-ghost"><Upload className="h-4 w-4" /> Importar hoja</button>}
          <button onClick={exportCsv} className="btn-ghost"><Download className="h-4 w-4" /> Descargar Excel/CSV</button>
          {role === "admin" && <Link href="/stock/nuevo" className="btn-primary"><Plus className="h-4 w-4" /> Ingresar</Link>}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-200/70 p-1.5">
        {[{ id: "", name: "Todo el stock", color: "#1e3a8a" }, { id: "0", name: "Almacén general", color: "#475569" }, ...(cat?.stores.map((x) => ({ id: String(x.id), name: x.name, color: x.color })) ?? [])].map((t) => (
          <button key={t.id} onClick={() => setStore(t.id)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${store === t.id ? "bg-white shadow" : "text-slate-500 hover:text-slate-800"}`} style={store === t.id ? { color: t.color } : undefined}>{t.name}</button>
        ))}
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar modelo, código, IMEI, color…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">Todas las marcas</option>
          {cat?.brands.map((b) => <option key={b.name}>{b.name}</option>)}
        </select>
        <select className="input !w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Celulares y accesorios</option><option value="celular">Celulares</option><option value="accesorio">Accesorios</option>
        </select>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="stock">En stock</option><option value="sold">Vendidos</option><option value="all">Todos</option>
        </select>
        <label className="flex items-center gap-2 px-2 text-sm font-medium text-slate-600"><input type="checkbox" className="accent-blue-600" checked={group} onChange={(e) => setGroup(e.target.checked)} /> Agrupar por marca</label>
        <button onClick={() => setAdv(!adv)} className={`chip !py-1.5 text-xs ${adv || activeAdv ? "chip-on" : ""}`}>Más filtros{activeAdv ? ` (${activeAdv})` : ""}</button>
        {adv && (
          <div className="anim-pop grid w-full gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="label">Color</label><select className="input" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })}><option value="">Todos</option>{cat?.colors.map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
            <div><label className="label">RAM</label><select className="input" value={f.ram} onChange={(e) => setF({ ...f, ram: e.target.value })}><option value="">Todas</option>{[1, 2, 3, 4, 6, 8, 12, 16].map((n) => <option key={n} value={n}>{n} GB</option>)}</select></div>
            <div><label className="label">Almacenamiento</label><select className="input" value={f.storage} onChange={(e) => setF({ ...f, storage: e.target.value })}><option value="">Todos</option>{[8, 16, 32, 64, 128, 256, 512, 1024].map((n) => <option key={n} value={n}>{storageLabel(n)}</option>)}</select></div>
            <div><label className="label">Caja</label><select className="input" value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })}><option value="">Todas</option><option value="Sellado">Sellada</option><option value="Abierto">Abierta</option></select></div>
            <div><label className="label">Ingresó desde</label><input type="date" className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
            <div><label className="label">Ingresó hasta</label><input type="date" className="input" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
            <div><label className="label">Precio desde (S/)</label><input type="number" className="input" value={f.pmin} onChange={(e) => setF({ ...f, pmin: e.target.value })} /></div>
            <div><label className="label">Precio hasta (S/)</label><input type="number" className="input" value={f.pmax} onChange={(e) => setF({ ...f, pmax: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600"><input type="checkbox" className="accent-blue-700" checked={!!f.noprice} onChange={(e) => setF({ ...f, noprice: e.target.checked ? "1" : "" })} /> Solo sin precio sugerido</label>
            {activeAdv > 0 && <button className="btn-ghost !py-1.5 text-xs sm:col-start-4" onClick={() => setF({ color: "", ram: "", storage: "", condition: "", from: "", to: "", pmin: "", pmax: "", noprice: "" })}>Limpiar filtros</button>}
          </div>
        )}
      </div>

      {role === "admin" && sel.size > 0 && (
        <div className="anim-pop sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-2xl bg-blue-900 p-3 text-sm font-semibold text-white shadow-xl">
          <span>{sel.size} seleccionado{sel.size > 1 ? "s" : ""}</span>
          {oneSel && oneSel.kind === "accesorio" && oneSel.qty > 1 && <input type="number" min={1} max={oneSel.qty - 1} placeholder={"cuántas de " + oneSel.qty} className="w-32 rounded-lg px-2 py-1 text-slate-900" value={aqty} onChange={(e) => setAqty(e.target.value)} />}
          <span className="opacity-70">Asignar a:</span>
          {cat?.stores.map((x) => <button key={x.id} onClick={() => assign(x.id)} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: x.color }}>{x.name}</button>)}
          <button onClick={() => assign(0)} className="rounded-lg bg-slate-500 px-3 py-1.5 text-xs font-bold">Almacén general</button>
          <button onClick={() => setSel(new Set())} className="ml-auto rounded-lg bg-white/15 px-3 py-1.5 text-xs">Cancelar</button>
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="max-h-[68dvh] overflow-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {[...(role === "admin" ? [""] : []), "Cód.", "Tienda", "Marca", "Modelo", "RAM", "Alm.", "Color", "Caja", "IMEI 1", "IMEI 2 / Ident.", "P. sugerido", "Ingreso", ...(status !== "stock" ? ["Situación"] : []), ""].map((h, i) => <th key={i} className="th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td className="td py-10 text-center text-slate-400" colSpan={16}><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {!loading && rows.length === 0 && <tr><td className="td py-10 text-center text-slate-400" colSpan={16}>No hay equipos con esos filtros.</td></tr>}
              {grouped.map(([g, list]) => (
                <GroupRows key={g} title={g} color={brandColor(g)} count={list.length} show={group}>
                  {list.map((r) => {
                    const bc = brandColor(r.brand);
                    return (
                      <tr key={r.id} className="hover:brightness-95" style={r.flag ? { background: "#fee2e2", outline: "2px solid #dc2626", outlineOffset: "-2px" } : { background: bc + "12" }}>
                        {role === "admin" && <td className="td" style={{ borderLeft: `5px solid ${bc}` }}><input type="checkbox" className="h-4 w-4 accent-blue-700" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>}
                        <td className="td font-mono font-bold" style={role === "admin" ? undefined : { borderLeft: `5px solid ${bc}` }}>{r.code ?? "—"}</td>
                        <td className="td"><span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: cat?.stores.find((s) => s.id === r.store_id)?.color ?? "#64748b" }}>{r.store_name}</span></td>
                        <td className="td font-bold" style={{ color: bc }}>{r.brand ?? "—"}</td>
                        <td className="td font-semibold">{r.model}{r.is_test ? <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">PRUEBA</span> : null}{r.kind === "accesorio" && r.qty > 1 ? <span className="ml-1 text-xs text-slate-500">×{r.qty}</span> : null}</td>
                        <td className="td">{r.ram ? `${r.ram}GB` : "—"}</td>
                        <td className="td">{r.storage ? storageLabel(r.storage) : "—"}</td>
                        <td className="td">{r.color ? <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-slate-300" style={{ background: colorHex(r.color) }} />{r.color}</span> : "—"}</td>
                        <td className="td">{r.condition ?? "—"}</td>
                        <td className="td font-mono text-xs">{r.imei1 ?? "—"}{r.flag ? <DuplicateImei imei={r.imei1} label={r.flag} currentId={r.id} /> : null}</td>
                        <td className="td font-mono text-xs">{r.imei2 ?? r.ident ?? "—"}</td>
                        <td className="td font-semibold">{soles(r.price_suggested)}</td>
                        <td className="td text-slate-500">{fmtDay(r.entry_date)}</td>
                        {status !== "stock" && <td className="td">{r.status === "stock" ? "En stock" : "Vendido"}</td>}
                        <td className="td">{role === "admin" && r.kind === "accesorio" && <Link href={"/etiquetas?id=" + r.id} title="Etiqueta QR / código de barras" className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><QrCode className="h-4 w-4" /></Link>}{role === "admin" && <button onClick={() => setEdit(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><Pencil className="h-4 w-4" /></button>}</td>
                      </tr>
                    );
                  })}
                </GroupRows>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {importing && <ImportModal onClose={() => setImporting(false)} onDone={load} />}
      {edit && cat && <EditModal p={edit} stores={[{ id: 0, name: "Almacén general" }, ...cat.stores]} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function GroupRows({ title, color, count, show, children }: { title: string; color: string; count: number; show: boolean; children: React.ReactNode }) {
  return (
    <>
      {show && <tr><td colSpan={16} className="border-b border-slate-200 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white" style={{ background: color }}>{title} · {count}</td></tr>}
      {children}
    </>
  );
}

function EditModal({ p, stores, onClose, onDone }: { p: P; stores: { id: number; name: string }[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<Record<string, string | number | null>>({ ...p });
  const [err, setErr] = useState("");
  const set = (k: string, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  const field = (k: string, label: string, type = "text") => (
    <div key={k}><label className="label">{label}</label><input type={type} className="input" value={(f[k] as string | number | null) ?? ""} onChange={(e) => set(k, e.target.value)} /></div>
  );
  async function save() {
    try {
      await api(`/api/products/${p.id}`, { method: "PATCH", body: f });
      onDone();
    } catch (e) { setErr((e as Error).message); }
  }
  async function del() {
    if (!confirm("¿Eliminar este equipo del stock? No se puede deshacer.")) return;
    await api(`/api/products/${p.id}`, { method: "DELETE" });
    onDone();
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[88dvh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-extrabold">Editar equipo</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("brand", "Marca")}{field("model", "Modelo")}{field("code", "Código interno")}
          <div><label className="label">Tienda</label><select className="input" value={Number(f.store_id)} onChange={(e) => set("store_id", Number(e.target.value))}>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          {p.kind === "celular" ? <>{field("imei1", "IMEI 1")}{field("imei2", "IMEI 2")}{field("ram", "RAM (GB)", "number")}{field("storage", "Almacenamiento (GB)", "number")}
            <div><label className="label">Caja</label><select className="input" value={String(f.condition ?? "")} onChange={(e) => set("condition", e.target.value)}><option value="">—</option><option>Sellado</option><option>Abierto</option></select></div></>
            : <>{field("ident", "Cód. identificación")}{field("qty", "Cantidad", "number")}</>}
          {field("color", "Color")}{field("price_suggested", "Precio sugerido (S/)", "number")}{field("entry_date", "Fecha de ingreso", "date")}
        </div>
        {err && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
        <div className="mt-5 flex justify-between gap-2">
          <button onClick={del} className="btn-danger"><Trash2 className="h-4 w-4" /> Eliminar</button>
          <div className="flex gap-2"><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={save} className="btn-primary">Guardar cambios</button></div>
        </div>
      </div>
    </div>
  );
}
