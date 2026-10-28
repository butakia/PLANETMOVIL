import { NextRequest, NextResponse } from "next/server";
import { one, run } from "@/lib/db";
import { guard } from "@/lib/auth";
import { clean, findConflicts, num, type Product } from "@/lib/products";

type Ctx = { params: Promise<{ id: string }> };

// admin: todos los campos. gerencia: solo precios de compra / proveedor / precio sugerido.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const g = await guard(["admin", "gerencia"]);
  if (g.error) return g.error;
  const id = Number((await params).id);
  const cur = await one<Product>("SELECT * FROM products WHERE id=?", [id]);
  if (!cur) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const b = await req.json();

  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const set = (col: string, v: string | number | null) => { sets.push(`${col}=?`); args.push(v); };

  for (const k of ["cost", "price_suggested"] as const) if (k in b) set(k, num(b[k]));
  for (const k of ["supplier", "purchase_date"] as const) if (k in b) set(k, clean(b[k]));

  if (g.user.role === "admin") {
    const text = ["brand", "model", "color", "condition", "notes", "entry_date"] as const;
    for (const k of text) if (k in b) set(k, clean(b[k]));
    for (const k of ["ram", "storage", "qty"] as const) if (k in b) set(k, num(b[k]));
    if ("store_id" in b) set("store_id", Number(b.store_id));
    if ("status" in b) set("status", b.status === "sold" ? "sold" : "stock");
    const code = "code" in b ? clean(b.code) : cur.code;
    const imei1 = "imei1" in b ? clean(b.imei1) : cur.imei1;
    const imei2 = "imei2" in b ? clean(b.imei2) : cur.imei2;
    if ("code" in b) set("code", code);
    if ("imei1" in b) set("imei1", imei1);
    if ("imei1" in b && imei1 && imei1 !== cur.imei1) set("flag", null); // IMEI corregido: se quita la marca roja
    if ("imei2" in b) set("imei2", imei2);
    if ("ident" in b) set("ident", clean(b.ident));
    const c = await findConflicts({ code, imeis: [imei1, imei2], excludeId: id });
    if (c.code) {
      const x = c.code as Record<string, unknown>;
      return NextResponse.json({ error: `El código ${code} ya está en uso: ${x.model} en ${x.store_name}` }, { status: 409 });
    }
    if (c.imei) {
      const x = c.imei as Record<string, unknown>;
      return NextResponse.json({ error: `Ese IMEI ya está registrado: ${x.model} en ${x.store_name}` }, { status: 409 });
    }
  }
  if (!sets.length) return NextResponse.json({ ok: true });
  await run(`UPDATE products SET ${sets.join(",")} WHERE id=?`, [...args, id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  await run("DELETE FROM products WHERE id=?", [Number((await params).id)]);
  return NextResponse.json({ ok: true });
}
