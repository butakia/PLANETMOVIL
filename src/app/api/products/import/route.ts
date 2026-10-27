import { NextRequest, NextResponse } from "next/server";
import { all, run } from "@/lib/db";
import { guard, limaDay } from "@/lib/auth";
import { clean, findConflicts, num } from "@/lib/products";

// Importación masiva desde hoja de cálculo (el navegador ya la convirtió a filas).
export async function POST(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const { rows, store_id } = (await req.json()) as { rows: Record<string, unknown>[]; store_id: number };
  const brands = (await all<{ name: string }>("SELECT name FROM brands")).map((b) => b.name);
  const skipped: { row: number; model: string; reason: string }[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const model = clean(r.model);
    const fail = (reason: string) => skipped.push({ row: i + 2, model: model ?? "—", reason });
    if (!model) { fail("sin modelo"); continue; }
    const st = norm(r.store);
    const store = st.includes("solu") || st === "2" ? 2 : st.includes("planet") || st === "1" ? 1 : Number(store_id) === 2 ? 2 : 1;
    const kind = norm(r.kind).startsWith("acc") ? "accesorio" : "celular";
    const code = clean(r.code);
    const imei1 = kind === "celular" ? clean(r.imei1)?.replace(/\s/g, "") ?? null : null;
    const imei2 = kind === "celular" ? clean(r.imei2)?.replace(/\s/g, "") ?? null : null;
    const c = await findConflicts({ code, imeis: [imei1, imei2] });
    if (c.code) { fail(`código ${code} ya usado (${(c.code as { store_name: string }).store_name})`); continue; }
    if (c.imei) { fail(`IMEI ya registrado (${(c.imei as { store_name: string }).store_name})`); continue; }
    const brand = clean(r.brand) ?? brands.find((b) => model.toLowerCase().startsWith(b.toLowerCase() + " ") || model.toLowerCase() === b.toLowerCase()) ?? model.split(" ")[0];
    const cond = norm(r.condition);
    const date = clean(r.entry_date);
    await run("INSERT OR IGNORE INTO brands (name,color) VALUES (?,?)", [brand, "#64748b"]);
    await run("INSERT OR IGNORE INTO models (name,brand,def_ram,def_storage) VALUES (?,?,?,?)", [model, brand, num(r.ram) ?? 4, num(r.storage) ?? 64]);
    if (clean(r.color)) await run("INSERT OR IGNORE INTO colors (name) VALUES (?)", [clean(r.color)]);
    await run(
      `INSERT INTO products (kind,store_id,brand,model,imei1,imei2,code,ram,storage,color,condition,qty,price_suggested,cost,supplier,entry_date,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [kind, store, brand, model, imei1, imei2, code, kind === "celular" ? num(r.ram) : null, kind === "celular" ? num(r.storage) : null, clean(r.color),
        kind === "celular" ? (cond.startsWith("sell") || cond.startsWith("cerr") ? "Sellado" : cond ? "Abierto" : "Sellado") : null,
        kind === "accesorio" ? Math.max(1, num(r.qty) ?? 1) : 1, num(r.price_suggested), num(r.cost), clean(r.supplier),
        date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : limaDay(), g.user.name],
    );
    created++;
  }
  return NextResponse.json({ created, skipped });
}

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
