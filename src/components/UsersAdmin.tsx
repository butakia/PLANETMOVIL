"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, UserCheck, UserX } from "lucide-react";
import { api } from "@/lib/client";
import { useCatalog } from "./useCatalog";

type U = { id: number; username: string; name: string; role: string; store_id: number | null; active: number };
const ROLES: Record<string, string> = { seller: "Vendedora", admin: "Administrador", gerencia: "Gerencia (consulta e informes)" };

export default function UsersAdmin() {
  const { cat } = useCatalog();
  const [users, setUsers] = useState<U[]>([]);
  const [f, setF] = useState({ name: "", username: "", role: "seller", store_id: 1, password: "" });
  const [err, setErr] = useState("");
  const load = useCallback(async () => setUsers((await api<{ users: U[] }>("/api/users")).users), []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/users", { body: f }); setF({ ...f, name: "", username: "", password: "" }); load(); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Usuarios</h1><p className="text-sm text-slate-500">Las vendedoras entran solo con su nombre de usuario (sin contraseña). Gerencia también puede entrar solo con su usuario; el administrador usa contraseña.</p></div>
      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input className="input lg:col-span-1" placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input lg:col-span-1" placeholder="Usuario (ej. Milagros)" autoCapitalize="none" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {f.role === "seller"
          ? <select className="input" value={f.store_id} onChange={(e) => setF({ ...f, store_id: Number(e.target.value) })}>{cat?.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          : <input className="input" type="password" placeholder={f.role === "admin" ? "Contraseña" : "Contraseña (opcional)"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}
        <button className="btn-primary lg:col-span-2"><Plus className="h-4 w-4" /> Agregar usuario</button>
        {err && <p className="text-sm font-medium text-rose-600 sm:col-span-2 lg:col-span-6">{err}</p>}
      </form>
      <div className="card divide-y divide-slate-100">
        {users.map((u) => (
          <div key={u.id} className={`flex flex-wrap items-center gap-3 p-4 ${u.active ? "" : "opacity-50"}`}>
            <div className="min-w-0 flex-1"><div className="font-bold">{u.name} <span className="font-mono text-xs font-normal text-slate-400">{u.username}</span></div>
              <div className="text-xs text-slate-500">{ROLES[u.role]}{u.role === "seller" && ` · ${cat?.stores.find((s) => s.id === u.store_id)?.name}`}</div></div>
            {u.role === "seller" && <select className="input !w-auto !py-1.5" value={u.store_id ?? 1} onChange={async (e) => { await api("/api/users", { method: "PATCH", body: { id: u.id, store_id: Number(e.target.value) } }); load(); }}>{cat?.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
            <button className={u.active ? "btn-danger !py-1.5" : "btn-soft !py-1.5"} onClick={async () => { await api("/api/users", { method: "PATCH", body: { id: u.id, active: !u.active } }); load(); }}>
              {u.active ? <><UserX className="h-4 w-4" /> Desactivar</> : <><UserCheck className="h-4 w-4" /> Activar</>}</button>
          </div>))}
      </div>
    </div>
  );
}
