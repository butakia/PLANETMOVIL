import { NextRequest, NextResponse, after } from "next/server";
import { sendWhatsApp } from "@/lib/notify";
import { all, db } from "@/lib/db";
import { guard, limaDay } from "@/lib/auth";
import { clean, num, type Product } from "@/lib/products";

const EDITABLE = ["brand", "model", "ram", "storage", "color", "condition", "imei1", "imei2"] as const;

export async function GET(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;
  const sp = req.nextUrl.searchParams;
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (g.user.role === "seller") { where.push("s.seller_id=?"); args.push(g.user.id); }
  else if (sp.get("seller")) { where.push("s.seller_id=?"); args.push(Number(sp.get("seller"))); }
  if (sp.get("from")) { where.push("s.day>=?"); args.push(sp.get("from")!); }
  if (sp.get("to")) { where.push("s.day<=?"); args.push(sp.get("to")!); }
  if (sp.get("store")) { where.push("s.store_id=?"); args.push(Number(sp.get("store"))); }
  if (sp.get("status")) { where.push("s.status=?"); args.push(sp.get("status")!); }
  const q = sp.get("q")?.trim();
  if (q) {
    where.push("(s.item LIKE ? OR s.customer_name LIKE ? OR s.number LIKE ? OR s.dni LIKE ?)");
    const like = `%${q}%`;
    args.push(like, like, like, like);
  }
  if (sp.get("method")) { where.push("EXISTS (SELECT 1 FROM payments p WHERE p.sale_id=s.id AND p.method=?)"); args.push(sp.get("method")!); }
  const rows = await all<Record<string, unknown>>(
    `SELECT s.*, st.name AS store_name FROM sales s JOIN stores st ON st.id=s.store_id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY s.id DESC LIMIT 500`,
    args,
  );
  const pays = rows.length
    ? await all<{ sale_id: number; method: string; amount: number }>(`SELECT sale_id,method,amount FROM payments WHERE sale_id IN (${rows.map(() => "?").join(",")})`, rows.map((r) => r.id as number))
    : [];
  const sales = rows.map((r) => {
    const out: Record<string, unknown> = { ...r, item: JSON.parse(String(r.item)), modified: r.modified ? JSON.parse(String(r.modified)) : null, payments: pays.filter((p) => p.sale_id === r.id) };
    if (g.user.role === "seller") delete out.cost;
    return out;
  });
  return NextResponse.json({ sales });
}

type Manual = { model?: string; ram?: unknown; storage?: unknown; color?: string; condition?: string; imei1?: string; imei2?: string; code?: string; store_id?: number };

export async function POST(req: NextRequest) {
  const g = await guard(["admin", "seller"]);
  if (g.error) return g.error;
  const b = await req.json();
  const today = limaDay();
  const late = !!b.late;
  let day = today;
  if (late) {
    day = String(b.sale_date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today) return NextResponse.json({ error: "Elige la fecha en que se hizo la venta" }, { status: 400 });
  }
  const c = await db();
  const tx = await c.transaction("write");
  try {
    const price = Number(b.price);
    if (!(price > 0)) throw new Error("Ingresa el monto de la venta");
    const payments = (b.payments as { method: string; amount: number }[]).filter((x) => Number(x.amount) > 0);
    const paid = payments.reduce((s, x) => s + Number(x.amount), 0);
    if (!payments.length || Math.abs(paid - price) > 0.01) throw new Error(`Los pagos (S/ ${paid.toFixed(2)}) no suman el monto (S/ ${price.toFixed(2)})`);

    let p: Product | null = null;
    let storeId: number;
    let qty = 1;
    let item: Record<string, unknown>;
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (b.product_id) {
      const pr = await tx.execute({ sql: "SELECT * FROM products WHERE id=?", args: [Number(b.product_id)] });
      p = pr.rows[0] ? ({ ...pr.rows[0] } as unknown as Product) : null;
      if (!p || p.status !== "stock") throw new Error("Ese equipo ya no está disponible en stock");
      if (p.store_id === 0) throw new Error("Ese equipo está en el almacén general. Trasládalo primero a una tienda.");
      if (g.user.role === "seller" && p.store_id !== g.user.store_id) throw new Error("Ese equipo está en la otra tienda. Trasládalo primero.");
      storeId = p.store_id;
      qty = p.kind === "accesorio" ? Math.min(Math.max(1, Number(b.qty) || 1), p.qty) : 1;
      const edits = (b.edits ?? {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { ...p };
      for (const k of EDITABLE) {
        if (!(k in edits)) continue;
        const nv = k === "ram" || k === "storage" ? num(edits[k]) : clean(edits[k]);
        if ((nv ?? null) !== ((p as unknown as Record<string, unknown>)[k] ?? null)) {
          changes[k] = { from: (p as unknown as Record<string, unknown>)[k] ?? null, to: nv };
          next[k] = nv;
        }
      }
      const changed = Object.keys(changes);
      // En una venta fuera de tiempo el stock no se toca hasta que el administrador apruebe.
      if (!late && changed.length)
        await tx.execute({ sql: `UPDATE products SET ${changed.map((k) => `${k}=?`).join(",")} WHERE id=?`, args: [...changed.map((k) => next[k] as string | number | null), p.id] });
      item = { kind: p.kind, brand: next.brand, model: next.model, ram: next.ram, storage: next.storage, color: next.color, condition: next.condition, imei1: next.imei1, imei2: next.imei2, ident: p.ident, code: p.code };
    } else if (b.manual) {
      const m = b.manual as Manual;
      if (!clean(m.model)) throw new Error("Escribe el modelo del equipo");
      storeId = g.user.role === "seller" ? (g.user.store_id ?? 1) : [2, 3, 4].includes(Number(m.store_id)) ? Number(m.store_id) : 1;
      item = { kind: "celular", brand: null, model: clean(m.model), ram: num(m.ram), storage: num(m.storage), color: clean(m.color), condition: clean(m.condition), imei1: clean(m.imei1), imei2: clean(m.imei2), ident: null, code: clean(m.code) };
    } else if (b.accessory) {
      const a = b.accessory as { name?: string; detail?: string; store_id?: number };
      const name = clean(a.name);
      if (!name) throw new Error("Elige el accesorio");
      const detail = clean(a.detail);
      storeId = g.user.role === "seller" ? (g.user.store_id ?? 1) : [2, 3, 4].includes(Number(a.store_id)) ? Number(a.store_id) : 1;
      qty = Math.min(Math.max(1, Math.floor(Number(b.qty)) || 1), 999);
      item = { kind: "accesorio", brand: null, model: detail ? `${name} ${detail}` : name, ram: null, storage: null, color: null, condition: null, imei1: null, imei2: null, ident: null, code: null };
    } else throw new Error("Falta elegir o escribir el equipo");

    const store = (await tx.execute({ sql: "SELECT series,name FROM stores WHERE id=?", args: [storeId] })).rows[0];
    const seq = Number((await tx.execute({ sql: "SELECT COALESCE(MAX(seq),0)+1 AS n FROM sales WHERE store_id=?", args: [storeId] })).rows[0].n);
    const number = `${store.series}-${String(seq).padStart(6, "0")}`;
    const changed = Object.keys(changes);
    const ins = await tx.execute({
      sql: `INSERT INTO sales (store_id,seq,number,product_id,seller_id,seller_name,item,qty,price,suggested,cost,customer_name,phone,dni,modified,day,status,late,manual)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [storeId, seq, number, p?.id ?? null, g.user.id, g.user.name, JSON.stringify(item), qty, price, p?.price_suggested ?? null,
        p && p.cost !== null && p.cost !== undefined ? Number(p.cost) * qty : null, clean(b.customer_name) ?? "Cliente varios", clean(b.phone), clean(b.dni),
        changed.length ? JSON.stringify(changes) : null, day, late ? "pending" : "ok", late ? 1 : 0, p || b.accessory ? 0 : 1],
    });
    const saleId = Number(ins.lastInsertRowid);
    for (const x of payments) await tx.execute({ sql: "INSERT INTO payments (sale_id,method,amount) VALUES (?,?,?)", args: [saleId, x.method, Number(x.amount)] });

    if (p && !late) {
      const left = p.qty - qty;
      await tx.execute({ sql: "UPDATE products SET qty=?, status=?, seller=? WHERE id=?", args: [left, left <= 0 ? "sold" : "stock", left <= 0 ? g.user.name : null, p.id] });
    }

    const noStock = !p && !b.accessory;
    const desc = [qty > 1 && item.kind === "accesorio" ? `${qty}×` : "", item.model, item.ram ? `${item.ram}GB RAM` : "", item.storage ? `${item.storage}GB` : ""].filter(Boolean).join(" ");
    const [yy, mm, dd] = day.split("-");
    let type = "venta", flagged = 0, message = `${g.user.name} vendió ${desc} por S/ ${price.toFixed(2)} en ${store.name}`;
    if (late) { type = "venta_tardia"; flagged = 1; message = `${g.user.name} registró una venta FUERA DE TIEMPO del ${dd}/${mm}/${yy}: ${desc} por S/ ${price.toFixed(2)} en ${store.name}${noStock ? " (equipo no registrado en stock)" : ""}. Pendiente de tu aprobación.`; }
    else if (noStock) { type = "venta_manual"; flagged = 1; message += " — equipo NO registrado en stock (venta manual)"; }
    else if (changed.length) { type = "venta_modificada"; flagged = 1; message += ` — con ${changed.length} corrección(es): ${changed.map((k) => `${k}: ${changes[k].from ?? "—"} → ${changes[k].to ?? "—"}`).join(", ")}`; }
    await tx.execute({ sql: "INSERT INTO alerts (type,message,sale_id,store_id,flagged) VALUES (?,?,?,?,?)", args: [type, message, saleId, storeId, flagged] });
    await tx.commit();
    const head = late ? "⏰ VENTA FUERA DE TIEMPO" : noStock ? "🛒 NUEVA VENTA (equipo manual)" : "🛒 NUEVA VENTA";
    const wa = [
      head + " " + number,
      String(desc),
      "S/ " + price.toFixed(2) + " — " + payments.map((x) => x.method + " " + Number(x.amount).toFixed(2)).join(" + "),
      store.name + " · " + g.user.name,
      ...(changed.length ? ["⚠ Datos corregidos: " + changed.map((k) => k + ": " + (changes[k].from ?? "—") + " → " + (changes[k].to ?? "—")).join(", ")] : []),
      ...(late ? ["Pendiente de tu aprobación (venta del " + dd + "/" + mm + "/" + yy + ")"] : []),
    ].join("\n");
    after(() => sendWhatsApp(wa));
    return NextResponse.json({ ok: true, id: saleId, number });
  } catch (e) {
    await tx.rollback();
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al registrar la venta" }, { status: 400 });
  } finally {
    tx.close();
  }
}
