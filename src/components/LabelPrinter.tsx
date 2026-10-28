"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { ArrowLeft, Barcode, Check, Plus, Printer, QrCode, Search, Tag } from "lucide-react";
import { api } from "@/lib/client";
import { soles } from "@/lib/format";

type P = { id: number; kind: string; model: string; brand: string | null; code: string | null; ident: string | null; imei1: string | null; price_suggested: number | null; store_name: string; qty: number };
type Mode = "qr" | "bar";
type Step = "inicio" | "producto" | "imprimir";

const SIZES: Record<string, { label: string; w: number; h: number; sheet?: boolean }> = {
  "58x40": { label: "NES D58 · 58 × 40 mm (rollo)", w: 58, h: 40 },
  "58x30": { label: "NES D58 · 58 × 30 mm (rollo)", w: 58, h: 30 },
  "58x25": { label: "NES D58 · 58 × 25 mm (rollo)", w: 58, h: 25 },
  "40x30": { label: "Etiqueta 40 × 30 mm (rollo)", w: 40, h: 30 },
  "50x30": { label: "Etiqueta 50 × 30 mm (rollo)", w: 50, h: 30 },
  "40x25": { label: "Etiqueta 40 × 25 mm (rollo)", w: 40, h: 25 },
  "70x40": { label: "Etiqueta 70 × 40 mm (rollo)", w: 70, h: 40 },
  a4: { label: "Hoja A4 (varias por hoja)", w: 63, h: 38, sheet: true },
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Imprime solo las etiquetas (iframe aparte) con el tamaño exacto del papel: una página por etiqueta, sin hojas en blanco. */
async function printLabels(o: { value: string; name: string; mode: Mode; copies: number; w: number; h: number; sheet?: boolean; price: string; codeH: number }) {
  let codeHtml = "";
  if (o.mode === "qr") {
    const url = await QRCode.toDataURL(o.value, { margin: 0, width: 400, errorCorrectionLevel: "M" });
    codeHtml = `<img src="${url}" style="width:${o.codeH}mm;height:${o.codeH}mm;flex:none">`;
  } else {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, o.value, { format: "CODE128", displayValue: true, height: 40, margin: 0, fontSize: 14 });
    svg.setAttribute("style", `max-height:${o.codeH}mm;width:100%`);
    codeHtml = svg.outerHTML;
  }
  const one = `<div class="l">${codeHtml}<div class="t"><div class="n">${esc(o.name || "—")}</div>${o.mode === "qr" ? `<div class="c">${esc(o.value)}</div>` : ""}${o.price ? `<div class="p">${esc(o.price)}</div>` : ""}</div></div>`;
  const css = `@page{size:${o.sheet ? "A4" : `${o.w}mm ${o.h}mm`};margin:${o.sheet ? "8mm" : "0"}}
html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Arial,Helvetica,sans-serif;color:#000;${o.sheet ? "display:flex;flex-wrap:wrap;gap:2mm" : ""}}
.l{box-sizing:border-box;width:${o.w}mm;height:${o.h}mm;padding:1.5mm 2mm;overflow:hidden;display:flex;align-items:center;gap:2mm;${o.sheet ? "" : "break-after:page;page-break-after:always;"}}
.l:last-child{break-after:auto;page-break-after:auto}
.t{min-width:0;flex:1;line-height:1.15}
.n{font-size:8pt;font-weight:800;text-transform:uppercase;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.c{font:6pt monospace;word-break:break-all;margin-top:.5mm}
.p{font-size:9pt;font-weight:800;margin-top:.5mm}`;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const d = frame.contentDocument!;
  d.open();
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas</title><style>${css}</style></head><body>${one.repeat(o.copies)}</body></html>`);
  d.close();
  await new Promise((r) => setTimeout(r, 300));
  const done = () => setTimeout(() => frame.remove(), 1000);
  frame.contentWindow!.addEventListener("afterprint", done);
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  setTimeout(done, 60000);
}

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
  const [step, setStep] = useState<Step>(initialId ? "imprimir" : "inicio");
  const [q, setQ] = useState("");
  const [withPhones, setWithPhones] = useState(false);
  const [manual, setManual] = useState(false);
  const [rows, setRows] = useState<P[]>([]);
  const [sel, setSel] = useState<P | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("qr");
  const [copies, setCopies] = useState(1);
  const [size, setSize] = useState("58x40");
  const [showPrice, setShowPrice] = useState(false);
  const [printing, setPrinting] = useState(false);
  useEffect(() => { try { const s = localStorage.getItem("pm_label_size"); if (s && SIZES[s]) setSize(s); } catch { /* sin almacenamiento */ } }, []);
  const chooseSize = (s: string) => { setSize(s); try { localStorage.setItem("pm_label_size", s); } catch { /* sin almacenamiento */ } };

  useEffect(() => {
    if (step !== "producto" || manual) return;
    const t = setTimeout(async () => {
      const sp = new URLSearchParams({ status: "stock" });
      if (!withPhones) sp.set("kind", "accesorio");
      if (q.trim()) sp.set("q", q.trim());
      setRows((await api<{ products: P[] }>(`/api/products?${sp}`)).products.slice(0, 40));
    }, 200);
    return () => clearTimeout(t);
  }, [q, withPhones, step, manual]);

  useEffect(() => {
    if (!initialId) return;
    api<{ products: P[] }>("/api/products?status=all").then((r) => { const f = r.products.find((x) => x.id === initialId); if (f) { setSel(f); setCopies(Math.min(f.qty || 1, 50)); } });
  }, [initialId]);

  const value = sel ? (sel.ident || sel.code || String(sel.id)) : text.trim();
  const name = sel ? sel.model : title.trim();
  const S = SIZES[size];
  const codeH = Math.min(S.h - 8, S.w / 2.4);

  function start() { setSel(null); setText(""); setTitle(""); setQ(""); setManual(false); setCopies(1); setStep("producto"); }
  function pick(r: P) { setSel(r); setCopies(Math.min(r.qty || 1, 50)); setStep("imprimir"); }

  const stepIdx = step === "producto" ? 1 : 2;

  return (
    <div className="space-y-5">
      <div className="no-print">
        <h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">Etiquetas</h1>
        <p className="text-sm text-slate-500">Imprime etiquetas con QR o código de barras para tus productos.</p>
      </div>

      {step === "inicio" && (
        <div className="no-print card mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Tag className="h-8 w-8" /></div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">¿Necesitas una etiqueta?</h2>
            <p className="mt-1 text-sm text-slate-500">Elige el producto, ajusta el tamaño y listo.</p>
          </div>
          <button onClick={start} className="btn-primary px-8 py-3.5 text-base"><Plus className="h-5 w-5" /> Crear etiqueta</button>
        </div>
      )}

      {step === "producto" && (
        <div className="no-print mx-auto max-w-2xl space-y-4">
          <Steps n={1} />
          <div className="card space-y-4 p-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">¿Para qué producto?</h2>
              <p className="text-sm text-slate-500">Búscalo en tu stock o escribe un código a mano.</p>
            </div>
            <div className="flex gap-1.5 rounded-2xl bg-slate-200/70 p-1.5">
              <button onClick={() => setManual(false)} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition ${!manual ? "bg-white text-blue-900 shadow" : "text-slate-500"}`}>Del stock</button>
              <button onClick={() => setManual(true)} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition ${manual ? "bg-white text-blue-900 shadow" : "text-slate-500"}`}>Código manual</button>
            </div>

            {!manual ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" /><input autoFocus className="input pl-9" placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                  <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="accent-blue-700" checked={withPhones} onChange={(e) => setWithPhones(e.target.checked)} /> incluir celulares</label>
                </div>
                <div className="max-h-80 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-100">
                  {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No hay productos. Prueba con otra búsqueda o usa “Código manual”.</p>}
                  {rows.map((r) => (
                    <button key={r.id} onClick={() => pick(r)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm transition hover:bg-blue-50">
                      <span className="font-semibold">{r.model}{r.qty > 1 ? <span className="ml-1 text-xs font-normal text-slate-500">× {r.qty}</span> : null}</span>
                      <span className="font-mono text-xs text-slate-500">{r.ident || r.code || "—"} · {r.store_name}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div><label className="label">Nombre en la etiqueta</label><input className="input" placeholder="Ej. Cargador 20W" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><label className="label">Código</label><input className="input font-mono" placeholder="Ej. CARG-20W" value={text} onChange={(e) => setText(e.target.value)} /></div>
                <button disabled={!text.trim()} onClick={() => { setSel(null); setStep("imprimir"); }} className="btn-primary w-full py-3">Continuar</button>
              </div>
            )}
          </div>
          <button onClick={() => setStep("inicio")} className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Cancelar</button>
        </div>
      )}

      {step === "imprimir" && (
        <>
          <div className="no-print mx-auto max-w-2xl space-y-4">
            <Steps n={2} />
            <div className="card space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase text-slate-400">Producto</div>
                  <div className="truncate text-base font-extrabold text-slate-800">{name || "—"}</div>
                  <div className="font-mono text-xs text-slate-500">{value}</div>
                </div>
                <button onClick={() => setStep("producto")} className="btn-ghost shrink-0 !py-1.5">Cambiar</button>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setMode("qr")} className={`chip flex-1 ${mode === "qr" ? "chip-on" : ""}`}><QrCode className="h-4 w-4" /> Código QR</button>
                <button onClick={() => setMode("bar")} className={`chip flex-1 ${mode === "bar" ? "chip-on" : ""}`}><Barcode className="h-4 w-4" /> Código de barras</button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Tamaño</label><select className="input" value={size} onChange={(e) => chooseSize(e.target.value)}>{Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="label">Cantidad</label><input type="number" min={1} max={200} className="input" value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} /></div>
              </div>
              {sel?.price_suggested ? <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="accent-blue-700" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Mostrar precio ({soles(sel.price_suggested)})</label> : null}

              <div>
                <div className="mb-2 text-xs font-bold uppercase text-slate-400">Así se verá</div>
                <div className="flex justify-center overflow-auto rounded-xl bg-slate-100 p-4">
                  <Preview value={value} name={name} mode={mode} w={S.w} h={S.h} codeH={codeH} price={showPrice && sel?.price_suggested ? soles(sel.price_suggested) : ""} />
                </div>
              </div>

              <button disabled={!value || printing} onClick={async () => {
                setPrinting(true);
                try { await printLabels({ value, name, mode, copies, w: S.w, h: S.h, sheet: S.sheet, price: showPrice && sel?.price_suggested ? soles(sel.price_suggested) : "", codeH }); } finally { setPrinting(false); }
              }} className="btn-primary w-full py-3.5 text-base"><Printer className="h-5 w-5" /> Imprimir {copies} etiqueta{copies > 1 ? "s" : ""}</button>
              <p className="text-xs text-slate-400">En el cuadro de impresión elige <b>NES D58</b>, márgenes “Ninguno” y escala 100 %.</p>
            </div>
            <button onClick={start} className="btn-soft"><Plus className="h-4 w-4" /> Crear otra etiqueta</button>
          </div>
        </>
      )}
    </div>
  );
}

function Steps({ n }: { n: 1 | 2 }) {
  const items = ["Producto", "Imprimir"];
  return (
    <div className="flex items-center gap-2 text-sm font-bold">
      {items.map((t, i) => {
        const done = i + 1 < n, on = i + 1 === n;
        return (
          <div key={t} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-8 bg-slate-300" />}
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${done ? "bg-emerald-500 text-white" : on ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-500"}`}>{done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className={on ? "text-slate-800" : "text-slate-400"}>{t}</span>
          </div>
        );
      })}
    </div>
  );
}

function Preview({ value, name, mode, w, h, codeH, price }: { value: string; name: string; mode: Mode; w: number; h: number; codeH: number; price: string }) {
  return (
    <div style={{ width: w + "mm", height: h + "mm" }} className="flex shrink-0 items-center gap-[2mm] overflow-hidden rounded-md border border-dashed border-slate-300 bg-white p-[2mm] text-black shadow-sm">
      <LabelCode value={value} mode={mode} h={codeH} />
      <div className="min-w-0 flex-1 text-[9px] leading-tight">
        <div className="line-clamp-3 text-[10px] font-extrabold uppercase">{name || "—"}</div>
        {mode === "qr" && <div className="mt-0.5 break-all font-mono text-[8px]">{value}</div>}
        {price ? <div className="mt-0.5 text-[11px] font-extrabold">{price}</div> : null}
      </div>
    </div>
  );
}
