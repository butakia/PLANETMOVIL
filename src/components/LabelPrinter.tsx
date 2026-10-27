"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { Barcode, Printer, QrCode, Search } from "lucide-react";
import { api } from "@/lib/client";
import { soles } from "@/lib/format";

type P = { id: number; kind: string; model: string; brand: string | null; code: string | null; ident: string | null; imei1: string | null; price_suggested: number | null; store_name: string; qty: number };
type Mode = "qr" | "bar";

const SIZES: Record<string, { label: string; w: number; h: number; sheet?: boolean }> = {
  "50x30": { label: "Etiqueta 50 × 30 mm (rollo)", w: 50, h: 30 },
  "40x25": { label: "Etiqueta 40 × 25 mm (rollo)", w: 40, h: 25 },
  "70x40": { label: "Etiqueta 70 × 40 mm (rollo)", w: 70, h: 40 },
  a4: { label: "Hoja A4 (varias por hoja)", w: 63, h: 38, sheet: true },
};

function LabelCode({ value, mode, h }: { value: string; mode: Mode; h: number }) {
  const [src, setSrc] = useState("");
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!value) return;
    if (mode === "qr") QRCode.toDataURL(value, { margin: 0, width: 300, errorCorrectionLevel: "M" }).then(setSrc).catch(() => setSrc(""));
    else if (svg.current) { try { JsBarcode(svg.current, value, { format: "CODE128", displayValue: true, height: 40, margin: 0, fontSize: 14 }); } catch { /* texto no válido */ } }
  }, [value, mode]);
  if (!value) return <div className="grid h-full place-items-center text-[9px] text-slate-300">sin código</div>;
  return mode === "qr"
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt={value} style={{ height: h + "mm", width: h + "mm" }} className="shrink-0" />
    : <svg ref={svg} style={{ maxHeight: h + "mm", width: "100%" }} />;
}

export default function LabelPrinter({ initialId }: { initialId?: number }) {
  const [q, setQ] = useState("");
  const [withPhones, setWithPhones] = useState(false);
  const [rows, setRows] = useState<P[]>([]);
  const [sel, setSel] = useState<P | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("qr");
  const [copies, setCopies] = useState(1);
  const [size, setSize] = useState("50x30");
  const [showPrice, setShowPrice] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const sp = new URLSearchParams({ status: "stock" });
      if (!withPhones) sp.set("kind", "accesorio");
      if (q.trim()) sp.set("q", q.trim());
      setRows((await api<{ products: P[] }>(`/api/products?${sp}`)).products.slice(0, 40));
    }, 200);
    return () => clearTimeout(t);
  }, [q, withPhones]);

  useEffect(() => {
    if (!initialId) return;
    api<{ products: P[] }>("/api/products?status=all").then((r) => { const f = r.products.find((x) => x.id === initialId); if (f) { setSel(f); setCopies(Math.min(f.qty || 1, 50)); } });
  }, [initialId]);

  const value = sel ? (sel.ident || sel.code || String(sel.id)) : text.trim();
  const name = sel ? sel.model : title.trim();
  const S = SIZES[size];
  const codeH = Math.min(S.h - 8, S.w / 2.4);

  return (
    <div className="stagger space-y-5">
      <div className="no-print">
        <h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">Etiquetas QR y códigos de barras</h1>
        <p className="text-sm text-slate-500">Para accesorios sin código de barras: elige el producto, imprime una etiqueta (o varias) y pégalas. Al escanearla con la pistola o la cámara, el sistema reconoce el producto.</p>
      </div>

      <div className="no-print grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="card space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" /><input className="input pl-9" placeholder="Buscar producto del stock…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="accent-blue-700" checked={withPhones} onChange={(e) => setWithPhones(e.target.checked)} /> incluir celulares</label>
          </div>
          <div className="max-h-72 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-100">
            {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No hay productos. Ingresa accesorios en “Ingresar” o escribe un código manual abajo.</p>}
            {rows.map((r) => (
              <button key={r.id} onClick={() => { setSel(r); setCopies(Math.min(r.qty || 1, 50)); }} className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-blue-50 ${sel?.id === r.id ? "bg-blue-50" : ""}`}>
                <span className="font-semibold">{r.model}{r.qty > 1 ? <span className="ml-1 text-xs font-normal text-slate-500">× {r.qty}</span> : null}</span>
                <span className="font-mono text-xs text-slate-500">{r.ident || r.code || "—"} · {r.store_name}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
            <div className="sm:col-span-2 text-xs font-bold uppercase text-slate-400">O escribe un código manual</div>
            <input className="input" placeholder="Nombre en la etiqueta" value={title} onChange={(e) => { setTitle(e.target.value); setSel(null); }} />
            <input className="input font-mono" placeholder="Código (ej. CARG-20W)" value={text} onChange={(e) => { setText(e.target.value); setSel(null); }} />
          </div>
        </div>

        <div className="card space-y-3 p-4">
          <div className="flex gap-2">
            <button onClick={() => setMode("qr")} className={`chip flex-1 ${mode === "qr" ? "chip-on" : ""}`}><QrCode className="h-4 w-4" /> Código QR</button>
            <button onClick={() => setMode("bar")} className={`chip flex-1 ${mode === "bar" ? "chip-on" : ""}`}><Barcode className="h-4 w-4" /> Código de barras</button>
          </div>
          <div><label className="label">Tamaño</label><select className="input" value={size} onChange={(e) => setSize(e.target.value)}>{Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="label">Cantidad de etiquetas</label><input type="number" min={1} max={200} className="input" value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} /></div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="accent-blue-700" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Mostrar precio sugerido</label>
          <button disabled={!value} onClick={() => window.print()} className="btn-primary w-full py-3"><Printer className="h-5 w-5" /> Imprimir {copies} etiqueta{copies > 1 ? "s" : ""}</button>
          <p className="text-xs text-slate-400">En el cuadro de impresión elige tu impresora de etiquetas o la impresora normal. Para rollos, el papel se ajusta solo al tamaño elegido.</p>
        </div>
      </div>

      <style>{`@media print { @page { ${S.sheet ? "size: A4; margin: 8mm" : `size: ${S.w}mm ${S.h}mm; margin: 0`} } }`}</style>
      <div className="no-print text-xs font-bold uppercase text-slate-400">Vista previa</div>
      <div className="print-area flex flex-wrap gap-2">
        {value ? Array.from({ length: copies }).map((_, i) => (
          <div key={i} style={{ width: S.w + "mm", height: S.h + "mm", breakAfter: S.sheet ? "auto" : "page" }} className="flex flex-col justify-between overflow-hidden rounded-md border border-dashed border-slate-300 bg-white p-[2mm] text-black print:rounded-none print:border-0">
            <div className="flex min-h-0 flex-1 items-center gap-[2mm]">
              <LabelCode value={value} mode={mode} h={codeH} />
              <div className="min-w-0 flex-1 text-[9px] leading-tight">
                <div className="line-clamp-3 text-[10px] font-extrabold uppercase">{name || "—"}</div>
                {mode === "qr" && <div className="mt-0.5 break-all font-mono text-[8px]">{value}</div>}
                {showPrice && sel?.price_suggested ? <div className="mt-0.5 text-[11px] font-extrabold">{soles(sel.price_suggested)}</div> : null}
              </div>
            </div>
          </div>
        )) : <p className="no-print text-sm text-slate-400">Elige un producto o escribe un código para ver la etiqueta.</p>}
      </div>
    </div>
  );
}
