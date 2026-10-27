import { NextRequest, NextResponse } from "next/server";
import { all, db, run } from "@/lib/db";
import { guard, limaDay } from "@/lib/auth";

// Equipos ficticios para practicar el flujo de venta. Todos quedan marcados is_test=1.
const TEST_ITEMS = [
  { code: "100", brand: "Samsung", model: "Samsung A15", ram: 4, storage: 128, color: "Negro", cond: "Sellado", store: 1, price: 450, imei1: "358721094561230", imei2: "358721094561248" },
  { code: "200", brand: "Samsung", model: "Samsung A16", ram: 4, storage: 128, color: "Azul", cond: "Sellado", store: 1, price: 520, imei1: "350000000000200", imei2: null },
  { code: "300", brand: "Samsung", model: "Samsung A17", ram: 6, storage: 128, color: "Verde", cond: "Abierto", store: 1, price: 600, imei1: "350000000000300", imei2: "350000000000318" },
  { code: "400", brand: "Samsung", model: "Samsung A18", ram: 8, storage: 256, color: "Negro", cond: "Sellado", store: 2, price: 700, imei1: "350000000000400", imei2: null },
  { code: "500", brand: "Honor", model: "Honor X7B", ram: 8, storage: 256, color: "Azul", cond: "Sellado", store: 2, price: 780, imei1: "350000000000500", imei2: null },
  { code: "600", brand: "Redmi", model: "Redmi 13C", ram: 4, storage: 128, color: "Negro", cond: "Sellado", store: 2, price: 420, imei1: "350000000000600", imei2: null },
];

async function deleteTest() {
  const c = await db();
  const ids = (await all<{ id: number }>("SELECT id FROM products WHERE is_test=1")).map((x) => x.id);
  if (!ids.length) return { products: 0, sales: 0 };
  const ph = ids.map(() => "?").join(",");
  const sales = (await all<{ id: number }>("SELECT id FROM sales WHERE product_id IN (" + ph + ")", ids)).map((x) => x.id);
  const stmts: { sql: string; args: (number)[] }[] = [];
  if (sales.length) {
    const sp = sales.map(() => "?").join(",");
    stmts.push({ sql: "DELETE FROM payments WHERE sale_id IN (" + sp + ")", args: sales });
    stmts.push({ sql: "DELETE FROM alerts WHERE sale_id IN (" + sp + ")", args: sales });
    stmts.push({ sql: "DELETE FROM sales WHERE id IN (" + sp + ")", args: sales });
  }
  stmts.push({ sql: "DELETE FROM movements WHERE product_id IN (" + ph + ")", args: ids });
  stmts.push({ sql: "DELETE FROM products WHERE id IN (" + ph + ")", args: ids });
  await c.batch(stmts, "write");
  return { products: ids.length, sales: sales.length };
}

export async function POST(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const { action } = await req.json();
  if (action === "delete") return NextResponse.json({ ok: true, ...(await deleteTest()) });

  // El equipo de demostración que se creó antes sin marca de prueba
  await run("UPDATE products SET is_test=1 WHERE imei1='358721094561230'");
  await deleteTest();
  const skipped: string[] = [];
  let created = 0;
  for (const t of TEST_ITEMS) {
    const clash = await all("SELECT id FROM products WHERE code=? AND status='stock'", [t.code]);
    if (clash.length) { skipped.push(t.code); continue; }
    await run("INSERT OR IGNORE INTO models (name,brand,def_ram,def_storage) VALUES (?,?,?,?)", [t.model, t.brand, t.ram, t.storage]);
    await run(
      "INSERT INTO products (kind,store_id,brand,model,imei1,imei2,code,ram,storage,color,condition,qty,price_suggested,entry_date,created_by,is_test) VALUES ('celular',?,?,?,?,?,?,?,?,?,?,1,?,?,?,1)",
      [t.store, t.brand, t.model, t.imei1, t.imei2, t.code, t.ram, t.storage, t.color, t.cond, t.price, limaDay(), g.user.name],
    );
    created++;
  }
  return NextResponse.json({ ok: true, created, skipped });
}
