"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, CheckCircle2, Loader2, Plus, Save, ScanLine, Smartphone, Headphones, X } from "lucide-react";
import { api, type CatalogModel } from "@/lib/client";
import { ACCESSORY_TYPES } from "@/lib/catalog";
import { limaToday, storageLabel } from "@/lib/format";
import { useCatalog } from "./useCatalog";
import BarcodeScanner from "./BarcodeScanner";

const RAMS = [0, 1, 2, 3, 4, 6, 8, 12, 16];
const STORAGES = [0, 8, 16, 32, 64, 128, 256, 512, 1024];

type Conflict = { model: string; store_name: string; code?: string | null } | null;

export default function StockForm() {
  const { cat, reload, brandColor } = useCatalog();
  const [kind, setKind] = useState<"celular" | "accesorio">("celular");
  const [store, setStore] = useState(1);
  const [date, setDate] = useState(limaToday());
  const [editDate, setEditDate] = useState(false);
  const [model, setModel] = useState("");
  const [brand, setBrand] = useState("");
  const [ram, setRam] = useState(4);
  const [storage, setStorage] = useState(128);
  const [color, setColor] = useState("");
  const [newColor, setNewColor] = useState("");
  const [condition, setCondition] = useState("Sellado");
  const [imeis, setImeis] = useState<string[]>([]);
  const [primary, setPrimary] = useState(0);
  const [scanText, setScanText] = useState("");
  const [scanMsg, setScanMsg] = useState("");
  const [ident, setIdent] = useState("");
  const [qty, setQty] = useState(1);
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [showBuy, setShowBuy] = useState(false);
  const [cam, setCam] = useState(false);
  const [codeConflict, setCodeConflict] = useState<Conflict>(null);
  const [imeiConflict, setImeiConflict] = useState<Conflict>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ label: string; code: string; store: number }[]>([]);
  const scanRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);

  const imei1 = imeis[primary] ?? "";
  const imei2 = imeis.find((_, i) => i !== primary) ?? "";

  // Aviso de duplicados (código interno / IMEI) mientras se escribe
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!code && !imeis.length) { setCodeConflict(null); setImeiConflict(null); return; }
      try {
        const qs = new URLSearchParams({ code, imei1, imei2 });
        const r = await api<{ code: Conflict; imei: Conflict }>(`/api/check?${qs}`);
        setCodeConflict(r.code);
        setImeiConflict(r.imei);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [code, imei1, imei2, imeis.length]);

  function addScan(raw: string) {
    const v = raw.trim().replace(/\s+/g, "");
    if (!v) return;
    if (!/^\d{14,16}$/.test(v)) { setScanMsg(`"${v}" no parece un IMEI (15 dígitos), se ignoró.`); return; }
    setScanMsg("");
    setImeis((p) => (p.includes(v) ? p : [...p, v].slice(0, 4)));
  }

  function pickModel(m: CatalogModel) {
    setModel(m.name); setBrand(m.brand); setRam(m.def_ram); setStorage(m.def_storage);
    setTimeout(() => scanRef.current?.focus(), 50);
  }

  const known = useMemo(() => cat?.models.find((m) => m.name.toLowerCase() === model.trim().toLowerCase()), [cat, model]);
  const inferBrand = (name: string) => cat?.brands.find((b) => name.toLowerCase().startsWith(b.name.toLowerCase() + " "))?.name ?? "";

  async function saveModel() {
    const b = brand || inferBrand(model) || model.trim().split(" ")[0];
    await api("/api/catalog", { body: { name: model.trim(), brand: b, ram, storage } });
    setBrand(b);
    await reload();
  }

  async function addColor() {
    const n = newColor.trim();
    if (!n) return;
    await api("/api/catalog", { body: { type: "color", name: n } });
    await reload();
    setColor(n);
    setNewColor("");
  }

  async function save(another: boolean) {
    setErr("");
    if (!model.trim()) return setErr("Escribe o elige el modelo");
    if (kind === "celular" && !imei1) return setErr("Escanea o escribe el IMEI del equipo");
    setBusy(true);
    try {
      await api("/api/products", {
        body: {
          kind, store_id: store, entry_date: date, model: model.trim(), brand: brand || inferBrand(model) || null, imei1, imei2, ident, qty,
          ram, storage, color, condition: kind === "celular" ? condition : null, code, price_suggested: price, cost, supplier,
        },
      });
      setSaved((s) => [{ label: `${model.trim()}${kind === "celular" ? ` · ${ram ? ram + "GB/" : ""}${storageLabel(storage)}` : ""}`, code, store }, ...s].slice(0, 8));
      setImeis([]); setPrimary(0); setIdent(""); setCode(""); setScanMsg("");
      if (!another) { setModel(""); setBrand(""); setPrice(""); setCost(""); setSupplier(""); setColor(""); setQty(1); }
      setTimeout(() => (another && kind === "celular" ? scanRef : modelRef).current?.focus(), 50);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!cat) return <div className="p-10 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  const storeObj = cat.stores.find((s) => s.id === store)!;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        {/* Tipo + tienda + fecha */}
        <div className="card space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3">
            {([["celular", "Celulares", Smartphone], ["accesorio", "Accesorios", Headphones]] as const).map(([k, l, I]) => (
              <button key={k} onClick={() => { setKind(k); setErr(""); }} className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-base font-bold transition ${kind === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                <I className="h-5 w-5" /> {l}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-2 gap-2">
              {cat.stores.map((s) => (
                <button key={s.id} onClick={() => setStore(s.id)} style={store === s.id ? { borderColor: s.color, background: s.color + "14", color: s.color } : undefined}
                  className="rounded-xl border-2 border-slate-200 px-3 py-2.5 text-left text-sm font-bold text-slate-500">
                  <span className="block text-[10px] font-semibold uppercase opacity-70">{s.short}</span>{s.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {editDate ? (
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              ) : (
                <>Ingreso: <b>{date.split("-").reverse().join("/")}</b> <button className="text-xs font-semibold text-brand-600 underline" onClick={() => setEditDate(true)}>cambiar</button></>
              )}
            </div>
          </div>
        </div>

        {/* Modelo */}
        <div className="card space-y-4 p-4 sm:p-5">
          <div>
            <label className="label">{kind === "celular" ? "Modelo" : "Producto"}</label>
            {kind === "celular" ? (
              <ModelCombo inputRef={modelRef} value={model} models={cat.models} onType={setModel} onPick={pickModel} canSave={!!model.trim() && !known} onSave={saveModel}
                brand={brand || inferBrand(model)} onBrand={setBrand} brands={cat.brands.map((b) => b.name)} />
            ) : (
              <>
                <input ref={modelRef} className="input" list="acc-types" placeholder="Ej. Cargador 20W, Audífonos, Mica..." value={model} onChange={(e) => setModel(e.target.value)} />
                <datalist id="acc-types">{ACCESSORY_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
              </>
            )}
          </div>

          {kind === "celular" ? (
            <>
              {/* IMEI */}
              <div>
                <label className="label">IMEI — escanea con la pistola</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
                    <input ref={scanRef} inputMode="numeric" className="input pl-10 font-mono tracking-wider" placeholder="Escanea el código de barras (o escribe y Enter)"
                      value={scanText} onChange={(e) => setScanText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addScan(scanText); setScanText(""); } }}
                      onBlur={() => { if (scanText.trim().length >= 14) { addScan(scanText); setScanText(""); } }} />
                  </div>
                  <button type="button" onClick={() => setCam(true)} className="btn-soft" title="Escanear con la cámara"><Camera className="h-4 w-4" /><span className="hidden sm:inline">Cámara</span></button>
                </div>
                {scanMsg && <p className="mt-1.5 text-xs text-amber-600">{scanMsg}</p>}
                {imeis.length > 0 && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {imeis.map((v, i) => (
                      <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm ${i === primary ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}>
                        <input type="radio" checked={i === primary} onChange={() => setPrimary(i)} className="accent-blue-600" />
                        <span className="font-mono">{v}</span>
                        <span className="ml-auto text-[10px] font-bold uppercase text-slate-500">{i === primary ? "IMEI 1" : "IMEI 2"}</span>
                        <button type="button" onClick={() => { setImeis(imeis.filter((x) => x !== v)); setPrimary(0); }} className="text-slate-400 hover:text-rose-500"><X className="h-4 w-4" /></button>
                      </label>
                    ))}
                  </div>
                )}
                {imeis.length > 1 && <p className="mt-1.5 text-xs text-slate-500">Se detectaron dos IMEI. El marcado como IMEI 1 será el principal; toca el otro para cambiarlo.</p>}
                {imeiConflict && <ConflictBanner text={`Ese IMEI ya está en stock: ${imeiConflict.model} (cód. ${imeiConflict.code ?? "—"}) — ${imeiConflict.store_name}`} />}
              </div>

              <Chips label="RAM" value={ram} options={RAMS} render={(r) => (r === 0 ? "Sin RAM" : `${r} GB`)} onChange={setRam} />
              <Chips label="Almacenamiento" value={storage} options={STORAGES} render={(s) => (s === 0 ? "Ninguno" : storageLabel(s))} onChange={setStorage} />
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div>
                <label className="label">Código de identificación (escanea o escribe)</label>
                <input className="input font-mono" value={ident} onChange={(e) => setIdent(e.target.value)} placeholder="Código de barras / QR" />
              </div>
              <div>
                <label className="label">Cantidad</label>
                <input type="number" min={1} className="input" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {cat.colors.map((c) => (
                <button key={c.name} type="button" onClick={() => setColor(color === c.name ? "" : c.name)} className={`chip ${color === c.name ? "chip-on" : ""}`}>
                  <span className="h-3.5 w-3.5 rounded-full border border-slate-300" style={{ background: c.hex }} /> {c.name}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input className="input !w-32 !py-2" placeholder="Otro color" value={newColor} onChange={(e) => setNewColor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())} />
                <button type="button" onClick={addColor} className="btn-soft !px-3 !py-2" title="Agregar color"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {kind === "celular" && (
            <div>
              <label className="label">Estado de la caja</label>
              <div className="flex gap-2">
                {["Sellado", "Abierto"].map((c) => <button key={c} type="button" onClick={() => setCondition(c)} className={`chip flex-1 ${condition === c ? "chip-on" : ""}`}>{c === "Sellado" ? "Caja sellada" : "Caja abierta"}</button>)}
              </div>
            </div>
          )}
        </div>

        {/* Código interno y precios */}
        <div className="card space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Código interno de almacén</label>
              <input className={`input font-mono text-lg ${codeConflict ? "!border-rose-400 !ring-rose-100" : ""}`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej. 512" />
              {codeConflict && <ConflictBanner text={`El código ${code} ya está tomado: ${codeConflict.model} en ${codeConflict.store_name}`} />}
            </div>
            <div>
              <label className="label">Precio sugerido de venta (S/)</label>
              <input type="number" inputMode="decimal" className="input text-lg" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <button type="button" onClick={() => setShowBuy(!showBuy)} className="text-xs font-semibold text-brand-600 underline">{showBuy ? "Ocultar" : "Agregar"} datos de compra (precio de compra y proveedor)</button>
          {showBuy && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Precio de compra (S/)</label><input type="number" inputMode="decimal" className="input" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
              <div><label className="label">Proveedor</label><input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
            </div>
          )}
        </div>

        {err && <p className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700"><AlertTriangle className="h-4 w-4 shrink-0" /> {err}</p>}
        <div className="sticky bottom-20 z-10 flex flex-col gap-2 rounded-2xl bg-white/90 p-2 shadow-lg backdrop-blur sm:flex-row lg:bottom-4">
          <button disabled={busy} onClick={() => save(true)} className="btn-primary flex-1 py-3.5 text-base">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />} Guardar y agregar otro</button>
          <button disabled={busy} onClick={() => save(false)} className="btn-ghost py-3.5"><Check className="h-4 w-4" /> Guardar y limpiar</button>
        </div>
      </div>

      {/* Panel lateral */}
      <aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Se guardará en</div>
          <div className="mt-1 text-lg font-extrabold" style={{ color: storeObj.color }}>{storeObj.name}</div>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Ingresados en esta sesión</div>
          {saved.length === 0 ? <p className="text-sm text-slate-400">Aún no has guardado equipos.</p> : (
            <ul className="space-y-2">
              {saved.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="min-w-0 flex-1 truncate font-medium" style={{ color: brandColor(s.label.split(" ")[0]) }}>{s.label}</span>
                  {s.code && <span className="rounded bg-slate-100 px-1.5 font-mono text-xs">{s.code}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {cam && <BarcodeScanner continuous={kind === "celular"} onClose={() => setCam(false)} onScan={(c) => (kind === "celular" ? addScan(c) : setIdent(c))} />}
    </div>
  );
}

function ConflictBanner({ text }: { text: string }) {
  return <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {text}</p>;
}

function Chips({ label, value, options, render, onChange }: { label: string; value: number; options: number[]; render: (n: number) => string; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => <button key={o} type="button" onClick={() => onChange(o)} className={`chip ${value === o ? "chip-on" : ""}`}>{render(o)}</button>)}
      </div>
    </div>
  );
}

function ModelCombo({ value, models, onType, onPick, canSave, onSave, brand, onBrand, brands, inputRef }: {
  value: string; models: CatalogModel[]; onType: (v: string) => void; onPick: (m: CatalogModel) => void; canSave: boolean; onSave: () => Promise<void>;
  brand: string; onBrand: (b: string) => void; brands: string[]; inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [saving, setSaving] = useState(false);
  const results = useMemo(() => {
    const toks = value.toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    return models.filter((m) => toks.every((t) => m.name.toLowerCase().includes(t))).slice(0, 8);
  }, [value, models]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input ref={inputRef} className="input text-lg font-semibold" placeholder="Escribe: sa, honor, redmi..." value={value} autoComplete="off"
            onChange={(e) => { onType(e.target.value); setOpen(true); setHi(0); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (!open || !results.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); onPick(results[hi]); setOpen(false); }
            }} />
          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
              {results.map((m, i) => (
                <li key={m.name}>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); onPick(m); setOpen(false); }} onMouseEnter={() => setHi(i)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${i === hi ? "bg-brand-50" : ""}`}>
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-xs text-slate-400">{m.def_ram ? `${m.def_ram}/` : ""}{m.def_storage ? `${m.def_storage}GB` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {canSave && (
          <button type="button" title="Guardar este modelo en el catálogo" disabled={saving} onClick={async () => { setSaving(true); await onSave(); setSaving(false); }} className="btn-soft !px-3.5">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          </button>
        )}
      </div>
      {canSave && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          Modelo nuevo — marca:
          <input list="brand-list" className="input !w-40 !py-1.5" value={brand} onChange={(e) => onBrand(e.target.value)} placeholder="Marca" />
          <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
          <span>pulsa el disquete para guardarlo.</span>
        </div>
      )}
    </div>
  );
}
