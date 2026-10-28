import { NextRequest, NextResponse } from "next/server";
import { run } from "@/lib/db";
import { guard } from "@/lib/auth";
import { detectTelegramChats, getRecipients, getTelegram, sendTelegram, sendWhatsApp, type Recipient, type TgChat } from "@/lib/notify";

const save = (key: string, value: unknown) => run("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [key, JSON.stringify(value)]);

export async function GET() {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  return NextResponse.json({ recipients: await getRecipients(), telegram: await getTelegram() });
}

export async function PUT(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const b = (await req.json()) as { recipients?: Recipient[]; telegram?: { token: string; chats: TgChat[] } };
  const out: Record<string, unknown> = { ok: true };
  if (b.recipients) {
    const clean = b.recipients.filter((r) => r.phone?.trim() && r.apikey?.trim()).map((r) => ({ name: r.name?.trim() ?? "", phone: r.phone.replace(/[^\d+]/g, ""), apikey: r.apikey.trim() }));
    await save("wa_recipients", clean);
    out.recipients = clean;
  }
  if (b.telegram) {
    const chats = (b.telegram.chats ?? []).filter((c) => c.chat_id?.trim()).map((c) => ({ name: c.name?.trim() ?? "", chat_id: c.chat_id.trim() }));
    const token = (b.telegram.token ?? "").trim();
    await save("tg_token", token);
    await save("tg_chats", chats);
    out.telegram = { token, chats };
  }
  return NextResponse.json(out);
}

// action: "test" (WhatsApp), "test_tg" (Telegram) o "detect" (buscar chats que le escribieron al bot)
export async function POST(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const b = (await req.json().catch(() => ({}))) as { action?: string; token?: string };
  const msg = "✅ Planet Movil: mensaje de prueba. Recibirás aquí un aviso por cada venta.";
  if (b.action === "detect") {
    try { return NextResponse.json({ chats: await detectTelegramChats(String(b.token ?? "").trim()) }); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo consultar Telegram" }, { status: 400 }); }
  }
  if (b.action === "test_tg") return NextResponse.json({ results: await sendTelegram(msg) });
  return NextResponse.json({ results: await sendWhatsApp(msg) });
}
