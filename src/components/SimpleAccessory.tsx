"use client";
import { useEffect, useState } from "react";
import { Cable, Droplets, Headphones, Layers, Package, Plug, Smartphone } from "lucide-react";

export type Accessory = { name: string; detail: string; category: string };

export const ACC_CATEGORIES = [
  { id: "Cargador", icon: Plug },
  { id: "Cable", icon: Cable },
  { id: "Audífonos", icon: Headphones },
  { id: "Funda", icon: Smartphone },
  { id: "Vidrio Glass", icon: Layers },
  { id: "Chip Hidrogel", icon: Droplets },
  { id: "Otro", icon: Package },
] as const;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Nombre completo que sale en el recibo: la categoría va delante si el nombre no la menciona. */
export const accessoryName = (a: Accessory) => {
  const n = a.name.trim();
  if (a.category === "Otro" || !a.category) return n;
  // Si el nombre ya menciona alguna palabra de la categoría (cargador, vidrio, glass, chip, hidrogel…) no se repite.
  const words = norm(a.category).split(" ").map((w) => w.replace(/s$/, ""));
  return words.some((w) => norm(n).includes(w)) ? n : `${a.category} ${n}`;
};

/** Flujo simple de accesorios: nombre, categoría y modelo escritos a mano. */
export default function SimpleAccessory({ onChange }: { onChange: (a: Accessory | null) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [detail, setDetail] = useState("");
  useEffect(() => { onChange(name.trim() ? { name, detail: detail.trim(), category } : null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [name, detail, category]);

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nombre del accesorio</label>
        <input autoFocus className="input !py-3.5 text-lg" placeholder="Ej. Cargador rápido 20W" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Categoría</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACC_CATEGORIES.map(({ id, icon: I }) => (
            <button key={id} type="button" onClick={() => setCategory(id)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-sm font-bold transition active:scale-95 ${category === id ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
              <I className="h-6 w-6" /> {id}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Modelo (escríbelo tú)</label>
        <input className="input !py-3.5" placeholder="Ej. Samsung A15, iPhone 13, universal…" value={detail} onChange={(e) => setDetail(e.target.value)} />
      </div>
    </div>
  );
}
