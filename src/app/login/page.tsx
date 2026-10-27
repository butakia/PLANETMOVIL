"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [needPw, setNeedPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await api("/api/auth", { body: { username, password } });
      if (r.needPassword) setNeedPw(true);
      else {
        router.replace("/");
        router.refresh();
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 p-5">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-sky-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-3xl" />
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-3xl bg-white/95 p-7 shadow-2xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={64} />
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Planet Movil</h1>
            <p className="text-sm text-slate-500">Stock · Ventas · Constancias</p>
          </div>
        </div>
        <label className="label">Usuario</label>
        <div className="relative mb-4">
          <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" autoFocus autoCapitalize="none" autoCorrect="off" placeholder="Ej. Milagros" value={username}
            onChange={(e) => { setUsername(e.target.value); setNeedPw(false); }} />
        </div>
        {needPw && (
          <>
            <label className="label">Contraseña</label>
            <div className="relative mb-4">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </>
        )}
        {err && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <button className="btn-primary w-full py-3" disabled={busy || !username.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Ingresar
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">Las vendedoras ingresan solo con su usuario.</p>
      </form>
    </main>
  );
}
