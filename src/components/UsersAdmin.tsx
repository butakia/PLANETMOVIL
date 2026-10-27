"use client";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Lock, Plus, ShieldOff, UserCheck, UserX, X } from "lucide-react";
import { api } from "@/lib/client";
import { useCatalog } from "./useCatalog";

type U = { id: number; username: string; name: string; role: string; store_id: number | null; active: number; has_password: number };
const ROLES: Record<string, string> = { seller: "Vendedora", admin: "Administrador", gerencia: "Gerencia (consulta e informes)" };
const ROLE_COLOR: Record<string, string> = { seller: "bg-sky-100 text-sky-800", admin: "bg-blue-900 text-white", gerencia: "bg-emerald-100 text-emerald-800" };

export default function UsersAdmin() {
  const { cat } = useCatalog();
  const [users, setUsers] = useState<U[]>([]);
  const [f, setF] = useState({ name: "", username: "", role: "seller", store_id: 0, password: "" });
  const [err, setErr] = useState("");
  const [pwFor, setPwFor] = useState<U | null>(null);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const load = useCallback(async () => setUsers((await api<{ users: U[] }>("/api/users")).users), []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/users", { body: f }); setF({ ...f, name: "", username: "", password: "" }); load(); } catch (e) { setErr((e as Error).message); }
  }
  async function savePw(remove = false) {
    if (!pwFor) return;
    setPwErr("");
    try {
      await api("/api/users", { method: "PATCH", body: { id: pwFor.id, password: remove ? "" : pw } });
      setPwFor(null); setPw(""); load();
    } catch (e) { setPwErr((e as Error).message); }
  }
  const storeName = (u: U) => (u.store_id ? cat?.stores.find((s) => s.id === u.store_id)?.name : "Ambas tiendas (rota)");

  return (
    <div className="stagger mx-auto max-w-4xl space-y-5">
      <div><h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">Usuarios</h1>
        <p className="text-sm text-slate-500">Las vendedoras rotan entre tiendas: eligen dónde están al entrar. Cualquier usuario puede tener contraseña (opcional, salvo el administrador).</p></div>
      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input className="input" placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" placeholder="Usuario (ej. Milagros)" autoCapitalize="none" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {f.role === "seller"
          ? <select className="input" value={f.store_id} onChange={(e) => setF({ ...f, store_id: Number(e.target.value) })}><option value={0}>Ambas tiendas (rota)</option>{cat?.stores.map((s) => <option key={s.id} value={s.id}>Solo {s.name}</option>)}</select>
          : <div className="hidden lg:block" />}
        <input className="input" type="password" placeholder={f.role === "admin" ? "Contraseña (obligatoria)" : "Contraseña (opcional)"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="btn-primary"><Plus className="h-4 w-4" /> Agregar</button>
        {err && <p className="text-sm font-medium text-rose-600 sm:col-span-2 lg:col-span-6">{err}</p>}
      </form>

      <div className="card divide-y divide-slate-100 overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className={`flex flex-wrap items-center gap-3 p-4 transition ${u.active ? "" : "opacity-50"}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-blue-800 font-bold text-white">{u.name[0]}</div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{u.name} <span className="font-mono text-xs font-normal text-slate-400">{u.username}</span></div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${ROLE_COLOR[u.role]}`}>{ROLES[u.role]}</span>
                {u.role === "seller" && <span className="text-slate-500">{storeName(u)}</span>}
                {u.has_password ? <span className="inline-flex items-center gap-1 text-emerald-700"><Lock className="h-3 w-3" /> con contraseña</span> : <span className="inline-flex items-center gap-1 text-amber-600"><ShieldOff className="h-3 w-3" /> sin contraseña</span>}
              </div>
            </div>
            {u.role === "seller" && <select className="input !w-auto !py-1.5" value={u.store_id ?? 0} onChange={async (e) => { await api("/api/users", { method: "PATCH", body: { id: u.id, store_id: Number(e.target.value) } }); load(); }}>
              <option value={0}>Ambas tiendas (rota)</option>{cat?.stores.map((s) => <option key={s.id} value={s.id}>Solo {s.name}</option>)}</select>}
            <button className="btn-soft !py-1.5" onClick={() => { setPwFor(u); setPw(""); setPwErr(""); }}><KeyRound className="h-4 w-4" /> Contraseña</button>
            <button className={u.active ? "btn-danger !py-1.5" : "btn-soft !py-1.5"} onClick={async () => { await api("/api/users", { method: "PATCH", body: { id: u.id, active: !u.active } }); load(); }}>
              {u.active ? <><UserX className="h-4 w-4" /> Desactivar</> : <><UserCheck className="h-4 w-4" /> Activar</>}</button>
          </div>))}
      </div>

      {pwFor && (
        <div className="anim-fade fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 pt-[12dvh]">
          <div className="anim-sheet w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-extrabold">Contraseña de {pwFor.name}</h3><button onClick={() => setPwFor(null)}><X className="h-5 w-5" /></button></div>
            <p className="mb-3 text-sm text-slate-500">{pwFor.has_password ? "Escribe la nueva contraseña (reemplaza la anterior)." : "Actualmente entra solo con su usuario. Escribe una contraseña para protegerlo."}</p>
            <input autoFocus type="password" className="input" placeholder="Nueva contraseña (mín. 4 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePw()} />
            {pwErr && <p className="mt-2 text-sm font-medium text-rose-600">{pwErr}</p>}
            <div className="mt-4 flex flex-wrap justify-between gap-2">
              {pwFor.has_password && pwFor.role !== "admin" ? <button className="btn-danger" onClick={() => savePw(true)}>Quitar contraseña</button> : <span />}
              <button className="btn-primary" disabled={pw.length < 4} onClick={() => savePw()}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
