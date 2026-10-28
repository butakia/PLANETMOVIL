import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard } from "@/lib/auth";

// Traslada un equipo a cualquiera de las tiendas (administrador y vendedoras).
// Una sola lectura y una sola escritura en lote: es rápido incluso con la base remota.
export async function POST(req: NextRequest) {
  const g = await guard(["admin", "seller"]);
  if (g.error) return g.error;
  const { product_id, to_store } = await req.json();
  const to = Number(to_store);
  if (![1, 2, 3, 4].includes(to)) return NextResponse.json({ error: "Elige una tienda" }, { status: 400 });
  const c = await db();
  const r = (await c.execute({
    sql: `SELECT p.id,p.model,p.code,p.store_id,p.status,
                 COALESCE((SELECT name FROM stores WHERE id=p.store_id),'Almacén general') AS from_name,
                 (SELECT name FROM stores WHERE id=?) AS to_name
          FROM products p WHERE p.id=?`,
    args: [to, Number(product_id)],
  })).rows[0];
  if (!r || r.status !== "stock") return NextResponse.json({ error: "Equipo no disponible" }, { status: 404 });
  // Si ya está en esa tienda (por ejemplo, tocó dos veces) no es un error: queda donde se pidió.
  if (Number(r.store_id) === to) return NextResponse.json({ ok: true, already: true });
  await c.batch([
    { sql: "UPDATE products SET store_id=? WHERE id=?", args: [to, Number(r.id)] },
    { sql: "INSERT INTO movements (product_id,from_store,to_store,user_name) VALUES (?,?,?,?)", args: [Number(r.id), Number(r.store_id), to, g.user.name] },
    { sql: "INSERT INTO alerts (type,message,store_id) VALUES ('traslado',?,?)", args: [`${g.user.name} trasladó ${r.model}${r.code ? ` (cód. ${r.code})` : ""} de ${r.from_name} a ${r.to_name}`, to] },
  ], "write");
  return NextResponse.json({ ok: true });
}
