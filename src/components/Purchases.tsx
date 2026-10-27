"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { api, downloadCSV } from "@/lib/client";
import { fmtDay, soles, specLabel } from "@/lib/format";
import { useCatalog } from "./useCatalog";

type P = { id: number; model: string; brand: string | null; code: string | null; ram: number | null; storage: number | null; color: string | null; store_id: number; store_name: string; qty: number; price_suggested: number | null; cost: number | null; supplier: string | null; purchase_date: string | null; entry_date: string; status: string };

/** Compras: precio de compra y proveedor por equipo. Lo editan el administrador y gerencia. */
export default function Purchases() {
  const { cat, brandColor } = useCatalog();
  const [rows, setRows] = useState<P[]>([]);
  const [q, setQ] = useState("");
  const [store, setStore] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const load = useCallback(async () => {
    const sp = new URLSearchParams({ status: "all" });
    if (q) sp.set("q", q); if (store) sp.set("store", store);
    const r = await api<{ products: P[] }>(`/api/products?${sp}`);
    setRows(r.products.sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.id - a.id));
  }, [q, store]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  async function patch(p: P, field: string, value: string) {
    if (String(p[field as keyof P] ?? "") === value) return;
    await api(`/api/products/${p.id}`, { method: "PATCH", body: { [field]: value, ...(field === "cost" && !p.purchase_date ? { purchase_date: p.entry_date } : {}) } });
    load();
  }
  const shown = onlyMissing ? rows.filter((r) => r.cost === null) : rows;
  const inStock = rows.filter((r) => r.status === "stock");
  const costTotal = inStock.reduce((s, r) => s + (r.cost ?? 0) * r.qty, 0);
  const saleTotal = inStock.reduce((s, r) => s + (r.price_suggested ?? 0) * r.qty, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Compras y costos</h1>
          <p className="text-sm text-slate-500">Stock actual a costo <b className="text-slate-800">{soles(costTotal)}</b> · a precio sugerido <b className="text-slate-800">{soles(saleTotal)}</b> · margen potencial <b className="text-emerald-600">{soles(saleTotal - costTotal)}</b></p></div>
        <button className="btn-ghost" onClick={() => downloadCSV("compras.csv", [["Ingreso", "Tienda", "Marca", "Modelo", "Cód.", "Cantidad", "Proveedor", "P. compra", "P. sugerido", "Situación"], ...shown.map((r) => [fmtDay(r.entry_date), r.store_name, r.brand, r.model, r.code, r.qty, r.supplier, r.cost, r.price_suggested, r.status === "stock" ? "En stock" : "Vendido"])])}><Download className="h-4 w-4" /> Descargar CSV</button>
      </div>
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Modelo, código, proveedor…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input !w-auto" value={store} onChange={(e) => setStore(e.target.value)}><option value="">Ambas tiendas</option>{cat?.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <label className="flex items-center gap-2 px-2 text-sm font-medium text-slate-600"><input type="checkbox" className="accent-blue-600" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Solo sin precio de compra</label>
      </div>
      <div className="card overflow-hidden"><div className="max-h-[70dvh] overflow-auto"><table className="w-full border-separate border-spacing-0">
        <thead><tr>{["Ingreso", "Tienda", "Equipo", "Cód.", "Proveedor", "P. compra (S/)", "P. sugerido (S/)", "Margen", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{shown.map((r) => (
          <tr key={r.id} style={{ background: brandColor(r.brand) + "10" }}>
            <td className="td text-slate-500" style={{ borderLeft: `5px solid ${brandColor(r.brand)}` }}>{fmtDay(r.entry_date)}</td>
            <td className="td">{r.store_name}</td>
            <td className="td font-semibold">{r.model} <span className="text-xs font-normal text-slate-500">{specLabel(r.ram, r.storage)} {r.color}</span></td>
            <td className="td font-mono font-bold">{r.code ?? "—"}</td>
            <td className="td"><input className="input !w-40 !py-1.5" defaultValue={r.supplier ?? ""} placeholder="Proveedor" onBlur={(e) => patch(r, "supplier", e.target.value)} /></td>
            <td className="td"><input type="number" className="input !w-28 !py-1.5" defaultValue={r.cost ?? ""} onBlur={(e) => patch(r, "cost", e.target.value)} /></td>
            <td className="td"><input type="number" className="input !w-28 !py-1.5" defaultValue={r.price_suggested ?? ""} onBlur={(e) => patch(r, "price_suggested", e.target.value)} /></td>
            <td className="td font-bold text-emerald-600">{r.cost !== null && r.price_suggested !== null ? soles(r.price_suggested - r.cost) : "—"}</td>
            <td className="td text-xs text-slate-400">{r.status === "stock" ? "" : "Vendido"}</td>
          </tr>))}
          {shown.length === 0 && <tr><td colSpan={9} className="td py-10 text-center text-slate-400">Sin resultados.</td></tr>}</tbody></table></div></div>
      <p className="text-xs text-slate-400">Los cambios se guardan al salir de cada casilla. El personal de ventas no ve estos datos.</p>
    </div>
  );
}
