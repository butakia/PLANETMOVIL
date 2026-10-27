import { NextRequest, NextResponse } from "next/server";
import { run } from "@/lib/db";
import { guard } from "@/lib/auth";
import { getRecipients, sendWhatsApp, type Recipient } from "@/lib/notify";

export async function GET() {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  return NextResponse.json({ recipients: await getRecipients() });
}

export async function PUT(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const { recipients } = (await req.json()) as { recipients: Recipient[] };
  const clean = (recipients ?? []).filter((r) => r.phone?.trim() && r.apikey?.trim()).map((r) => ({ name: r.name?.trim() ?? "", phone: r.phone.replace(/[^\d+]/g, ""), apikey: r.apikey.trim() }));
  await run("INSERT INTO settings (key,value) VALUES ('wa_recipients',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [JSON.stringify(clean)]);
  return NextResponse.json({ ok: true, recipients: clean });
}

export async function POST() {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const results = await sendWhatsApp("✅ Planet Movil: mensaje de prueba. Recibirás aquí un aviso por cada venta.");
  return NextResponse.json({ results });
}
