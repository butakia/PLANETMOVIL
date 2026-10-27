import { NextRequest, NextResponse } from "next/server";
import { all } from "@/lib/db";
import { guard, limaDay } from "@/lib/auth";

// Informe automático: ventas del periodo + foto actual del stock.
export async function GET(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;
  const sp = req.nextUrl.searchParams;
  const seller = g.user.role === "seller";
  const from = sp.get("from") ?? limaDay();
  const to = sp.get("to") ?? from;
  const where = ["s.day>=?", "s.day<=?", "s.status='ok'"];
  const args: (string | number)[] = [from, to];
  if (seller) { where.push("s.seller_id=?"); args.push(g.user.id); }
  else if (sp.get("seller")) { where.push("s.seller_id=?"); args.push(Number(sp.get("seller"))); }
  if (sp.get("store")) { where.push("s.store_id=?"); args.push(Number(sp.get("store"))); }
  const W = where.join(" AND ");
  const profit = seller ? "NULL" : "SUM(CASE WHEN s.cost IS NOT NULL THEN s.price - s.cost END)";

  if (sp.get("lite")) {
    const [t] = await all(`SELECT COUNT(*) AS sales, COALESCE(SUM(s.price),0) AS revenue FROM sales s WHERE ${W}`, args);
    const [pn] = await all<{ n: number }>(`SELECT COUNT(*) AS n FROM sales WHERE status='pending'${seller ? " AND seller_id=" + Number(g.user.id) : ""}`);
    return NextResponse.json({ from, to, pending: Number(pn?.n ?? 0), totals: t });
  }
  const pendingQ = all<{ n: number }>(`SELECT COUNT(*) AS n FROM sales WHERE status='pending'${seller ? " AND seller_id=" + Number(g.user.id) : ""}`);
  const [totals, byStore, bySeller, byBrand, byDay, byMethod, stock, stockBrand] = await Promise.all([
    all(`SELECT COUNT(*) AS sales, COALESCE(SUM(s.qty),0) AS units, COALESCE(SUM(s.price),0) AS revenue, ${profit} AS profit,
         SUM(CASE WHEN s.modified IS NOT NULL THEN 1 ELSE 0 END) AS modified FROM sales s WHERE ${W}`, args),
    all(`SELECT st.id, st.name, st.color, COUNT(*) AS sales, SUM(s.price) AS revenue FROM sales s JOIN stores st ON st.id=s.store_id WHERE ${W} GROUP BY st.id`, args),
    all(`SELECT s.seller_id, s.seller_name, st.name AS store_name, COUNT(*) AS sales, SUM(s.price) AS revenue FROM sales s JOIN stores st ON st.id=s.store_id WHERE ${W} GROUP BY s.seller_id ORDER BY revenue DESC`, args),
    all(`SELECT COALESCE(json_extract(s.item,'$.brand'),'Otros') AS brand, COUNT(*) AS sales, SUM(s.price) AS revenue FROM sales s WHERE ${W} GROUP BY brand ORDER BY revenue DESC`, args),
    all(`SELECT s.day, COUNT(*) AS sales, SUM(s.price) AS revenue FROM sales s WHERE ${W} GROUP BY s.day ORDER BY s.day`, args),
    all(`SELECT p.method, SUM(p.amount) AS amount, COUNT(*) AS n FROM payments p JOIN sales s ON s.id=p.sale_id WHERE ${W} GROUP BY p.method ORDER BY amount DESC`, args),
    all(`SELECT st.id, st.name, st.color, COALESCE(SUM(p.qty),0) AS units, COALESCE(SUM(p.price_suggested*p.qty),0) AS value_suggested,
         ${seller ? "NULL" : "SUM(p.cost*p.qty)"} AS value_cost FROM stores st LEFT JOIN products p ON p.store_id=st.id AND p.status='stock' GROUP BY st.id
         UNION ALL SELECT 0, 'Almacén general', '#64748b', COALESCE(SUM(qty),0), COALESCE(SUM(price_suggested*qty),0), ${seller ? "NULL" : "SUM(cost*qty)"} FROM products WHERE store_id=0 AND status='stock'`),
    all(`SELECT COALESCE(p.brand,'Otros') AS brand, SUM(p.qty) AS units, COALESCE(SUM(p.price_suggested*p.qty),0) AS value_suggested
         FROM products p WHERE p.status='stock' GROUP BY brand ORDER BY units DESC`),
  ]);
  const pending = Number((await pendingQ)[0]?.n ?? 0);
  return NextResponse.json({ from, to, pending, totals: totals[0], byStore, bySeller, byBrand, byDay, byMethod, stock, stockBrand });
}
