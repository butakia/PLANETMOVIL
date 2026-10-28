"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { api } from "@/lib/client";
import { METHODS, limaToday } from "@/lib/format";

type Seller = { id: number; name: string; role: string; active: number };

/** Una línea = un equipo: "Modelo  IMEI". El IMEI es opcional; no se pide código, procedencia ni almacén. */
function parse(text: string) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const m = line.match(/\d{8,16}/);
    const imei = m ? m[0] : "";
    const model = line.replace(imei, " ").replace(/[,;|\t]+/g, " ").replace(/\s+/g, " ").trim();
    return { model, imei };
  });
}

export default function QuickSoldModal({ stores, onClose, onDone }: { stores: { id: number; name: string; color: string }[]; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [store, setStore] = useState("");
  const [date, setDate] = useState(limaToday());
  const [more, setMore] = useState(false);
  const [seller, setSeller] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [price, setPrice] = useState("");
  const [method, setMethod] = useState("Efectivo");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<{ done: number; created: number; sales: number; skipped: string[] } | null>(null);
  const items = useMemo(() => parse(text), [text]);

  useEffect(() => {
    api<{ users: Seller[] }>("/api/users").then((r) => setSellers(r.users.filter((u) => u.active && u.role !== "gerencia"))).catch(() => {});
  }, []);

  async function save() {
    if (!items.length) return setErr("Escribe al menos un equipo");
    if (!store) return setErr("Elige la tienda donde se vendió");
    setBusy(true); setErr("");
    try {
      setRes(await api("/api/products/sold", { body: { items, store_id: Number(store), date, seller_id: seller || undefined, seller_name: seller ? undefined : sellerName, price: price || undefined, method } }));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="anim-fade fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-slate-900/60 px-3 py-6" onClick={() => !busy && (res ? onDone() : onClose())}>
      <div className="anim-pop mx-auto w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {res ? (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <div>
              <div className="text-lg font-extrabold text-slate-800">{res.done} equipo{res.done === 1 ? "" : "s"} registrado{res.done === 1 ? "" : "s"} como vendido{res.done === 1 ? "" : "s"}</div>
              {res.created < res.done && <div className="text-sm text-slate-500">{res.done - res.created} ya estaban en el stock y solo se marcaron como vendidos.</div>}
              {res.sales > 0 && <div className="text-sm text-slate-500">Se registraron {res.sales} ventas con su constancia.</div>}
              {res.skipped.length > 0 && <div className="mt-2 text-sm text-amber-700">No se agregaron: {res.skipped.join("; ")}</div>}
            </div>
            <button onClick={onDone} className="btn-primary w-full py-3">Listo</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Subir equipos vendidos</h2>
                <p className="text-sm text-slate-500">Sin código, procedencia ni almacén: solo el modelo y, si lo tienes, el IMEI.</p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <label className="label mt-4">Un equipo por línea (puedes pegar una lista)</label>
            <textarea autoFocus rows={7} className="input font-mono text-sm" placeholder={"Samsung A07 4+128   353207807581149\nRedmi A5 64GB\nZTE Blade A35e 860568081074549"} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="mt-1 text-xs text-slate-500">{items.length ? `${items.length} equipo${items.length === 1 ? "" : "s"} detectado${items.length === 1 ? "" : "s"}${items.some((i) => !i.model) ? " · las líneas sin modelo se guardan como “Celular”" : ""}` : "El IMEI se reconoce solo si pones 8 a 16 dígitos seguidos."}</div>

            <div className="mt-4">
              <label className="label">¿En qué tienda se vendieron?</label>
              <div className="flex flex-wrap gap-2">
                {stores.map((s) => <button key={s.id} onClick={() => setStore(String(s.id))} className={`chip ${store === String(s.id) ? "chip-on" : ""}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}</button>)}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><label className="label">Fecha de venta</label><input type="date" className="input" max={limaToday()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>

            <button onClick={() => setMore(!more)} className="mt-3 text-sm font-bold text-blue-700">{more ? "− Ocultar" : "+ Vendedora y precio (opcional)"}</button>
            {more && (
              <div className="anim-pop mt-2 grid gap-3 sm:grid-cols-3">
                <div><label className="label">Vendedora</label><select className="input" value={seller} onChange={(e) => setSeller(e.target.value)}><option value="">Escribir nombre…</option>{sellers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                  {!seller && <input className="input mt-1.5" placeholder="Ej. Yuli" value={sellerName} onChange={(e) => setSellerName(e.target.value)} />}</div>
                <div><label className="label">Precio por equipo (S/)</label><input inputMode="decimal" className="input" placeholder="Vacío = sin venta" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} /></div>
                <div><label className="label">Medio de pago</label><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
              </div>
            )}

            {err && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{err}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={save} disabled={busy} className="btn-primary flex-[2] py-3">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Registrar {items.length || ""} vendido{items.length === 1 ? "" : "s"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
