"use client";
import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ACCESSORY_BRANDS, ACCESSORY_CATALOG } from "@/lib/catalog";

export type Accessory = { name: string; detail: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Sug = { label: string; name: string; detail: string };

/** Buscador con autocompletado: "ca" → Cargador de pared, Cargador Samsung, Cargador Xiaomi… */
export default function AccessoryPicker({ value, onChange, models }: { value: Accessory | null; onChange: (a: Accessory | null) => void; models: string[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const sugs = useMemo<Sug[]>(() => {
    const t = norm(q).trim().split(/\s+/).filter(Boolean);
    if (!t.length) return ACCESSORY_CATALOG.slice(0, 8).map((a) => ({ label: a.name, name: a.name, detail: "" }));
    const bases: Sug[] = [];
    const combos: Sug[] = [];
    for (const a of ACCESSORY_CATALOG) {
      if (t.every((w) => norm(a.name).includes(w))) bases.push({ label: a.name, name: a.name, detail: "" });
      if (a.brand) for (const b of ACCESSORY_BRANDS) {
        const full = `${a.name} ${b}`;
        if (t.every((w) => norm(full).includes(w))) combos.push({ label: full, name: a.name, detail: b });
      }
    }
    // Pocos genéricos y luego combinaciones con marca; así "ca" muestra ambos tipos
    const first = norm(q).trim();
    const score = (s: Sug) => (norm(s.label).startsWith(first) ? 0 : 1);
    const byScore = (l: Sug[]) => [...l].sort((x, y) => score(x) - score(y));
    return [...byScore(bases).slice(0, 6), ...byScore(combos).filter((c) => !bases.some((b) => b.label === c.label)).slice(0, 8)];
  }, [q]);

  function pick(s: Sug) {
    onChange({ name: s.name, detail: s.detail });
    setQ(""); setOpen(false); setHi(0);
  }

  if (value) {
    const needsBrand = ACCESSORY_CATALOG.find((a) => a.name === value.name)?.brand;
    return (
      <div className="anim-pop space-y-3">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-blue-900 to-sky-600 px-4 py-3 text-white">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase opacity-80">Accesorio</div>
            <div className="truncate text-xl font-extrabold">{value.name}</div>
          </div>
          <button type="button" onClick={() => { onChange(null); setTimeout(() => inputRef.current?.focus(), 0); }} className="shrink-0 rounded-full bg-white/20 p-2 hover:bg-white/30" aria-label="Quitar"><X className="h-4 w-4" /></button>
        </div>
        <div>
          <label className="label">{needsBrand ? "Marca o modelo (ej. Samsung A15)" : "Marca o modelo (opcional)"}</label>
          <input className="input !py-3.5" list="acc-models" value={value.detail} placeholder="Ej. Samsung, Xiaomi Redmi 13…" onChange={(e) => onChange({ ...value, detail: e.target.value })} />
          <datalist id="acc-models">
            {ACCESSORY_BRANDS.map((b) => <option key={b} value={b} />)}
            {models.map((m) => <option key={m} value={m} />)}
          </datalist>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ACCESSORY_BRANDS.slice(0, 8).map((b) => (
              <button key={b} type="button" onClick={() => onChange({ ...value, detail: b })} className={`chip ${value.detail === b ? "chip-on" : ""}`}>{b}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
      <input ref={inputRef} autoFocus className="input !py-3.5 pl-11 text-lg" placeholder="Escribe: cargador, cable, funda, vidrio…" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, sugs.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && sugs[hi]) { e.preventDefault(); pick(sugs[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }} />
      {open && sugs.length > 0 && (
        <ul className="anim-pop absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-100 bg-white p-1 shadow-xl">
          {sugs.map((s, i) => (
            <li key={s.label}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left font-semibold ${i === hi ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50"}`}>
                {s.label}
                {s.detail && <span className="text-xs font-normal text-slate-400">con marca</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
