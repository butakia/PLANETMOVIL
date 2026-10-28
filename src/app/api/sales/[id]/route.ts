import { NextRequest, NextResponse } from "next/server";
import { all, db, one, run } from "@/lib/db";
import { guard } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.error) return g.error;
  const id = Number((await params).id);
  const s = await one<Record<string, unknown>>(
    "SELECT s.*, st.name AS store_name, st.address AS store_address, st.phone AS store_phone, st.ruc AS store_ruc, st.owner AS store_owner FROM sales s JOIN stores st ON st.id=s.store_id WHERE s.id=?",
    [id],
  );
  if (!s || (g.user.role === "seller" && s.seller_id !== g.user.id)) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const payments = await all("SELECT method,amount FROM payments WHERE sale_id=?", [id]);
  delete s.cost;
  return NextResponse.json({ sale: { ...s, item: JSON.parse(String(s.item)), modified: s.modified ? JSON.parse(String(s.modified)) : null, payments } });
}

// Anular una venta (solo administrador): devuelve el equipo al stock y deja constancia en alertas.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const id = Number((await params).id);
  const s = await one<{ id: number; number: string; product_id: number; qty: number; price: number; store_id: number; item: string }>("SELECT id,number,product_id,qty,price,store_id,item FROM sales WHERE id=?", [id]);
  if (!s) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const tx = await (await db()).transaction("write");
  try {
    await tx.execute({ sql: "UPDATE products SET qty=qty+?, status='stock', seller=NULL WHERE id=?", args: [s.qty, s.product_id] });
    await tx.execute({ sql: "DELETE FROM payments WHERE sale_id=?", args: [id] });
    await tx.execute({ sql: "DELETE FROM sales WHERE id=?", args: [id] });
    await tx.execute({ sql: "UPDATE alerts SET sale_id=NULL WHERE sale_id=?", args: [id] });
    await tx.execute({ sql: "INSERT INTO alerts (type,message,store_id,flagged) VALUES ('anulacion',?,?,1)", args: [`${g.user.name} anuló la venta ${s.number} (${JSON.parse(s.item).model}, S/ ${Number(s.price).toFixed(2)}). El equipo volvió al stock.`, s.store_id] });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    return NextResponse.json({ error: "No se pudo anular" }, { status: 500 });
  } finally { tx.close(); }
  return NextResponse.json({ ok: true });
}

// Aprobar o rechazar una venta fuera de tiempo (solo administrador).
// Al aprobar se descuenta del stock; al rechazar el stock no se toca.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const id = Number((await params).id);
  const { action } = await req.json();
  const s = await one<{ id: number; status: string; product_id: number | null; qty: number; modified: string | null }>("SELECT id,status,product_id,qty,modified FROM sales WHERE id=?", [id]);
  if (!s || s.status !== "pending") return NextResponse.json({ error: "Esta venta ya no está pendiente" }, { status: 400 });
  if (action === "reject") {
    await run("UPDATE sales SET status='rejected' WHERE id=?", [id]);
    return NextResponse.json({ ok: true });
  }
  const tx = await (await db()).transaction("write");
  try {
    if (s.product_id) {
      const pr = (await tx.execute({ sql: "SELECT qty,status FROM products WHERE id=?", args: [s.product_id] })).rows[0];
      if (!pr || pr.status !== "stock" || Number(pr.qty) < s.qty) throw new Error("El equipo ya no está en stock (¿se vendió o se eliminó?). Rechaza esta venta o corrige el stock.");
      const changes = s.modified ? (JSON.parse(s.modified) as Record<string, { to: unknown }>) : {};
      const cols = Object.keys(changes).filter((k) => ["brand", "model", "ram", "storage", "color", "condition", "imei1", "imei2"].includes(k));
      if (cols.length) await tx.execute({ sql: `UPDATE products SET ${cols.map((k) => `${k}=?`).join(",")} WHERE id=?`, args: [...cols.map((k) => changes[k].to as string | number | null), s.product_id] });
      const left = Number(pr.qty) - s.qty;
      await tx.execute({ sql: "UPDATE products SET qty=?, status=? WHERE id=?", args: [left, left <= 0 ? "sold" : "stock", s.product_id] });
    }
    await tx.execute({ sql: "UPDATE sales SET status='ok' WHERE id=?", args: [id] });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo aprobar" }, { status: 400 });
  } finally { tx.close(); }
  return NextResponse.json({ ok: true });
}
