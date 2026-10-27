"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/client";
import { soles, specLabel } from "@/lib/format";
import { useCatalog } from "./useCatalog";

type P = { id: number; model: string; brand: string | null; code: string | null; ram: number | null; storage: number | null; color: string | null; price_suggested: number | null; store_id: number; store_name: string; qty: number };

/** Buscador con autocompletado del stock: escribe "samsung" y salen todos, con precio y tienda. */
export default function QuickStockSearch() {
  const { cat, brandColor } = useCatalog();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<P[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setRows([]); return; }
    const t = setTimeout(() => api<{ products: P[] }>(`/api/products?q=${encodeURIComponent(q.trim())}`).then((r) => setRows(r.products)), 200);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <section className="card p-4">
      <h3 className="mb-3 text-sm font-extrabold">Consultar stock en tiempo real</h3>
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input !py-3 pl-10" placeholder="Escribe una marca o modelo: samsung, honor, a15…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {q.trim().length >= 2 && (
        <div className="mt-3 max-h-96 overflow-auto">
          {rows.length === 0 ? <p className="py-4 text-center text-sm text-slate-400">No hay equipos que coincidan.</p> : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="h-9 w-1.5 rounded-full" style={{ background: brandColor(r.brand) }} />
                  <div className="min-w-0 flex-1"><div className="truncate font-bold">{r.model} <span className="font-normal text-slate-500">{specLabel(r.ram, r.storage)} {r.color}</span></div>
                    <div className="text-xs text-slate-400">Cód. {r.code ?? "—"}{r.qty > 1 ? ` · ${r.qty} unid.` : ""}</div></div>
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: cat?.stores.find((s) => s.id === r.store_id)?.color }}>{r.store_name}</span>
                  <b className="w-24 text-right">{soles(r.price_suggested)}</b>
                </li>))}
            </ul>)}
        </div>)}
    </section>
  );
}
