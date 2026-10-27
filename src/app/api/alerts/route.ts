import { NextRequest, NextResponse } from "next/server";
import { all, one, run } from "@/lib/db";
import { guard } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const g = await guard(["admin", "gerencia"]);
  if (g.error) return g.error;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);
  const alerts = await all("SELECT a.*, s.name AS store_name FROM alerts a LEFT JOIN stores s ON s.id=a.store_id ORDER BY a.id DESC LIMIT ?", [limit]);
  const unread = await one<{ n: number }>("SELECT COUNT(*) AS n FROM alerts WHERE read=0");
  return NextResponse.json({ alerts, unread: Number(unread?.n ?? 0) });
}

export async function POST() {
  const g = await guard(["admin", "gerencia"]);
  if (g.error) return g.error;
  await run("UPDATE alerts SET read=1 WHERE read=0");
  return NextResponse.json({ ok: true });
}
