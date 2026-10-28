import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, limaDay } from "@/lib/auth";
import { clean } from "@/lib/products";

// Marca equipos del stock como vendidos (solo administrador). Todo lo demás es opcional:
// con precio se crea además la venta (con su constancia); sin precio solo cambia la situación y deja una nota.
export async function POST(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const b = await req.json();
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Boolean) as number[];
  // Registro rápido: equipos que no están en el stock (solo modelo e IMEI, sin código ni procedencia).
  const fresh = (Array.isArray(b.items) ? b.items : []) as { model?: string; imei?: string; color?: string }[];
  const storeId = Number(b.store_id);
  if (!ids.length && !fresh.length) return NextResponse.json({ error: "Elige al menos un equipo" }, { status: 400 });
  if (![1, 2, 3, 4].includes(storeId)) return NextResponse.json({ error: "Elige la tienda donde se vendió" }, { status: 400 });
  const today = limaDay();
  const day = b.date ? String(b.date) : today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today) return NextResponse.json({ error: "La fecha de venta no es válida" }, { status: 400 });
  const price = b.price === "" || b.price == null ? null : Number(b.price);
  if (price !== null && !(price > 0)) return NextResponse.json({ error: "El precio debe ser mayor a 0" }, { status: 400 });
  const method = String(b.method || "Efectivo");

  const c = await db();
  const tx = await c.transaction("write");
  try {
    let sellerId = g.user.id, sellerName = g.user.name;
    if (b.seller_id) {
      const u = (await tx.execute({ sql: "SELECT id,name FROM users WHERE id=?", args: [Number(b.seller_id)] })).rows[0];
      if (u) { sellerId = Number(u.id); sellerName = String(u.name); }
    }
    const st = (await tx.execute({ sql: "SELECT series,name FROM stores WHERE id=?", args: [storeId] })).rows[0];
    let seq = Number((await tx.execute({ sql: "SELECT COALESCE(MAX(seq),0) AS n FROM sales WHERE store_id=?", args: [storeId] })).rows[0].n);
    const [yy, mm, dd] = day.split("-");
    let done = 0, sales = 0;
    const skipped: string[] = [];
    let created = 0;
    for (const it of fresh.slice(0, 300)) {
      const imei = clean(it.imei)?.replace(/\D/g, "") || null;
      const model = clean(it.model) ?? "Celular";
      if (imei) {
        const ex = (await tx.execute({ sql: "SELECT id,status FROM products WHERE imei1=? OR imei2=? ORDER BY (status='stock') DESC LIMIT 1", args: [imei, imei] })).rows[0];
        if (ex) {
          if (ex.status === "stock") ids.push(Number(ex.id)); else skipped.push(`${model} (${imei}) ya figuraba como ${ex.status === "sold" ? "vendido" : "incautado"}`);
          continue;
        }
      }
      const ins = await tx.execute({
        sql: "INSERT INTO products (kind,store_id,brand,model,imei1,color,qty,status,entry_date,created_by) VALUES ('celular',?,?,?,?,?,1,'stock',?,?)",
        args: [storeId, model.split(" ")[0], model, imei, clean(it.color), day, g.user.name],
      });
      ids.push(Number(ins.lastInsertRowid));
      created++;
    }
    for (const id of ids) {
      const p = (await tx.execute({ sql: "SELECT * FROM products WHERE id=?", args: [id] })).rows[0];
      if (!p || p.status !== "stock") { skipped.push(p ? String(p.model) : `#${id}`); continue; }
      const qty = Number(p.qty) || 1;
      const note = `Vendido el ${dd}/${mm}/${yy} en ${st.name}${b.seller_id ? ` por ${sellerName}` : ""}${price ? ` · S/ ${price.toFixed(2)}` : ""}`;
      await tx.execute({ sql: "UPDATE products SET qty=0, status='sold', store_id=?, notes=? WHERE id=?", args: [storeId, [p.notes, note].filter(Boolean).join(" | "), id] });
      done++;
      if (price) {
        seq++;
        const item = { kind: p.kind, brand: p.brand, model: p.model, ram: p.ram, storage: p.storage, color: p.color, condition: p.condition, imei1: p.imei1, imei2: p.imei2, ident: p.ident, code: p.code };
        const total = price * qty;
        const ins = await tx.execute({
          sql: `INSERT INTO sales (store_id,seq,number,product_id,seller_id,seller_name,item,qty,price,suggested,cost,customer_name,phone,dni,day,status,late,manual)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'ok',0,0)`,
          args: [storeId, seq, `${st.series}-${String(seq).padStart(6, "0")}`, id, sellerId, sellerName, JSON.stringify(item), qty, total, p.price_suggested ?? null,
            p.cost != null ? Number(p.cost) * qty : null, clean(b.customer_name) ?? "Cliente varios", clean(b.phone), clean(b.dni), day],
        });
        await tx.execute({ sql: "INSERT INTO payments (sale_id,method,amount) VALUES (?,?,?)", args: [Number(ins.lastInsertRowid), method, total] });
        sales++;
      }
    }
    if (done) await tx.execute({ sql: "INSERT INTO alerts (type,message,store_id,flagged) VALUES ('venta',?,?,0)", args: [`${g.user.name} marcó ${done} equipo(s) como vendido(s) desde el stock (${st.name}, ${dd}/${mm}/${yy})${sales ? ` con ${sales} venta(s) registrada(s)` : ""}.`, storeId] });
    await tx.commit();
    return NextResponse.json({ ok: true, done, sales, skipped, created });
  } catch (e) {
    await tx.rollback();
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo marcar como vendido" }, { status: 500 });
  } finally {
    tx.close();
  }
}
