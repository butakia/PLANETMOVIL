"use client";
import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, X } from "lucide-react";
import { api, downloadCSV } from "@/lib/client";

type Row = Record<string, string | number | null>;

const ALIASES: Record<string, string[]> = {
  model: ["modelo", "equipo", "producto", "descripcion", "nombre", "celular"],
  imei1: ["imei", "imei1", "imei 1", "email", "email1", "serie"],
  imei2: ["imei2", "imei 2", "email2", "email 2"],
  code: ["codigo", "cod", "codigo interno", "cod interno", "codigo almacen", "cod."],
  ram: ["ram"],
  storage: ["almacenamiento", "memoria", "capacidad", "rom", "gb"],
  color: ["color"],
  condition: ["caja", "estado", "estado caja", "condicion"],
  price_suggested: ["precio", "precio sugerido", "precio venta", "pvp", "p. venta"],
  cost: ["costo", "precio compra", "precio de compra", "p. compra"],
  supplier: ["proveedor"],
  store: ["tienda", "local", "sede"],
  qty: ["cantidad", "cant", "stock", "unidades"],
  entry_date: ["fecha", "fecha ingreso", "ingreso"],
  kind: ["tipo"],
  brand: ["marca"],
};
const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function parseCSV(text: string): string[][] {
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) >= (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const out: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); out.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); out.push(row); }
  return out.filter((r) => r.some((x) => x.trim()));
}

function toRows(grid: unknown[][]): Row[] {
  const header = grid[0].map(norm);
  const col: Record<string, number> = {};
  for (const [k, names] of Object.entries(ALIASES)) {
    const i = header.findIndex((h) => names.includes(h));
    if (i >= 0) col[k] = i;
  }
  return grid.slice(1).map((r) => {
    const o: Row = {};
    for (const [k, i] of Object.entries(col)) o[k] = r[i] === undefined || r[i] === null ? null : String(r[i]).trim();
    // "SAMSUNG A15 4/128GB" → separa RAM y almacenamiento si no vienen en columnas
    const m = String(o.model ?? "").match(/(\d{1,2})\s*(?:gb)?\s*[\/\-+]\s*(\d{2,4})\s*(?:gb)?/i);
    if (m) {
      if (!o.ram) o.ram = m[1];
      if (!o.storage) o.storage = m[2];
      o.model = String(o.model).replace(m[0], "").replace(/\s+/g, " ").trim();
    }
    return o;
  }).filter((o) => o.model);
}

export default function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [store, setStore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: { row: number; model: string; reason: string }[] } | null>(null);
  const [err, setErr] = useState("");

  async function onFile(f: File) {
    setErr(""); setResult(null); setFileName(f.name);
    try {
      let grid: unknown[][];
      if (/\.xlsx$/i.test(f.name)) {
        const { default: readXlsx } = await import("read-excel-file/browser");
        const sheets = (await readXlsx(f)) as unknown as { data: unknown[][] }[];
        grid = sheets[0].data;
      } else grid = parseCSV(await f.text());
      if (grid.length < 2) throw new Error("La hoja está vacía");
      const r = toRows(grid);
      if (!r.length) throw new Error("No encontré una columna de Modelo / Equipo. Revisa los títulos de la primera fila.");
      setRows(r);
    } catch (e) { setRows([]); setErr((e as Error).message || "No se pudo leer el archivo (usa .xlsx o .csv)"); }
  }

  async function run() {
    setBusy(true); setErr("");
    try { setResult(await api("/api/products/import", { body: { rows, store_id: store } })); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[88dvh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-5">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-extrabold">Importar hoja de cálculo</h3><button onClick={() => { onClose(); if (result) onDone(); }}><X className="h-5 w-5" /></button></div>
        <p className="mb-3 text-sm text-slate-500">Sube un archivo <b>.xlsx</b> o <b>.csv</b>. La primera fila debe tener títulos como: Modelo, IMEI, Código, RAM, Almacenamiento, Color, Caja, Precio, Tienda, Cantidad. Si el modelo trae “4/128GB” se separa solo. Los códigos o IMEI repetidos se omiten y se te avisa.</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-primary cursor-pointer"><FileSpreadsheet className="h-4 w-4" /> Elegir archivo<input type="file" accept=".xlsx,.csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>
          <button className="btn-ghost" onClick={() => downloadCSV("plantilla-stock.csv", [["Modelo", "IMEI", "IMEI 2", "Código", "RAM", "Almacenamiento", "Color", "Caja", "Precio", "Tienda", "Cantidad"], ["Samsung A15", "358721094561230", "", "100", "4", "128", "Negro", "Sellado", "450", "1", "1"]])}><Download className="h-4 w-4" /> Plantilla de ejemplo</button>
          {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
        </div>
        {err && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{err}</p>}
        {rows.length > 0 && !result && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm"><b>{rows.length}</b> equipos detectados. Si la hoja no trae columna Tienda, van a:
              <select className="input !w-auto !py-1.5" value={store} onChange={(e) => setStore(Number(e.target.value))}><option value={0}>Almacén general (asignar después)</option><option value={1}>Planet Movil (Tienda 1)</option><option value={2}>Soluciones Móviles (Tienda 2)</option></select></div>
            <div className="mt-3 max-h-60 overflow-auto rounded-xl border border-slate-200"><table className="w-full text-xs"><thead><tr>{["Modelo", "IMEI", "Cód.", "RAM", "Alm.", "Color", "Caja", "Precio", "Tienda"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 50).map((r, i) => <tr key={i}>{["model", "imei1", "code", "ram", "storage", "color", "condition", "price_suggested", "store"].map((k) => <td key={k} className="td">{String(r[k] ?? "")}</td>)}</tr>)}</tbody></table></div>
            <button disabled={busy} onClick={run} className="btn-primary mt-4 w-full py-3">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Importar {rows.length} equipos</button>
          </>
        )}
        {result && (
          <div className="mt-4 space-y-2">
            <p className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">✓ Se importaron {result.created} equipos.</p>
            {result.skipped.length > 0 && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><b>{result.skipped.length} omitidos:</b><ul className="mt-1 max-h-40 list-disc overflow-auto pl-5">{result.skipped.map((s, i) => <li key={i}>Fila {s.row} · {s.model}: {s.reason}</li>)}</ul></div>}
            <button className="btn-primary w-full" onClick={() => { onClose(); onDone(); }}>Listo</button>
          </div>
        )}
      </div>
    </div>
  );
}
