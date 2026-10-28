import { NextRequest, NextResponse } from "next/server";
import { one, run } from "@/lib/db";
import { guard } from "@/lib/auth";
import type { Product } from "@/lib/products";

// Asigna equipos del almacén general (o de cualquier tienda) a Planet Movil / Soluciones Móviles.
// Un accesorio con varias unidades puede dividirse: qty = unidades que se mueven.
export async function POST(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const { ids, store_id, qty } = (await req.json()) as { ids: number[]; store_id: number; qty?: number };
  const to = Number(store_id);
  if (![0, 1, 2, 3, 4].includes(to) || !Array.isArray(ids) || !ids.length) return NextResponse.json({ error: "Elige equipos y tienda" }, { status: 400 });
  let moved = 0;
  for (const id of ids) {
    const p = await one<Product>("SELECT * FROM products WHERE id=?", [Number(id)]);
    if (!p || p.status !== "stock" || p.store_id === to) continue;
    const n = Number(qty);
    if (ids.length === 1 && p.kind === "accesorio" && n > 0 && n < p.qty) {
      await run("UPDATE products SET qty=qty-? WHERE id=?", [n, p.id]);
      await run(
        "INSERT INTO products (kind,store_id,brand,model,ident,color,qty,price_suggested,cost,supplier,purchase_date,entry_date,notes,created_by,is_test) SELECT kind,?,brand,model,ident,color,?,price_suggested,cost,supplier,purchase_date,entry_date,notes,created_by,is_test FROM products WHERE id=?",
        [to, n, p.id],
      );
    } else {
      await run("UPDATE products SET store_id=? WHERE id=?", [to, p.id]);
    }
    await run("INSERT INTO movements (product_id,from_store,to_store,user_name) VALUES (?,?,?,?)", [p.id, p.store_id, to, g.user.name]);
    moved++;
  }
  return NextResponse.json({ ok: true, moved });
}
