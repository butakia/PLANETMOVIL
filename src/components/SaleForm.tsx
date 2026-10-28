"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowLeft, ArrowLeftRight, Camera, ChevronRight, Clock, Headphones, Loader2, Minus, PencilLine, Plus, Search, ShoppingCart, Smartphone, Wrench } from "lucide-react";
import { api } from "@/lib/client";
import { limaToday, METHODS, soles, specLabel } from "@/lib/format";
import { useCatalog } from "./useCatalog";
import BarcodeScanner from "./BarcodeScanner";
import NumPad from "./NumPad";
import SimpleAccessory, { accessoryName, type Accessory } from "./SimpleAccessory";
import ServiceFields, { type Service } from "./ServiceFields";
import SaleSuccess from "./SaleSuccess";

type P = {
  id: number; kind: "celular" | "accesorio"; store_id: number; store_name: string; brand: string | null; model: string; imei1: string | null; imei2: string | null;
  ident: string | null; code: string | null; ram: number | null; storage: number | null; color: string | null; condition: string | null; qty: number; price_suggested: number | null;
};
type Pay = { method: string; amount: string };
const EDIT_KEYS = ["model", "ram", "storage", "color", "condition", "imei1", "imei2"] as const;
const boxLabel = (c?: string | null) => (!c ? "—" : c.toLowerCase().startsWith("sell") ? "Caja sellada" : c.toLowerCase().startsWith("abi") ? "Caja abierta" : c);

export default function SaleForm({ user, late = false }: { user: { role: string; store_id: number | null; name: string }; late?: boolean }) {
  const router = useRouter();
  const { cat, brandColor } = useCatalog();
  const [mode, setMode] = useState<null | "celular" | "accesorio" | "servicio">(null);
  const [acc, setAcc] = useState<Accessory | null>(null);
  const [svc, setSvc] = useState<Service>({ technician: "", detail: "" });
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [matches, setMatches] = useState<P[]>([]);
  const [p, setP] = useState<P | null>(null);
  const [manual, setManual] = useState(false);
  const [mStore, setMStore] = useState(user.store_id ?? 1);
  const [searched, setSearched] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState("Efectivo");
  const [split, setSplit] = useState(false);
  const [amt, setAmt] = useState<Record<string, string>>({});
  const [moreM, setMoreM] = useState(false);
  const resetPay = () => { setMethod("Efectivo"); setSplit(false); setAmt({}); setMoreM(false); };
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [dni, setDni] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [cam, setCam] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const codeRef = useRef<HTMLInputElement>(null);

  async function search(value = code) {
    const v = value.trim();
    if (!v) return;
    setErr("");
    let r = await api<{ products: P[] }>(`/api/products?code=${encodeURIComponent(v)}`);
    if (!r.products.length) r = await api<{ products: P[] }>(`/api/products?q=${encodeURIComponent(v)}`);
    setSearched(true);
    if (r.products.length === 1) select(r.products[0]);
    else { setP(null); setManual(false); setMatches(r.products); }
  }

  function select(x: P) {
    setP(x); setMatches([]); setEditing(false); setManual(false);
    setFields({ model: x.model, ram: String(x.ram ?? ""), storage: String(x.storage ?? ""), color: x.color ?? "", condition: x.condition ?? "", imei1: x.imei1 ?? "", imei2: x.imei2 ?? "" });
    setPrice(x.price_suggested ? String(x.price_suggested) : "");
    resetPay();
    setQty(1);
  }

  function startManual() {
    const isImei = /^\d{14,16}$/.test(code.trim());
    setManual(true); setMatches([]); setP(null); setEditing(true);
    setFields({ model: "", ram: "4", storage: "128", color: "", condition: "", imei1: isImei ? code.trim() : "", imei2: "", code: isImei ? "" : code.trim() });
    setPrice(""); resetPay();
  }

  const total = Number(price) || 0;
  const single = !split;
  const paid = single ? total : Object.values(amt).reduce((s, v) => s + (Number(v) || 0), 0);
  const payList = single ? [{ method, amount: total }] : METHODS.filter((m) => Number(amt[m]) > 0).map((m) => ({ method: m, amount: Number(amt[m]) }));
  function setAmtFor(m: string, v: string) {
    if (moreM || v === "") return setAmt({ ...amt, [m]: v });
    const other = m === "Efectivo" ? "Yape" : "Efectivo";
    const rest = Math.round((total - Number(v)) * 100) / 100;
    setAmt({ [m]: v, [other]: rest > 0 ? String(rest) : "0" });
  }
  const remaining = Math.round((total - paid) * 100) / 100;
  const isSvc = mode === "servicio";
  const svcReady = isSvc && !!svc.technician.trim() && !!svc.detail.trim();
  const hasItem = !!p || manual || !!acc || svcReady;
  const isAcc = !!acc || p?.kind === "accesorio";
  const itemName = isSvc ? `Servicio técnico: ${svc.detail.trim()}` : acc ?[accessoryName(acc), acc.detail.trim()].filter(Boolean).join(" ") : fields.model;

  function chooseMode(m: "celular" | "accesorio" | "servicio") {
    setMode(m); setErr("");
  }
  function backToChoice() {
    setMode(null); setAcc(null); setP(null); setManual(false); setMatches([]); setSearched(false); setCode("");
    setPrice(""); setQty(1); setErr(""); setEditing(false); resetPay();
  }

  const changes = useMemo(() => {
    if (!p) return [] as string[];
    return EDIT_KEYS.filter((k) => (fields[k] ?? "") !== String((p as unknown as Record<string, unknown>)[k] ?? ""));
  }, [p, fields]);

  useEffect(() => { if (mode === "celular") codeRef.current?.focus(); }, [mode]);
  const store = cat?.stores.find((s) => s.id === (p?.store_id ?? mStore));

  async function transfer(to = user.store_id) {
    if (!p || !to) return;
    await api("/api/transfer", { body: { product_id: p.id, to_store: to } });
    await search(p.code ?? code);
  }

  function review() {
    setErr("");
    if (mode === "servicio" && !svc.technician.trim()) return setErr("Escribe el nombre del técnico");
    if (mode === "servicio" && !svc.detail.trim()) return setErr("Escribe el detalle del servicio");
    if (mode === "accesorio" && !acc?.name.trim()) return setErr("Escribe el nombre del accesorio");
    if (mode === "accesorio" && !acc?.category) return setErr("Elige la categoría (cargador, cable, audífonos, funda u otro)");
    if (manual && !fields.model?.trim()) return setErr("Escribe el modelo del equipo");
    if (late && !saleDate) return setErr("Indica la fecha en que se hizo la venta");
    if (!(total > 0)) return setErr("Ingresa el monto de la venta");
    if (!single && Math.abs(remaining) > 0.009) return setErr(`Faltan S/ ${remaining.toFixed(2)} por asignar a un medio de pago`);
    setConfirm(true);
  }

  async function submit() {
    setBusy(true);
    try {
      const edits: Record<string, string | null> = {};
      changes.forEach((k) => (edits[k] = fields[k] === "" ? null : fields[k]));
      const r = await api<{ id: number }>("/api/sales", {
        body: {
          product_id: p?.id, price: total, qty, edits, customer_name: customer, phone, dni, late, sale_date: late ? saleDate : undefined,
          manual: manual ? { ...fields, store_id: mStore } : undefined,
          accessory: acc ? { name: accessoryName(acc), detail: acc.detail.trim(), store_id: mStore, category: acc.category } : undefined,
          service: isSvc ? { technician: svc.technician.trim(), detail: svc.detail.trim(), store_id: mStore } : undefined,
          payments: payList,
        },
      });
      setConfirm(false);
      setSuccess(true);
      await new Promise((res) => setTimeout(res, 1900));
      router.push(`/recibo/${r.id}?nueva=1`);
    } catch (e) {
      setErr((e as Error).message);
      setConfirm(false);
      setBusy(false);
    }
  }

  const inAlmacen = !!p && p.store_id === 0;
  const otherStore = p && (inAlmacen || (user.role === "seller" && p.store_id !== user.store_id));
  const bc = manual ? "#475569" : brandColor(p?.brand);
  const inputCls = (k: string) => `input ${changes.includes(k) ? "!border-amber-400 !bg-amber-50" : ""}`;

  return (
    <div className="stagger mx-auto max-w-2xl space-y-4">
      {late && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <div><b>Venta fuera de tiempo.</b> Úsala si olvidaste registrar una venta. Quedará <b>pendiente</b>: el administrador la revisa y, si la aprueba, recién se descuenta del stock.</div>
        </div>
      )}

      {late && (
        <div className="card p-4">
          <label className="label">¿Qué día se hizo la venta?</label>
          <input type="date" max={limaToday()} className="input" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
        </div>
      )}

      {mode === null && (
        <div className="anim-pop">
          <p className="mb-3 text-center text-sm font-semibold text-slate-500">¿Qué vas a vender?</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              { m: "celular", label: "Celulares", sub: "Por código interno o IMEI", icon: Smartphone, c: "from-blue-900 to-sky-600" },
              { m: "accesorio", label: "Accesorios", sub: "Cargadores, cables, vidrios, hidrogel…", icon: Headphones, c: "from-emerald-700 to-teal-500" },
              { m: "servicio", label: "Servicio técnico", sub: "Reparaciones y revisiones", icon: Wrench, c: "from-amber-600 to-orange-500" },
            ] as const).map(({ m, label, sub, icon: I, c }) => (
              <button key={m} type="button" onClick={() => chooseMode(m)}
                className={`lift group flex min-h-44 flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br ${c} p-6 text-center text-white shadow-lg active:scale-[0.98]`}>
                <span className="rounded-2xl bg-white/20 p-4 transition group-hover:bg-white/30"><I className="h-12 w-12" /></span>
                <span className="text-2xl font-extrabold">{label}</span>
                <span className="flex items-center gap-1 text-sm font-medium opacity-90">{sub} <ChevronRight className="h-4 w-4" /></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode !== null && !hasItem && (
        <button type="button" onClick={backToChoice} className="btn-ghost !py-1.5 text-xs"><ArrowLeft className="h-3.5 w-3.5" /> Cambiar (celulares / accesorios)</button>
      )}

      {/* 1b. Accesorio */}
      {mode === "accesorio" && (
        <div className="card p-4 sm:p-5">
          <label className="label !mb-3">1 · Datos del accesorio</label>
          <SimpleAccessory onChange={setAcc} />
          {acc && user.role === "admin" && cat && (
            <div className="mt-3"><label className="label">Tienda</label>
              <select className="input" value={mStore} onChange={(e) => setMStore(Number(e.target.value))}>{cat.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          )}
          {acc && <button type="button" onClick={backToChoice} className="mt-3 text-xs font-semibold text-slate-400 hover:text-brand-600">← Cambiar (celulares / accesorios)</button>}
        </div>
      )}

      {/* 1c. Servicio técnico */}
      {mode === "servicio" && (
        <div className="card p-4 sm:p-5">
          <label className="label !mb-3">1 · Servicio técnico</label>
          <ServiceFields onChange={setSvc} />
          {svcReady && user.role === "admin" && cat && (
            <div className="mt-3"><label className="label">Tienda</label>
              <select className="input" value={mStore} onChange={(e) => setMStore(Number(e.target.value))}>{cat.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          )}
          {svcReady && <button type="button" onClick={backToChoice} className="mt-3 text-xs font-semibold text-slate-400 hover:text-brand-600">← Cambiar (celulares / accesorios / servicio)</button>}
        </div>
      )}

      {/* 1. Equipo */}
      {mode === "celular" && (
      <div className="card p-4 sm:p-5">
        <label className="label">1 · Celular (código interno o IMEI)</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
            <input ref={codeRef} className="input !py-3.5 pl-11 font-mono text-2xl tracking-wider" placeholder="Ej. 512" value={code}
              inputMode="none" autoComplete="off" enterKeyHint="search"
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setSearched(false); }} onKeyDown={(e) => e.key === "Enter" && search()} />
          </div>
          <button onClick={() => setCam(true)} className="btn-soft" title="Escanear con la cámara"><Camera className="h-5 w-5" /></button>
        </div>
        {searched && !p && matches.length === 0 && (
          <div className="anim-pop mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <span className="text-slate-600">No encontré “{code}” en el stock. Puede ser que el código o el IMEI no coincida.</span>
            <button onClick={startManual} className="btn-primary !py-2"><PencilLine className="h-4 w-4" /> Registrar el equipo manualmente</button>
          </div>
        )}
        {matches.length > 1 && (
          <ul className="anim-pop mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {matches.map((m) => (
              <li key={m.id}><button onClick={() => select(m)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                <span className="font-semibold">{m.model} <span className="text-xs font-normal text-slate-500">{specLabel(m.ram, m.storage)} {m.color}</span></span>
                <span className="text-xs text-slate-400">Cód. {m.code ?? "—"} · {m.store_name}</span></button></li>
            ))}
          </ul>
        )}
        {!hasItem && <NumPad value={code} onChange={(v) => { setCode(v); setSearched(false); }} onEnter={() => search()} />}
        {!hasItem && !searched && (
          <button onClick={startManual} className="mt-3 text-xs font-semibold text-slate-400 hover:text-brand-600">¿No tiene código? Ingresar el equipo manualmente</button>
        )}
      </div>
      )}

      {hasItem && (
        <>
          {(p || manual) && <div className="card anim-pop overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 text-white" style={{ background: bc }}>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase opacity-80">{manual ? "Equipo manual · no está en stock" : `${p?.brand ?? "Equipo"} · Cód. ${p?.code ?? "—"}`}</div>
                <div className="truncate text-xl font-extrabold">{fields.model || "Nuevo equipo"}</div>
              </div>
              <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{manual ? cat?.stores.find((s) => s.id === mStore)?.name : p?.store_name}</span>
            </div>
            {otherStore && (
              <div className="flex flex-wrap items-center gap-3 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                {inAlmacen ? <span>Este equipo pertenece a <b>Almacén</b>. Transfiérelo para poder venderlo.</span> : <span>Este equipo está en <b>{p?.store_name}</b>, no en tu tienda.</span>}
                {user.store_id
                  ? <button onClick={() => transfer()} className="btn-primary ml-auto !py-1.5"><ArrowLeftRight className="h-4 w-4" /> {inAlmacen ? "Transferir a" : "Traer a"} {cat?.stores.find((s) => s.id === user.store_id)?.name ?? "mi tienda"}</button>
                  : <span className="ml-auto flex flex-wrap gap-2">{cat?.stores.map((s) => <button key={s.id} onClick={() => transfer(s.id)} className="btn-primary !py-1.5"><ArrowLeftRight className="h-4 w-4" /> Transferir a {s.name}</button>)}</span>}
              </div>
            )}
            <div className="p-4">
              {!editing ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  {p?.kind === "celular" && <Item k="RAM" v={fields.ram ? `${fields.ram} GB` : "—"} />}
                  {p?.kind === "celular" && <Item k="Almacenamiento" v={fields.storage ? `${fields.storage} GB` : "—"} />}
                  <Item k="Color" v={fields.color || "—"} />
                  {p?.kind === "celular" && <Item k="Estado" v={boxLabel(fields.condition)} />}
                  {p?.kind === "celular" ? <><Item k="IMEI 1" v={fields.imei1 || "—"} mono /><Item k="IMEI 2" v={fields.imei2 || "—"} mono /></> : <Item k="Identificación" v={p?.ident ?? "—"} mono />}
                </dl>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><label className="label">Modelo</label>
                    <input className={inputCls("model")} list="models-list" value={fields.model ?? ""} onChange={(e) => setFields({ ...fields, model: e.target.value })} placeholder="Ej. Samsung A15" />
                    <datalist id="models-list">{cat?.models.map((m) => <option key={m.name} value={m.name} />)}</datalist></div>
                  {(manual || p?.kind === "celular") && <>
                    <div><label className="label">RAM (GB)</label><input className={inputCls("ram")} inputMode="numeric" value={fields.ram ?? ""} onChange={(e) => setFields({ ...fields, ram: e.target.value })} /></div>
                    <div><label className="label">Almacenamiento (GB)</label><input className={inputCls("storage")} inputMode="numeric" value={fields.storage ?? ""} onChange={(e) => setFields({ ...fields, storage: e.target.value })} /></div>
                  </>}
                  <div><label className="label">Color</label><input className={inputCls("color")} list="colors-list" value={fields.color ?? ""} onChange={(e) => setFields({ ...fields, color: e.target.value })} />
                    <datalist id="colors-list">{cat?.colors.map((c) => <option key={c.name} value={c.name} />)}</datalist></div>
                  {(manual || p?.kind === "celular") && <>
                    <div><label className="label">Caja</label><select className={inputCls("condition")} value={fields.condition ?? ""} onChange={(e) => setFields({ ...fields, condition: e.target.value })}><option value="">—</option><option value="Sellado">Caja sellada</option><option value="Abierto">Caja abierta</option></select></div>
                    <div><label className="label">IMEI 1</label><input className={inputCls("imei1")} inputMode="numeric" value={fields.imei1 ?? ""} onChange={(e) => setFields({ ...fields, imei1: e.target.value })} /></div>
                    <div><label className="label">IMEI 2</label><input className={inputCls("imei2")} inputMode="numeric" value={fields.imei2 ?? ""} onChange={(e) => setFields({ ...fields, imei2: e.target.value })} /></div>
                  </>}
                  {manual && <div><label className="label">Código interno (opcional)</label><input className="input" value={fields.code ?? ""} onChange={(e) => setFields({ ...fields, code: e.target.value })} /></div>}
                  {manual && user.role === "admin" && cat && <div><label className="label">Tienda</label><select className="input" value={mStore} onChange={(e) => setMStore(Number(e.target.value))}>{cat.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
                </div>
              )}
              {!manual && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button onClick={() => setEditing(!editing)} className="btn-ghost !py-1.5 text-xs"><PencilLine className="h-3.5 w-3.5" /> {editing ? "Listo" : "Corregir datos"}</button>
                  {changes.length > 0 && <span className="text-xs font-semibold text-amber-700">Corregiste {changes.length} dato(s): se avisará al administrador.</span>}
                </div>
              )}
              {manual && <p className="mt-3 text-xs text-slate-500">Este equipo no se descuenta del stock porque no está registrado. El administrador recibirá un aviso.</p>}
            </div>
          </div>}

          {/* 2. Cobro */}
          <div className="card anim-pop space-y-4 p-4 sm:p-5">
            <div className="label !mb-0">2 · Cobro</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Monto de la venta (S/)</label>
                <input type="number" inputMode="decimal" className="input !py-3.5 text-2xl font-extrabold" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                {p?.price_suggested ? <button onClick={() => setPrice(String(p.price_suggested))} className="mt-1 text-xs font-semibold text-brand-600">Precio sugerido: {soles(p.price_suggested)}</button> : null}
              </div>
              {((p?.kind === "accesorio" && p.qty > 1) || acc) && (
                <div><label className="label">Cantidad{p ? ` (hay ${p.qty})` : ""}</label>
                  <div className="flex items-center gap-2"><button className="btn-ghost !px-3" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button><span className="w-10 text-center text-xl font-bold">{qty}</span><button className="btn-ghost !px-3" onClick={() => setQty(p ? Math.min(p.qty, qty + 1) : Math.min(99, qty + 1))}><Plus className="h-4 w-4" /></button></div></div>
              )}
            </div>
            <div>
              <label className="label">Medio de pago</label>
              {single ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {METHODS.map((m) => <button key={m} type="button" onClick={() => setMethod(m)} className={`chip !px-3 !py-2 text-sm ${method === m ? "chip-on" : ""}`}>{m}</button>)}
                  </div>
                  <button type="button" onClick={() => { setSplit(true); setAmt({}); }} className="mt-3 text-sm font-semibold text-brand-600">Pagó con dos medios (ej. efectivo + Yape)</button>
                </>
              ) : (
                <div className="anim-pop space-y-2.5">
                  <p className="text-xs text-slate-500">Escribe cuánto pagó en cada medio. El otro se completa solo.</p>
                  {(moreM ? METHODS : ["Efectivo", "Yape"]).map((m) => (
                    <label key={m} className="flex items-center gap-3">
                      <span className="w-32 text-sm font-semibold">{m}</span>
                      <div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">S/</span>
                        <input type="number" inputMode="decimal" className="input !py-3 pl-9 text-lg font-bold" placeholder="0.00" value={amt[m] ?? ""} onChange={(e) => setAmtFor(m, e.target.value)} /></div>
                    </label>
                  ))}
                  <p className={`text-sm font-semibold ${Math.abs(remaining) < 0.01 ? "text-emerald-600" : "text-rose-600"}`}>{Math.abs(remaining) < 0.01 ? "Pagos completos ✓" : remaining > 0 ? `Faltan ${soles(remaining)}` : `Sobran ${soles(-remaining)}`}</p>
                  <div className="flex gap-4 text-xs font-semibold text-brand-600">
                    {!moreM && <button type="button" onClick={() => setMoreM(true)}>Otro medio (tarjeta, Plin…)</button>}
                    <button type="button" onClick={resetPay}>Un solo medio</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Cliente */}
          <div className="card anim-pop space-y-3 p-4 sm:p-5">
            <div className="label !mb-0">3 · Cliente (opcional)</div>
            <input className="input" placeholder="Nombre del cliente" value={customer} onChange={(e) => setCustomer(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" inputMode="tel" placeholder="Celular" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <input className="input" inputMode="numeric" placeholder="DNI" value={dni} onChange={(e) => setDni(e.target.value)} />
            </div>
          </div>

          {err && <p className="anim-pop rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{err}</p>}
          <button disabled={busy || !!otherStore} onClick={review} className="btn-primary w-full py-4 text-base">
            <ShoppingCart className="h-5 w-5" /> {late ? "Revisar y enviar para aprobación" : "Revisar y registrar venta"} · {soles(total)}
          </button>
        </>
      )}
      {!hasItem && err && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{err}</p>}

      {confirm && mounted && createPortal(
        <div className="anim-fade fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-slate-900/60 px-3 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="anim-sheet mx-auto mt-2 w-full max-w-lg rounded-3xl bg-white p-4 shadow-2xl sm:mt-[6dvh] sm:p-5">
            <h3 className="text-xl font-extrabold">{late ? "Confirma la venta fuera de tiempo" : "Confirma la venta"}</h3>
            <p className="text-sm text-slate-500">{late ? "Quedará pendiente hasta que el administrador la apruebe." : "Revisa los datos antes de registrar. Después no se puede editar."}</p>
            <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
              {late && <div className="font-semibold text-amber-800">Fecha de la venta: {saleDate.split("-").reverse().join("/")}</div>}
              <div><div className="text-lg font-extrabold">{itemName}</div>
                {!acc && !isSvc && <div className="text-slate-600">{[specLabel(Number(fields.ram) || null, Number(fields.storage) || null), fields.color, !isAcc ? boxLabel(fields.condition) : ""].filter((x) => x && x !== "—").join(" · ")}</div>}</div>
              {acc || isSvc ? null : (!isAcc) ?<div className="font-mono text-xs text-slate-600">IMEI 1: {fields.imei1 || "—"}{fields.imei2 ? <><br />IMEI 2: {fields.imei2}</> : null}</div> : p?.ident ? <div className="font-mono text-xs text-slate-600">Cód.: {p.ident}</div> : null}
              <div className="text-xs text-slate-500">{isSvc ? `Servicio técnico · Técnico: ${svc.technician.trim()}` : acc ? "Accesorio" : manual ? `Equipo no registrado en stock${fields.code ? ` · cód. ${fields.code}` : ""}` : `Cód. interno ${p?.code ?? "—"}`} · {store?.name}{isAcc && qty > 1 ? ` · ${qty} unidades` : ""}</div>
              <hr className="border-slate-200" />
              <div className="flex items-end justify-between"><span className="font-semibold">Total a cobrar</span><span className="text-2xl font-extrabold">{soles(total)}</span></div>
              <div className="text-slate-600">{payList.map((x, i) => <div key={i} className="flex justify-between"><span>{x.method}</span><span>{soles(x.amount)}</span></div>)}</div>
              <hr className="border-slate-200" />
              <div className="text-slate-600"><b>Cliente:</b> {customer || "Cliente varios"}{dni ? ` · DNI ${dni}` : ""}{phone ? ` · Cel. ${phone}` : ""}</div>
              {changes.length > 0 && <div className="rounded-lg bg-amber-100 p-2 text-xs font-semibold text-amber-900">Corregiste: {changes.map((k) => `${k}: ${(p as unknown as Record<string, unknown>)[k] ?? "—"} → ${fields[k] || "—"}`).join(", ")}. Se avisará al administrador.</div>}
            </div>
            <p className="mt-4 text-center font-bold">¿Estás segura de registrar esta venta?</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button disabled={busy} onClick={() => setConfirm(false)} className="btn-ghost py-3">No, volver</button>
              <button disabled={busy} onClick={submit} className="btn-primary py-3">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Sí, registrar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {success && mounted && createPortal(<SaleSuccess />, document.body)}
      {cam && <BarcodeScanner onClose={() => setCam(false)} onScan={(c) => { setCode(c); search(c); }} />}
    </div>
  );
}

function Item({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return <div><dt className="text-[11px] font-bold uppercase text-slate-400">{k}</dt><dd className={`font-semibold ${mono ? "font-mono text-xs" : ""}`}>{v}</dd></div>;
}
