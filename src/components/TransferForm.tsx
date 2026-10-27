"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Search } from "lucide-react";
import { api } from "@/lib/client";
import { specLabel } from "@/lib/format";
import { useCatalog } from "./useCatalog";

type P = { id: number; model: string; code: string | null; ram: number | null; storage: number | null; color: string | null; store_id: number; store_name: string };

export default function TransferForm({ user }: { user: { store_id: number | null } }) {
  const { cat } = useCatalog();
  const [code, setCode] = useState("");
  const [items, setItems] = useState<P[]>([]);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState<string[]>([]);

  async function search() {
    setMsg("");
    const r = await api<{ products: P[] }>(`/api/products?q=${encodeURIComponent(code.trim())}`);
    setItems(r.products);
    if (!r.products.length) setMsg("No se encontró ese equipo en stock.");
  }
  async function move(p: P) {
    const to = p.store_id === 1 ? 2 : 1;
    try {
      await api("/api/transfer", { body: { product_id: p.id, to_store: to } });
      setDone((d) => [`${p.model} → ${cat?.stores.find((s) => s.id === to)?.name}`, ...d]);
      setItems([]); setCode("");
    } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div><h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">Trasladar equipo</h1><p className="text-sm text-slate-500">Mueve un equipo de una tienda a la otra. Queda registrado y se avisa al administrador.</p></div>
      <div className="card flex gap-2 p-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 font-mono" placeholder="Código o IMEI del equipo" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} autoFocus /></div>
        <button className="btn-primary" onClick={search}>Buscar</button>
      </div>
      {msg && <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">{msg}</p>}
      {items.map((p) => {
        const from = cat?.stores.find((s) => s.id === p.store_id);
        const to = cat?.stores.find((s) => s.id !== p.store_id);
        return (
          <div key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1"><div className="font-bold">{p.model}</div><div className="text-xs text-slate-500">Cód. {p.code ?? "—"} · {specLabel(p.ram, p.storage)} {p.color}</div></div>
            <div className="flex items-center gap-2 text-sm font-bold"><span style={{ color: from?.color }}>{from?.name}</span><ArrowRight className="h-4 w-4" /><span style={{ color: to?.color }}>{to?.name}</span></div>
            <button onClick={() => move(p)} className="btn-primary">Trasladar</button>
          </div>
        );
      })}
      {done.map((d, i) => <p key={i} className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" /> {d}</p>)}
      <p className="hidden">{user.store_id}</p>
    </div>
  );
}
