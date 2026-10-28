"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { api } from "@/lib/client";
import { METHODS, limaToday } from "@/lib/format";

type Seller = { id: number; name: string; role: string; active: number };

/** Marca equipos del stock como vendidos. Solo la tienda es obligatoria; el resto es opcional. */
export default function MarkSoldModal({ items, stores, defaultStore, onClose, onDone }: {
  items: { id: number; model: string; code: string | null }[];
  stores: { id: number; name: string; color: string }[];
  defaultStore: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [store, setStore] = useState(defaultStore ? String(defaultStore) : "");
  const [more, setMore] = useState(false);
  const [date, setDate] = useState(limaToday());
  const [seller, setSeller] = useState("");
  const [price, setPrice] = useState("");
  const [method, setMethod] = useState("Efectivo");
  const [customer, setCustomer] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ done: number; sales: number; skipped: string[] } | null>(null);

  useEffect(() => {
    api<{ users: Seller[] }>("/api/users").then((r) => setSellers(r.users.filter((u) => u.active && u.role !== "gerencia"))).catch(() => {});
  }, []);

  async function save() {
    if (!store) return setErr("Elige la tienda donde se vendió");
    setBusy(true); setErr("");
    try {
      const r = await api<{ done: number; sales: number; skipped: string[] }>("/api/products/sold", {
        body: { ids: items.map((i) => i.id), store_id: Number(store), date, seller_id: seller || undefined, price: price || undefined, method, customer_name: customer, dni, phone },
      });
      setResult(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="anim-fade fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-slate-900/60 px-3 py-6" onClick={() => !busy && (result ? onDone() : onClose())}>
      <div className="anim-pop mx-auto w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {result ? (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <div>
              <div className="text-lg font-extrabold text-slate-800">{result.done} equipo{result.done === 1 ? "" : "s"} marcado{result.done === 1 ? "" : "s"} como vendido{result.done === 1 ? "" : "s"}</div>
              {result.sales > 0 && <div className="text-sm text-slate-500">Se registraron {result.sales} venta{result.sales === 1 ? "" : "s"} con su constancia.</div>}
              {result.skipped.length > 0 && <div className="mt-2 text-sm text-amber-700">No se tocaron (ya no estaban en stock): {result.skipped.join(", ")}</div>}
            </div>
            <button onClick={onDone} className="btn-primary w-full py-3">Listo</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Marcar como vendido</h2>
                <p className="text-sm text-slate-500">{items.length} equipo{items.length === 1 ? "" : "s"} seleccionado{items.length === 1 ? "" : "s"}</p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <ul className="mt-3 max-h-28 overflow-auto rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
              {items.map((i) => <li key={i.id} className="truncate py-0.5"><b className="font-mono">{i.code ?? "—"}</b> · {i.model}</li>)}
            </ul>

            <div className="mt-4">
              <label className="label">¿En qué tienda se vendió?</label>
              <div className="flex flex-wrap gap-2">
                {stores.map((s) => (
                  <button key={s.id} onClick={() => setStore(String(s.id))} className={`chip ${store === String(s.id) ? "chip-on" : ""}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setMore(!more)} className="mt-4 text-sm font-bold text-blue-700">{more ? "− Ocultar datos opcionales" : "+ Agregar fecha, vendedora, precio… (opcional)"}</button>
            {more && (
              <div className="anim-pop mt-3 grid gap-3 sm:grid-cols-2">
                <div><label className="label">Fecha de venta</label><input type="date" className="input" max={limaToday()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><label className="label">Vendedora</label>
                  <select className="input" value={seller} onChange={(e) => setSeller(e.target.value)}><option value="">Sin especificar</option>{sellers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                <div><label className="label">Precio {items.length > 1 ? "por equipo " : ""}(S/)</label><input inputMode="decimal" className="input" placeholder="Vacío = solo marcar" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} /></div>
                <div><label className="label">Medio de pago</label>
                  <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
                <div className="sm:col-span-2"><label className="label">Cliente</label><input className="input" placeholder="Cliente varios" value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
                <div><label className="label">DNI</label><input inputMode="numeric" className="input" value={dni} onChange={(e) => setDni(e.target.value)} /></div>
                <div><label className="label">Celular</label><input inputMode="numeric" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <p className="text-xs text-slate-400 sm:col-span-2">Si pones un precio, se crea la venta con su constancia y entra a los reportes. Si lo dejas vacío, el equipo solo pasa a “Vendido” con una nota.</p>
              </div>
            )}

            {err && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{err}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={save} disabled={busy} className="btn-primary flex-[2] py-3">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Marcar como vendido</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
