import { NextRequest, NextResponse } from "next/server";
import { run } from "@/lib/db";
import { guard, limaDay } from "@/lib/auth";
import { clean, findConflicts, listProducts, num, stripCost } from "@/lib/products";

export async function GET(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;
  const sp = req.nextUrl.searchParams;
  const where: string[] = [];
  const args: (string | number)[] = [];
  const status = sp.get("status") ?? "stock";
  if (status !== "all") { where.push("p.status=?"); args.push(status); }
  for (const [k, col] of [["store", "p.store_id"], ["brand", "p.brand"], ["kind", "p.kind"]] as const)
    if (sp.get(k)) { where.push(`${col}=?`); args.push(sp.get(k)!); }
  const q = sp.get("q")?.trim();
  if (q) {
    const like = `%${q}%`;
    where.push("(p.model LIKE ? OR p.brand LIKE ? OR p.code LIKE ? OR p.imei1 LIKE ? OR p.imei2 LIKE ? OR p.ident LIKE ? OR p.color LIKE ?)");
    args.push(like, like, like, like, like, like, like);
  }
  if (sp.get("code")) { where.push("p.code=?"); args.push(sp.get("code")!); }
  const rows = await listProducts(where, args);
  return NextResponse.json({ products: g.user.role === "seller" ? stripCost(rows) : rows });
}

export async function POST(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const b = await req.json();
  const kind = b.kind === "accesorio" ? "accesorio" : "celular";
  const model = clean(b.model);
  const store_id = Number(b.store_id);
  if (!model) return NextResponse.json({ error: "Falta el modelo / nombre" }, { status: 400 });
  if (![1, 2].includes(store_id)) return NextResponse.json({ error: "Elige la tienda" }, { status: 400 });

  const imei1 = kind === "celular" ? clean(b.imei1) : null;
  const imei2 = kind === "celular" ? clean(b.imei2) : null;
  const ident = kind === "accesorio" ? clean(b.ident) : null;
  const code = clean(b.code);
  const c = await findConflicts({ code, imeis: [imei1, imei2], ident });
  if (c.code) {
    const x = c.code as Record<string, unknown>;
    return NextResponse.json({ error: `El código ${code} ya está en uso: ${x.model} en ${x.store_name}`, field: "code", conflict: x }, { status: 409 });
  }
  if (c.imei) {
    const x = c.imei as Record<string, unknown>;
    return NextResponse.json({ error: `Ese IMEI ya está registrado: ${x.model} (código ${x.code ?? "—"}) en ${x.store_name}`, field: "imei", conflict: x }, { status: 409 });
  }
  const qty = kind === "accesorio" ? Math.max(1, Number(b.qty) || 1) : 1;
  const r = await run(
    `INSERT INTO products (kind,store_id,brand,model,imei1,imei2,ident,code,ram,storage,color,condition,qty,price_suggested,cost,supplier,purchase_date,entry_date,notes,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [kind, store_id, clean(b.brand), model, imei1, imei2, ident, code, kind === "celular" ? num(b.ram) : null, kind === "celular" ? num(b.storage) : null,
      clean(b.color), kind === "celular" ? clean(b.condition) : null, qty, num(b.price_suggested), num(b.cost), clean(b.supplier),
      clean(b.purchase_date) ?? (num(b.cost) !== null ? clean(b.entry_date) : null), clean(b.entry_date) ?? limaDay(), clean(b.notes), g.user.name],
  );
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
