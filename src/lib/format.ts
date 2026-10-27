export const METHODS = ["Efectivo", "Yape", "Plin", "Tarjeta débito", "Tarjeta crédito", "Transferencia"];

export const soles = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === "" ? "—" : `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const limaToday = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => new Date(new Date(day + "T00:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
export const fmtDay = (d: string) => {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};
export const fmtTime = (iso: string) =>
  new Date(iso.replace(" ", "T") + (iso.includes("Z") || iso.includes("+") ? "" : "Z")).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });
export const fmtDateTime = (iso: string) =>
  new Date(iso.replace(" ", "T") + (iso.includes("Z") || iso.includes("+") ? "" : "Z")).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });

export const ramLabel = (r: number | null | undefined) => (r ? `${r}GB` : "—");
export const storageLabel = (s: number | null | undefined) => (!s ? "—" : s >= 1024 ? `${s / 1024}TB` : `${s}GB`);
export const specLabel = (ram: number | null | undefined, storage: number | null | undefined) =>
  [ram ? `${ram}GB RAM` : "", storage ? storageLabel(storage) : ""].filter(Boolean).join(" · ");

const U = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDOS", "VEINTITRES", "VEINTICUATRO", "VEINTICINCO", "VEINTISEIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
const D = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const C = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
function below1000(n: number): string {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100), r = n % 100;
  const parts = [C[c]];
  if (r < 30) parts.push(U[r]);
  else parts.push(D[Math.floor(r / 10)] + (r % 10 ? " Y " + U[r % 10] : ""));
  return parts.filter(Boolean).join(" ");
}
export function numberToWords(n: number): string {
  if (n === 0) return "CERO";
  const mil = Math.floor(n / 1000), r = n % 1000;
  const parts: string[] = [];
  if (mil) parts.push(mil === 1 ? "MIL" : below1000(mil).replace(/UNO$/, "UN") + " MIL");
  if (r) parts.push(below1000(r));
  return parts.join(" ");
}
/** 400 → "CUATROCIENTOS Y 00/100 SOLES" */
export function amountInWords(amount: number) {
  const int = Math.floor(amount + 1e-9);
  const cents = Math.round((amount - int) * 100);
  return `${numberToWords(int)} Y ${String(cents).padStart(2, "0")}/100 SOLES`;
}
