import { one } from "./db";

export type Recipient = { name?: string; phone: string; apikey: string };
export type TgChat = { name?: string; chat_id: string };
export type Result = { phone: string; ok: boolean; detail: string };

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const r = await one<{ value: string }>("SELECT value FROM settings WHERE key=?", [key]);
  try { return r ? (JSON.parse(r.value) as T) : fallback; } catch { return fallback; }
}
export const getRecipients = () => getSetting<Recipient[]>("wa_recipients", []);
export const getTelegram = async () => ({ token: await getSetting<string>("tg_token", ""), chats: await getSetting<TgChat[]>("tg_chats", []) });

/** Texto de la respuesta sin etiquetas HTML y corto, para mostrar el motivo real del fallo. */
const plain = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);

/** Motivos frecuentes de CallMeBot, explicados en español. */
function hint(body: string): string {
  const b = body.toLowerCase();
  if (/apikey.*(invalid|incorrect)|invalid.*apikey|wrong.*key/.test(b)) return "La clave (apikey) no es válida. Hay que pedir una nueva al bot.";
  if (/not.*(activated|registered|found)|no.*apikey/.test(b)) return "Ese número no está activado en CallMeBot.";
  if (/0 messages|limit|quota|too many/.test(b)) return "Se acabó el límite diario de mensajes del servicio gratuito.";
  if (/paus|stopp|suspend|resume/.test(b)) return "El servicio está en pausa para ese número (envía “resume” al bot desde WhatsApp).";
  if (/full|no.*slots/.test(b)) return "CallMeBot está lleno y no admite activaciones nuevas.";
  return "";
}

/** Envía un WhatsApp a cada destinatario configurado (CallMeBot). Revisa el contenido de la respuesta, no solo el código HTTP. Nunca lanza error. */
export async function sendWhatsApp(text: string): Promise<Result[]> {
  const rec = await getRecipients();
  return Promise.all(rec.map(async (r) => {
    try {
      const url = "https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent(r.phone.replace(/[^\d]/g, "")) + "&text=" + encodeURIComponent(text) + "&apikey=" + encodeURIComponent(r.apikey);
      const res = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "Mozilla/5.0 (PlanetMovil)" } });
      const body = plain(await res.text().catch(() => ""));
      const failed = !res.ok || /error|invalid|not\s+(activated|registered|found)|0 messages|limit|forbidden|unauthori|paus|stopp|suspend|full/i.test(body);
      const why = hint(body);
      return { phone: r.phone, ok: !failed, detail: failed ? `${why || "CallMeBot respondió con un error"} (${res.status}${body ? ": " + body : ""})` : body || "enviado" };
    } catch (e) {
      return { phone: r.phone, ok: false, detail: e instanceof Error && e.name !== "TimeoutError" ? e.message : "CallMeBot no respondió (el servicio puede estar caído)" };
    }
  }));
}

/** Telegram (bot oficial y gratuito): llega al celular de cada persona que le haya escrito al bot. */
export async function sendTelegram(text: string, tg?: { token: string; chats: TgChat[] }): Promise<Result[]> {
  const { token, chats } = tg ?? (await getTelegram());
  if (!token) return [];
  return Promise.all(chats.filter((c) => c.chat_id?.trim()).map(async (c) => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
        method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(12000),
        body: JSON.stringify({ chat_id: c.chat_id.trim(), text }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
      return { phone: c.name || c.chat_id, ok: !!j.ok, detail: j.ok ? "enviado" : j.description ?? `error ${res.status}` };
    } catch (e) {
      return { phone: c.name || c.chat_id, ok: false, detail: e instanceof Error ? e.message : "sin respuesta" };
    }
  }));
}

/** Aviso de venta: sale por WhatsApp y por Telegram a quien esté configurado. */
export async function sendNotify(text: string) {
  const [wa, tg] = await Promise.all([sendWhatsApp(text), sendTelegram(text)]);
  return { whatsapp: wa, telegram: tg };
}

/** Chats que le escribieron al bot (para no tener que buscar el chat_id a mano). */
export async function detectTelegramChats(token: string): Promise<TgChat[]> {
  const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/getUpdates`, { signal: AbortSignal.timeout(12000) });
  const j = (await res.json()) as { ok?: boolean; description?: string; result?: { message?: { chat?: { id: number; first_name?: string; last_name?: string; title?: string; username?: string } } }[] };
  if (!j.ok) throw new Error(j.description ?? "Token no válido");
  const seen = new Map<string, TgChat>();
  for (const u of j.result ?? []) {
    const c = u.message?.chat;
    if (c) seen.set(String(c.id), { chat_id: String(c.id), name: c.title ?? ([c.first_name, c.last_name].filter(Boolean).join(" ") || c.username || "") });
  }
  return [...seen.values()];
}
