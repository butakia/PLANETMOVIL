import { NextRequest, NextResponse } from "next/server";
import { one, run } from "@/lib/db";
import { guard } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const g = await guard(["admin", "seller"]);
  if (g.error) return g.error;
  const { product_id, to_store } = await req.json();
  const p = await one<{ id: number; model: string; code: string | null; store_id: number; status: string }>(
    "SELECT id,model,code,store_id,status FROM products WHERE id=?",
    [Number(product_id)],
  );
  if (!p || p.status !== "stock") return NextResponse.json({ error: "Equipo no disponible" }, { status: 404 });
  const to = Number(to_store);
  if (![1, 2].includes(to) || to === p.store_id) return NextResponse.json({ error: "Elige la otra tienda" }, { status: 400 });
  const stores = await Promise.all([1, 2].map((i) => one<{ name: string }>("SELECT name FROM stores WHERE id=?", [i])));
  await run("UPDATE products SET store_id=? WHERE id=?", [to, p.id]);
  await run("INSERT INTO movements (product_id,from_store,to_store,user_name) VALUES (?,?,?,?)", [p.id, p.store_id, to, g.user.name]);
  await run("INSERT INTO alerts (type,message,store_id) VALUES ('traslado',?,?)", [
    `${g.user.name} trasladó ${p.model}${p.code ? ` (cód. ${p.code})` : ""} de ${stores[p.store_id - 1]?.name} a ${stores[to - 1]?.name}`,
    to,
  ]);
  return NextResponse.json({ ok: true });
}
