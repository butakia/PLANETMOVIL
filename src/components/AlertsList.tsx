"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, CheckCheck, ShoppingBag } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime } from "@/lib/format";

type A = { id: number; type: string; message: string; sale_id: number | null; flagged: number; read: number; created_at: string; store_name: string | null };

export default function AlertsList() {
  const [alerts, setAlerts] = useState<A[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    const r = await api<{ alerts: A[]; unread: number }>("/api/alerts?limit=100");
    setAlerts(r.alerts); setUnread(r.unread);
  }, []);
  useEffect(() => { load(); window.addEventListener("pm-new-alert", load); return () => window.removeEventListener("pm-new-alert", load); }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Alertas</h1><p className="text-sm text-slate-500">{unread} sin leer · ventas, correcciones y traslados</p></div>
        <button className="btn-ghost" onClick={async () => { await api("/api/alerts", { method: "POST", body: {} }); load(); }}><CheckCheck className="h-4 w-4" /> Marcar todo como leído</button>
      </div>
      {alerts.length === 0 && <p className="card p-10 text-center text-slate-400">Aún no hay alertas.</p>}
      <ul className="space-y-2">
        {alerts.map((a) => {
          const Icon = a.flagged ? AlertTriangle : a.type === "traslado" ? ArrowLeftRight : ShoppingBag;
          return (
            <li key={a.id} className={`flex gap-3 rounded-2xl border p-3.5 ${a.flagged ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"} ${a.read ? "opacity-70" : "shadow-sm"}`}>
              <span className={`mt-0.5 h-fit rounded-full p-2 ${a.flagged ? "bg-amber-200 text-amber-800" : a.type === "traslado" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                {a.flagged ? <div className="text-[11px] font-extrabold uppercase text-amber-700">{a.type === "anulacion" ? "Venta anulada" : "Venta con modificación"}</div> : null}
                <p className="text-sm font-medium">{a.message}</p>
                <div className="mt-1 flex gap-3 text-xs text-slate-400">{fmtDateTime(a.created_at)}{a.sale_id && <Link href={`/recibo/${a.sale_id}`} className="font-semibold text-brand-600">Ver constancia</Link>}</div>
              </div>
              {!a.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />}
            </li>);
        })}
      </ul>
    </div>
  );
}
