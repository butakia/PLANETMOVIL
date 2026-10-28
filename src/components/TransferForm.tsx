"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Search } from "lucide-react";
import { api } from "@/lib/client";
import { specLabel } from "@/lib/format";
import { playSuccess } from "@/lib/sound";
import { useCatalog } from "./useCatalog";

type P = { id: number; model: string; code: string | null; ram: number | null; storage: number | null; color: string | null; store_id: number; store_name: string };

export default function TransferForm({ user }: { user: { store_id: number | null } }) {
  const { cat } = useCatalog();
  const [code, setCode] = useState("");
  const [items, setItems] = useState<P[]>([]);
  const [dest, setDest] = useState<Record<number, number>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [done, setDone] = useState<string[]>([]);

  async function search() {
    if (!code.trim() || searching) return;
    setMsg(""); setSearching(true);
    try {
      const r = await api<{ products: P[] }>(`/api/products?q=${encodeURIComponent(code.trim())}`);
      setItems(r.products);
      if (!r.products.length) setMsg("No se encontró ese equipo en stock.");
    } catch (e) { setMsg((e as Error).message); } finally { setSearching(false); }
  }
  async function move(p: P, to: number) {
    if (busy) return;
    setBusy(p.id); setMsg("");
    try {
      await api("/api/transfer", { body: { product_id: p.id, to_store: to } });
      playSuccess();
      setDone((d) => [`${p.model} → ${cat?.stores.find((s) => s.id === to)?.name}`, ...d]);
      setItems([]); setCode("");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div><h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">Trasladar equipo</h1><p className="text-sm text-slate-500">Mueve un equipo a cualquier tienda. Queda registrado y se avisa al administrador.</p></div>
      <div className="card flex gap-2 p-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 font-mono" placeholder="Código o IMEI del equipo" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} autoFocus /></div>
        <button className="btn-primary" disabled={searching} onClick={search}>{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}</button>
      </div>
      {msg && <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">{msg}</p>}
      {items.map((p) => {
        const from = cat?.stores.find((s) => s.id === p.store_id);
        const options = (cat?.stores ?? []).filter((s) => s.id !== p.store_id);
        const to = dest[p.id] && options.some((s) => s.id === dest[p.id]) ? dest[p.id] : (options.find((s) => s.id === user.store_id) ?? options[0])?.id;
        return (
          <div key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1"><div className="font-bold">{p.model}</div><div className="text-xs text-slate-500">Cód. {p.code ?? "—"} · {specLabel(p.ram, p.storage)} {p.color}</div></div>
            <div className="flex items-center gap-2 text-sm font-bold"><span style={{ color: from?.color }}>{from?.name ?? "Almacén general"}</span><ArrowRight className="h-4 w-4" />
              <select className="input !w-auto !py-1.5 text-sm" value={to} onChange={(e) => setDest({ ...dest, [p.id]: Number(e.target.value) })}>{options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <button disabled={busy === p.id || !to} onClick={() => to && move(p, to)} className="btn-primary">{busy === p.id ? <><Loader2 className="h-4 w-4 animate-spin" /> Trasladando…</> : "Trasladar"}</button>
          </div>
        );
      })}
      {done.map((d, i) => <p key={i} className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" /> {d}</p>)}
    </div>
  );
}
