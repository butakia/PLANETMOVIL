import { one } from "./db";

export type Recipient = { name?: string; phone: string; apikey: string };

export async function getRecipients(): Promise<Recipient[]> {
  const r = await one<{ value: string }>("SELECT value FROM settings WHERE key='wa_recipients'");
  try { return r ? (JSON.parse(r.value) as Recipient[]) : []; } catch { return []; }
}

/** Envía un mensaje de WhatsApp a cada destinatario configurado (servicio CallMeBot). Nunca lanza error. */
export async function sendWhatsApp(text: string): Promise<{ phone: string; ok: boolean; detail: string }[]> {
  const rec = await getRecipients();
  return Promise.all(rec.map(async (r) => {
    try {
      const url = "https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent(r.phone.replace(/\D/g, "")) + "&text=" + encodeURIComponent(text) + "&apikey=" + encodeURIComponent(r.apikey);
      const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
      return { phone: r.phone, ok: res.ok, detail: res.ok ? "enviado" : "error " + res.status };
    } catch (e) {
      return { phone: r.phone, ok: false, detail: e instanceof Error ? e.message : "sin respuesta" };
    }
  }));
}
