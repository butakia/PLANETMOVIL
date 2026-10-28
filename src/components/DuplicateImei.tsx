"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Loader2, Pencil, X } from "lucide-react";
import { api } from "@/lib/client";

type D = { id: number; code: string | null; store_name: string; brand: string | null; model: string; imei1: string | null; imei2: string | null; status: string; entry_date: string };

/** Etiqueta roja "IMEI repetido": al pulsarla muestra en qué equipos y tiendas aparece ese IMEI. */
export default function DuplicateImei({ imei, label = "IMEI repetido", currentId }: { imei: string | null; label?: string; currentId?: number }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<D[] | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !imei) return;
    setRows(null);
    api<{ products: D[] }>(`/api/products?status=all&imei=${encodeURIComponent(imei)}`).then((r) => setRows(r.products)).catch(() => setRows([]));
  }, [open, imei]);

  const byStore = rows?.reduce<Record<string, number>>((m, r) => ({ ...m, [r.store_name]: (m[r.store_name] ?? 0) + 1 }), {}) ?? {};

  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} title="Ver dónde está repetido"
        className="ml-1.5 rounded bg-red-600 px-1.5 py-0.5 font-sans text-[10px] font-bold text-white hover:bg-red-700">{label} ›</button>
      {open && mounted && createPortal(
        <div className="anim-fade fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-slate-900/60 px-3 py-6" onClick={() => setOpen(false)}>
          <div className="anim-sheet mx-auto w-full max-w-3xl rounded-3xl bg-white p-4 shadow-2xl sm:p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-extrabold text-red-700">IMEI repetido</h3>
                <p className="font-mono text-sm font-semibold text-slate-700">{imei}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>

            {!rows ? <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-slate-400" /> : (
              <>
                <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">
                  Aparece en <b>{rows.length}</b> equipo{rows.length === 1 ? "" : "s"}
                  {Object.keys(byStore).length > 0 && <> · {Object.entries(byStore).map(([s, n]) => `${s}: ${n}`).join(" · ")}</>}
                </p>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50"><tr>{["Cód.", "Tienda", "Marca", "Modelo", "Situación", "IMEI 1", "IMEI 2", "Ingreso"].map((h) => <th key={h} className="th whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className={r.id === currentId ? "bg-amber-50" : ""}>
                          <td className="td font-mono font-bold">{r.code ?? "—"}</td>
                          <td className="td whitespace-nowrap">{r.store_name}</td>
                          <td className="td">{r.brand ?? "—"}</td>
                          <td className="td font-semibold">{r.model}</td>
                          <td className="td"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.status === "stock" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{r.status === "stock" ? "En stock" : "Vendido"}</span></td>
                          <td className="td font-mono text-xs">{r.imei1 ?? "—"}</td>
                          <td className="td font-mono text-xs">{r.imei2 ?? "—"}</td>
                          <td className="td whitespace-nowrap text-slate-500">{r.entry_date.split("-").reverse().join("/")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-slate-500">Revisa el IMEI real de cada equipo (marcando *#06# o en la caja) y corrígelo.</p>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setOpen(false)} className="btn-ghost">Cerrar</button>
                  <Link href={`/stock/editar?q=${encodeURIComponent(imei ?? "")}`} className="btn-primary"><Pencil className="h-4 w-4" /> Corregir en Editar</Link>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
