"use client";
import { useEffect, useState } from "react";
import NumInput from "./NumInput";
import { Download, FlaskConical, MessageCircle, Plus, Send, ShieldCheck, Trash2 } from "lucide-react";
import { api, type Store } from "@/lib/client";
import { useCatalog } from "./useCatalog";

export default function SettingsAdmin() {
  const { cat, reload } = useCatalog();
  const [saved, setSaved] = useState("");
  if (!cat) return null;
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(""), 1800); };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">Ajustes</h1><p className="text-sm text-slate-500">Datos que salen en la constancia de venta y colores de cada marca en el stock.</p></div>
      {saved && <p className="fixed right-4 top-4 z-50 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg">{saved}</p>}

      <WhatsAppCard onFlash={flash} />
      <BackupCard />
      <TestDataCard onFlash={flash} />

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

type Rec = { name?: string; phone: string; apikey: string };

function WhatsAppCard({ onFlash }: { onFlash: (m: string) => void }) {
  const [rec, setRec] = useState<Rec[]>([]);
  const [res, setRes] = useState<{ phone: string; ok: boolean; detail: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<{ recipients: Rec[] }>("/api/settings").then((r) => setRec(r.recipients)).catch(() => {}); }, []);
  const upd = (i: number, k: keyof Rec, v: string) => setRec(rec.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  async function save() { const r = await api<{ recipients: Rec[] }>("/api/settings", { method: "PUT", body: { recipients: rec } }); setRec(r.recipients); onFlash("Guardado ✓"); }
  async function test() { setBusy(true); setRes(null); await save(); try { setRes((await api<{ results: { phone: string; ok: boolean; detail: string }[] }>("/api/settings", { method: "POST", body: {} })).results); } finally { setBusy(false); } }
  return (
    <section className="card space-y-3 p-4">
      <h2 className="flex items-center gap-2 text-lg font-extrabold"><MessageCircle className="h-5 w-5 text-emerald-600" /> Avisos de venta por WhatsApp</h2>
      <p className="text-sm text-slate-500">Cada venta (y cada venta fuera de tiempo o con corrección) llega al WhatsApp de quien agregues aquí. Usa el servicio gratuito <b>CallMeBot</b>: cada persona debe activarlo una vez desde su propio WhatsApp para obtener su <b>clave (apikey)</b>; las instrucciones están en callmebot.com (sección WhatsApp).</p>
      {rec.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input className="input" placeholder="Nombre" value={r.name ?? ""} onChange={(e) => upd(i, "name", e.target.value)} />
          <NumInput className="input" title="Celular con código de país" maxLen={14} placeholder="Celular con código de país (51999888777)" value={r.phone} onChange={(v) => upd(i, "phone", v)} />
          <input className="input" placeholder="Clave de CallMeBot" value={r.apikey} onChange={(e) => upd(i, "apikey", e.target.value)} />
          <button className="btn-danger" onClick={() => setRec(rec.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => setRec([...rec, { name: "", phone: "", apikey: "" }])}><Plus className="h-4 w-4" /> Agregar número</button>
        <button className="btn-primary" onClick={save}>Guardar</button>
        <button className="btn-soft" disabled={busy || rec.length === 0} onClick={test}><Send className="h-4 w-4" /> Guardar y enviar prueba</button>
      </div>
      {res && <ul className="space-y-1 text-sm">{res.map((x, i) => <li key={i} className={x.ok ? "text-emerald-700" : "text-rose-600"}>{x.phone}: {x.ok ? "enviado ✓ (revisa tu WhatsApp)" : "no se pudo enviar — " + x.detail}</li>)}</ul>}
    </section>
  );
}

function BackupCard() {
  return (
    <section className="card flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><ShieldCheck className="h-5 w-5 text-blue-800" /> Respaldo de tus datos</h2>
        <p className="text-sm text-slate-500">Descarga una copia completa (stock, ventas, pagos, usuarios, catálogo). Guárdala en tu PC o en Drive; sirve para restaurar o auditar. Te recomiendo descargarla al menos una vez por semana.</p>
      </div>
      <a href="/api/backup" className="btn-primary"><Download className="h-4 w-4" /> Descargar respaldo</a>
    </section>
  );
}

function TestDataCard({ onFlash }: { onFlash: (m: string) => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: "create" | "delete") {
    if (action === "delete" && !confirm("¿Borrar todos los equipos de prueba y sus ventas de prueba? Tus equipos reales no se tocan.")) return;
    setBusy(true);
    try {
      const r = await api<{ created?: number; skipped?: string[]; products?: number; sales?: number }>("/api/test-data", { body: { action } });
      setMsg(action === "create" ? `Listo: ${r.created} equipos de prueba creados (códigos 100, 200, 300, 400, 500, 600)${r.skipped?.length ? `. Omitidos por código ya usado: ${r.skipped.join(", ")}` : ""}.` : `Borrados ${r.products} equipos de prueba y ${r.sales} ventas de prueba.`);
      onFlash(action === "create" ? "Equipos de prueba creados" : "Pruebas borradas");
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <section className="card space-y-3 p-4">
      <h2 className="flex items-center gap-2 text-lg font-extrabold"><FlaskConical className="h-5 w-5 text-amber-600" /> Números de prueba</h2>
      <p className="text-sm text-slate-500">Crea 6 equipos ficticios (códigos <b>100, 200, 300, 400, 500, 600</b>: Samsung A15, A16, A17, A18, Honor X7B y Redmi 13C, repartidos entre las dos tiendas) para practicar ventas. Cuando termines, bórralos: también se borran las ventas hechas con ellos. Tus equipos reales nunca se tocan.</p>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => run("create")} className="btn-primary"><FlaskConical className="h-4 w-4" /> Crear / reiniciar equipos de prueba</button>
        <button disabled={busy} onClick={() => run("delete")} className="btn-danger"><Trash2 className="h-4 w-4" /> Borrar números de prueba</button>
      </div>
      {msg && <p className="rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700">{msg}</p>}
    </section>
  );
}
