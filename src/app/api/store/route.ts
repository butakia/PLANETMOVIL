import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { guard } from "@/lib/auth";

// La vendedora que rota elige en qué tienda está trabajando hoy.
export async function POST(req: NextRequest) {
  const g = await guard(["seller"]);
  if (g.error) return g.error;
  const { store_id } = await req.json();
  (await cookies()).set("pm_store", String([2, 3, 4].includes(Number(store_id)) ? Number(store_id) : 1), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.COOKIE_SECURE === "true" });
  return NextResponse.json({ ok: true });
}
