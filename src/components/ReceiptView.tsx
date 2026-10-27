"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Loader2, MessageCircle, Printer, ReceiptText, ShoppingCart } from "lucide-react";
import { api } from "@/lib/client";
import { amountInWords, fmtDateTime } from "@/lib/format";
import { buildReceiptPdf, buildTicketPdf, describe, money, openTicket, shareReceipt, type SaleDoc } from "@/lib/receipt";

export default function ReceiptView({ id }: { id: number }) {
  const [s, setS] = useState<SaleDoc | null>(null);
  const [fresh, setFresh] = useState(false);
  const [err, setErr] = useState("");
  const [tw, setTw] = useState<80 | 58>(80);

  useEffect(() => {
    setFresh(new URLSearchParams(window.location.search).has("nueva"));
    api<{ sale: SaleDoc }>(`/api/sales/${id}`).then((r) => setS(r.sale)).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <p className="p-10 text-center text-slate-500">{err}</p>;
  if (!s) return <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {fresh && (
        <div className="no-print flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">
          <CheckCircle2 className="h-6 w-6" /> ¡Venta registrada! Comparte la constancia con el cliente.
        </div>
      )}
      {s.status === "pending" && <div className="no-print rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">⚠ Venta fuera de tiempo pendiente de aprobación del administrador. Aún no se descuenta del stock.</div>}
      {s.status === "rejected" && <div className="no-print rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">Esta venta fue rechazada por el administrador.</div>}
      <div className="no-print flex flex-wrap gap-2">
        <button onClick={() => shareReceipt(s)} className="btn-primary bg-emerald-600 hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> Enviar por WhatsApp / compartir</button>
        <button onClick={() => buildReceiptPdf(s).save(`Constancia-${s.number}.pdf`)} className="btn-ghost"><Download className="h-4 w-4" /> Descargar PDF</button>
        <button onClick={() => window.print()} className="btn-ghost"><Printer className="h-4 w-4" /> Imprimir</button>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <select value={tw} onChange={(e) => setTw(Number(e.target.value) as 80 | 58)} className="rounded-lg bg-transparent px-2 py-1.5 text-sm font-semibold outline-none"><option value={80}>Ticket 80 mm</option><option value={58}>Ticket 58 mm</option></select>
          <button onClick={() => openTicket(s, tw)} className="btn-soft !py-1.5"><ReceiptText className="h-4 w-4" /> Imprimir ticket</button>
          <button onClick={() => buildTicketPdf(s, tw).save(`Ticket-${s.number}.pdf`)} className="btn-ghost !py-1.5"><Download className="h-4 w-4" /> Descargar</button>
        </div>
        <Link href="/vender" className="btn-soft ml-auto"><ShoppingCart className="h-4 w-4" /> Nueva venta</Link>
      </div>

      {/* Vista de la constancia (mismo formato que el PDF) */}
      <div className="overflow-x-auto">
        <div className="mx-auto min-w-[620px] border-2 border-slate-700 bg-white p-6 text-[13px] text-slate-900 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold uppercase">{s.store_owner || s.store_name}</div>
              {s.store_owner && <div className="mt-1 text-xs">Nombre comercial: {s.store_name}</div>}
              <div className="mt-1 text-xs">{s.store_address}</div>
              {s.store_phone && <div className="text-xs">Tel.: {s.store_phone}</div>}
            </div>
            <div className="w-64 border-2 border-slate-700 p-3 text-center font-bold">
              <div>CONSTANCIA DE VENTA</div>
              {s.store_ruc && <div>RUC: {s.store_ruc}</div>}
              <div>N° {s.number}</div>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-[9rem_1fr] gap-y-1 text-xs">
            {([["Fecha de emisión", fmtDateTime(s.created_at)], ["Señor(es)", s.customer_name || "Cliente varios"], ["DNI", s.dni || "—"], ["Celular", s.phone || "—"], ["Tipo de moneda", "SOLES"], ["Atendido por", s.seller_name]] as const).map(([k, v]) => (
              <div key={k} className="contents"><dt>{k}</dt><dd className="font-bold">: {v}</dd></div>
            ))}
          </dl>
          <table className="mt-5 w-full text-xs">
            <thead><tr className="bg-slate-100 text-left"><th className="p-2">Cantidad</th><th className="p-2">Unidad</th><th className="p-2">Descripción</th><th className="p-2 text-right">Valor unit.</th><th className="p-2 text-right">Importe</th></tr></thead>
            <tbody><tr className="border-t border-slate-400 align-top">
              <td className="p-2">{s.qty.toFixed(2)}</td><td className="p-2">UNIDAD</td>
              <td className="p-2">{describe(s).map((l, i) => <div key={i} className={i === 0 ? "font-bold" : ""}>{l}</div>)}</td>
              <td className="p-2 text-right">{money(s.price / s.qty)}</td><td className="p-2 text-right">{money(s.price)}</td></tr></tbody>
          </table>
          <div className="mt-4 border-t border-slate-400 pt-3">
            <div className="font-bold">SON: {amountInWords(s.price)}</div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="text-xs"><b>Forma de pago:</b>{s.payments.map((p) => <div key={p.method}>{p.method}: S/ {money(p.amount)}</div>)}</div>
              <div className="flex items-center gap-2 font-bold">Importe Total : <span className="border-2 border-slate-700 px-4 py-1 text-base">S/ {money(s.price)}</span></div>
            </div>
          </div>
          <p className="mt-6 text-center text-[11px] italic text-slate-600">Gracias por su compra. Conserve esta constancia como respaldo de su pago y para cualquier consulta o garantía.</p>
        </div>
      </div>
    </div>
  );
}
