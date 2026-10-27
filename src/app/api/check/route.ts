import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { findConflicts } from "@/lib/products";

// Aviso de duplicados mientras se escribe el código interno o se escanea el IMEI.
export async function GET(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;
  const sp = req.nextUrl.searchParams;
  const r = await findConflicts({
    code: sp.get("code") || null,
    imeis: [sp.get("imei1"), sp.get("imei2")],
    excludeId: sp.get("exclude") ? Number(sp.get("exclude")) : undefined,
  });
  return NextResponse.json(r);
}
