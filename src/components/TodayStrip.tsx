"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { api } from "@/lib/client";
import { soles } from "@/lib/format";

/** Resumen mínimo del día para la vendedora, con aviso si tiene ventas pendientes de aprobación. */
export default function TodayStrip() {
  const [r, setR] = useState<{ pending: number; totals: { sales: number; revenue: number } } | null>(null);
  useEffect(() => { api("/api/reports?lite=1").then(setR).catch(() => {}); }, []);
  if (!r) return <div className="h-20" />;
  return (
    <div className="space-y-3">
      <div className="card grid grid-cols-2 divide-x divide-slate-100 p-1">
        <div className="p-4"><div className="text-[11px] font-bold uppercase text-slate-400">Vendido hoy</div><div className="mt-1 text-2xl font-extrabold tabular-nums">{soles(r.totals.revenue)}</div></div>
        <div className="p-4"><div className="text-[11px] font-bold uppercase text-slate-400">Ventas hoy</div><div className="mt-1 text-2xl font-extrabold tabular-nums">{r.totals.sales}</div></div>
      </div>
      {r.pending > 0 && (
        <Link href="/ventas" className="anim-pop flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <Clock className="h-4 w-4 shrink-0" /> Tienes {r.pending} venta{r.pending > 1 ? "s" : ""} fuera de tiempo esperando aprobación del administrador.
        </Link>
      )}
    </div>
  );
}
