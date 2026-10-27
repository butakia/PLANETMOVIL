"use client";
import { useState } from "react";
import { api, type Store } from "@/lib/client";
import { useCatalog } from "./useCatalog";

export default function SettingsAdmin() {
  const { cat, reload } = useCatalog();
  const [saved, setSaved] = useState("");
  if (!cat) return null;
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(""), 1800); };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Ajustes</h1><p className="text-sm text-slate-500">Datos que salen en la constancia de venta y colores de cada marca en el stock.</p></div>
      {saved && <p className="fixed right-4 top-4 z-50 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg">{saved}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Tiendas (datos de la constancia)</h2>
        <div className="grid gap-3 md:grid-cols-2">{cat.stores.map((s) => <StoreCard key={s.id} s={s} onSaved={async () => { await reload(); flash("Guardado ✓"); }} />)}</div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Color de cada marca</h2>
        <div className="card grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {cat.brands.map((b) => (
            <label key={b.name} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
              <input type="color" defaultValue={b.color} className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200"
                onBlur={async (e) => { if (e.target.value !== b.color) { await api("/api/catalog", { method: "PATCH", body: { brand: b.name, color: e.target.value } }); await reload(); flash(`${b.name} actualizado`); } }} />
              <span className="font-bold" style={{ color: b.color }}>{b.name}</span>
            </label>))}
        </div>
      </section>
    </div>
  );
}

function StoreCard({ s, onSaved }: { s: Store; onSaved: () => void }) {
  const [f, setF] = useState({ owner: s.owner ?? "", address: s.address, phone: s.phone, ruc: s.ruc });
  return (
    <div className="card space-y-2 p-4">
      <div className="font-extrabold" style={{ color: s.color }}>{s.short} · {s.name}</div>
      <input className="input" placeholder="Titular (nombre en la constancia)" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} />
      <input className="input" placeholder="Dirección" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      <input className="input" placeholder="Teléfono" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <input className="input" placeholder="RUC" value={f.ruc} onChange={(e) => setF({ ...f, ruc: e.target.value })} />
      <button className="btn-primary w-full" onClick={async () => { await api("/api/catalog", { method: "PATCH", body: { store: { id: s.id, ...f } } }); onSaved(); }}>Guardar</button>
    </div>
  );
}
