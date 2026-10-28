"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Save, Search, Undo2 } from "lucide-react";
import { api } from "@/lib/client";
import { useCatalog } from "./useCatalog";
import DuplicateImei from "./DuplicateImei";

type P = {
  id: number; kind: string; store_id: number; brand: string | null; model: string; imei1: string | null; imei2: string | null;
  ident: string | null; code: string | null; ram: number | null; storage: number | null; color: string | null; condition: string | null;
  qty: number; price_suggested: number | null; flag?: string | null;
};
type Field = "code" | "store_id" | "brand" | "model" | "ram" | "storage" | "color" | "condition" | "imei1" | "imei2" | "ident" | "qty" | "price_suggested";
type Edits = Record<number, Partial<Record<Field, string>>>;

const COLS: { k: Field; label: string; w: string; num?: boolean }[] = [
  { k: "code", label: "Cód.", w: "w-20" },
  { k: "store_id", label: "Tienda", w: "w-44" },
  { k: "brand", label: "Marca", w: "w-28" },
  { k: "model", label: "Modelo", w: "w-56" },
  { k: "ram", label: "RAM (GB)", w: "w-20", num: true },
  { k: "storage", label: "Alm. (GB)", w: "w-24", num: true },
  { k: "color", label: "Color", w: "w-28" },
  { k: "condition", label: "Caja", w: "w-32" },
  { k: "imei1", label: "IMEI 1", w: "w-44" },
  { k: "imei2", label: "IMEI 2", w: "w-44" },
  { k: "ident", label: "Ident. (accesorios)", w: "w-36" },
  { k: "qty", label: "Cant.", w: "w-16", num: true },
  { k: "price_suggested", label: "Precio (S/)", w: "w-24", num: true },
];

const orig = (p: P, k: Field) => String(p[k] ?? "");

export default function StockEditor({ initialQ = "" }: { initialQ?: string }) {
  const { cat } = useCatalog();
  const [rows, setRows] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQ);
  const [store, setStore] = useState("");
  const [edits, setEdits] = useState<Edits>({});
  const [errs, setErrs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ status: "stock" });
    if (q) sp.set("q", q);
    if (store) sp.set("store", store);
    const r = await api<{ products: P[] }>(`/api/products?${sp}`);
    setRows(r.products);
    setLoading(false);
  }, [q, store]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const val = (p: P, k: Field) => edits[p.id]?.[k] ?? orig(p, k);
  function setVal(p: P, k: Field, v: string) {
    setEdits((e) => {
      const row = { ...(e[p.id] ?? {}) };
      if (v === orig(p, k)) delete row[k]; else row[k] = v;
      const n = { ...e };
      if (Object.keys(row).length) n[p.id] = row; else delete n[p.id];
      return n;
    });
    setMsg("");
  }

  const dirtyIds = useMemo(() => Object.keys(edits).map(Number), [edits]);

  async function save() {
    setSaving(true); setMsg(""); setErrs({});
    const failed: Record<number, string> = {};
    let ok = 0;
    for (const id of dirtyIds) {
      const body: Record<string, string | number | null> = {};
      for (const [k, v] of Object.entries(edits[id])) {
        const f = COLS.find((c) => c.k === k)!;
        body[k] = k === "store_id" ? Number(v) : f.num ? (v.trim() === "" ? null : Number(v)) : v;
      }
      try {
        await api(`/api/products/${id}`, { method: "PATCH", body });
        ok++;
      } catch (e) {
        failed[id] = (e as Error).message;
      }
    }
    setErrs(failed);
    setEdits((e) => Object.fromEntries(Object.entries(e).filter(([id]) => failed[Number(id)])) as Edits);
    setMsg(`${ok} equipo${ok === 1 ? "" : "s"} guardado${ok === 1 ? "" : "s"}${Object.keys(failed).length ? ` · ${Object.keys(failed).length} con error (marcados en rojo)` : ""}.`);
    await load();
    setSaving(false);
  }

  const stores = [{ id: 0, name: "Almacén general" }, ...(cat?.stores ?? [])];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">Editar stock</h1>
          <p className="text-sm text-slate-500">Cambia cualquier campo y pulsa <b>Guardar cambios</b>. Los campos modificados se pintan de amarillo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/stock" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Volver al stock</Link>
          <button disabled={!dirtyIds.length || saving} onClick={() => { setEdits({}); setErrs({}); setMsg(""); }} className="btn-ghost"><Undo2 className="h-4 w-4" /> Descartar</button>
          <button disabled={!dirtyIds.length || saving} onClick={save} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar cambios{dirtyIds.length ? ` (${dirtyIds.length})` : ""}
          </button>
        </div>
      </div>

      {msg && <p className="anim-pop flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" /> {msg}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-200/70 p-1.5">
          {[{ id: "", name: "Todo" }, ...stores.map((s) => ({ id: String(s.id), name: s.name }))].map((t) => (
            <button key={t.id} onClick={() => setStore(t.id)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${store === t.id ? "bg-white text-blue-900 shadow" : "text-slate-500 hover:text-slate-800"}`}>{t.name}</button>
          ))}
        </div>
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar modelo, código, IMEI…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="max-h-[70dvh] overflow-auto">
          <table className="w-max min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>{COLS.map((c) => <th key={c.k} className="th whitespace-nowrap">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {loading && <tr><td className="td py-10 text-center text-slate-400" colSpan={COLS.length}><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {!loading && rows.length === 0 && <tr><td className="td py-10 text-center text-slate-400" colSpan={COLS.length}>No hay equipos con esos filtros.</td></tr>}
              {rows.map((p) => (
                <FragmentRow key={p.id} err={errs[p.id]} cols={COLS.length} flagged={!!p.flag}>
                  {COLS.map((c) => {
                    const changed = edits[p.id]?.[c.k] !== undefined;
                    const cls = `w-full rounded-lg border px-2 py-1.5 outline-none focus:border-blue-500 ${changed ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"} ${c.k === "imei1" || c.k === "imei2" || c.k === "code" ? "font-mono text-xs" : ""}`;
                    return (
                      <td key={c.k} className={`px-1.5 py-1 ${c.w}`}>
                        {c.k === "store_id" ? (
                          <select className={cls} value={val(p, c.k)} onChange={(e) => setVal(p, c.k, e.target.value)}>
                            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        ) : c.k === "condition" ? (
                          <select className={cls} value={val(p, c.k)} onChange={(e) => setVal(p, c.k, e.target.value)}>
                            <option value="">—</option><option value="Sellado">Caja sellada</option><option value="Abierto">Caja abierta</option>
                          </select>
                        ) : (
                          <input className={cls} inputMode={c.num ? "decimal" : undefined} value={val(p, c.k)} onChange={(e) => setVal(p, c.k, e.target.value)} />
                        )}
                        {c.k === "imei1" && p.flag && !changed && <div className="mt-0.5"><DuplicateImei imei={p.imei1} label={p.flag} currentId={p.id} /></div>}
                      </td>
                    );
                  })}
                </FragmentRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-400">{rows.length} equipos en pantalla. Si cambias un código o IMEI que ya existe en otro equipo, ese equipo no se guarda y verás el motivo debajo.</p>
    </div>
  );
}

function FragmentRow({ children, err, cols, flagged }: { children: React.ReactNode; err?: string; cols: number; flagged: boolean }) {
  return (
    <>
      <tr className={err ? "bg-red-50" : flagged ? "bg-red-50/60" : "even:bg-slate-50/60"} style={flagged ? { outline: "2px solid #dc2626", outlineOffset: "-2px" } : undefined}>{children}</tr>
      {err && <tr className="bg-red-50"><td colSpan={cols} className="px-3 pb-2 text-xs font-semibold text-red-700">⚠ {err}</td></tr>}
    </>
  );
}
