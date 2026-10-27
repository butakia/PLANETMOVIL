"use client";
import { jsPDF } from "jspdf";
import { amountInWords, fmtDateTime, specLabel } from "./format";

export type SaleDoc = {
  id: number; number: string; created_at: string; day: string; qty: number; price: number; seller_name: string; status?: string; late?: number; manual?: number;
  customer_name: string | null; phone: string | null; dni: string | null;
  store_name: string; store_address: string; store_phone: string; store_ruc: string; store_owner: string;
  item: { kind: string; brand: string | null; model: string; ram: number | null; storage: number | null; color: string | null; condition: string | null; imei1: string | null; imei2: string | null; ident: string | null; code: string | null };
  payments: { method: string; amount: number }[];
};

export const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function describe(s: SaleDoc) {
  const i = s.item;
  const parts = [i.kind === "celular" ? "CELULAR" : "", i.model.toUpperCase()];
  if (i.ram) parts.push(`${i.ram}GB RAM`);
  if (i.storage) parts.push(`${i.storage >= 1024 ? i.storage / 1024 + "TB" : i.storage + "GB"} ALMACENAMIENTO`);
  if (i.color) parts.push(`COLOR ${i.color.toUpperCase()}`);
  const lines = [parts.filter(Boolean).join(" ")];
  if (i.imei1) lines.push(`IMEI 1: ${i.imei1}`);
  if (i.imei2) lines.push(`IMEI 2: ${i.imei2}`);
  if (i.ident) lines.push(`Cód. identificación: ${i.ident}`);
  if (i.code) lines.push(`Cód. interno: ${i.code}`);
  return lines;
}

export function buildReceiptPdf(s: SaleDoc) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 14, R = 196;
  const line = (x1: number, y1: number, x2: number, y2: number, w = 0.2) => { doc.setLineWidth(w); doc.line(x1, y1, x2, y2); };

  doc.setDrawColor(60); doc.setLineWidth(0.4); doc.rect(10, 10, 190, 150);

  // Cabecera: datos de la tienda + recuadro con número
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text((s.store_owner || s.store_name).toUpperCase(), L, 22);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  const head = [s.store_owner ? `Nombre comercial: ${s.store_name}` : "", s.store_address, s.store_phone ? `Tel.: ${s.store_phone}` : ""].filter(Boolean);
  head.forEach((t, i) => doc.text(t, L, 28 + i * 4.5));

  doc.setLineWidth(0.4); doc.rect(124, 14, 72, 24);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("CONSTANCIA DE VENTA", 160, 22, { align: "center" });
  if (s.store_ruc) { doc.setFontSize(10); doc.text(`RUC: ${s.store_ruc}`, 160, 29, { align: "center" }); }
  doc.setFontSize(11); doc.text(`N° ${s.number}`, 160, s.store_ruc ? 35 : 31, { align: "center" });

  // Datos de la venta
  const rows: [string, string][] = [
    ["Fecha de emisión", fmtDateTime(s.created_at)],
    ["Señor(es)", s.customer_name || "Cliente varios"],
    ["DNI", s.dni || "—"],
    ["Celular", s.phone || "—"],
    ["Tipo de moneda", "SOLES"],
    ["Atendido por", s.seller_name],
  ];
  doc.setFontSize(8.5);
  rows.forEach(([k, v], i) => {
    const y = 49 + i * 5.2;
    doc.setFont("helvetica", "normal"); doc.text(k, L, y);
    doc.setFont("helvetica", "bold"); doc.text(`: ${v}`, 52, y);
  });

  // Tabla de detalle
  const ty = 84;
  doc.setFillColor(238, 240, 245); doc.rect(L - 2, ty - 5, R - L + 4, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("Cantidad", L, ty); doc.text("Unidad", 34, ty); doc.text("Descripción", 56, ty);
  doc.text("Valor unit.", 150, ty, { align: "right" }); doc.text("Importe", R, ty, { align: "right" });
  line(L - 2, ty + 3, R + 2, ty + 3, 0.3);
  doc.setFont("helvetica", "normal");
  const d = describe(s);
  doc.text(s.qty.toFixed(2), L + 3, ty + 9); doc.text("UNIDAD", 34, ty + 9);
  let dy = ty + 9;
  d.forEach((t, i) => { doc.setFont("helvetica", i === 0 ? "bold" : "normal"); (doc.splitTextToSize(t, 86) as string[]).forEach((l) => { doc.text(l, 56, dy); dy += 4.4; }); });
  doc.setFont("helvetica", "normal");
  doc.text(money(s.price / s.qty), 150, ty + 9, { align: "right" });
  doc.text(money(s.price), R, ty + 9, { align: "right" });

  // Totales
  const by = 128;
  line(L - 2, by - 6, R + 2, by - 6, 0.3);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text(`SON: ${amountInWords(s.price)}`, L, by);
  doc.setFont("helvetica", "normal");
  doc.text("Forma de pago:", L, by + 7);
  s.payments.forEach((p, i) => doc.text(`${p.method}: S/ ${money(p.amount)}`, L + 26, by + 7 + i * 4.4));
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Importe Total :", 150, by + 7, { align: "right" });
  doc.setLineWidth(0.3); doc.rect(152, by + 2.5, 44, 7.5);
  doc.text(`S/ ${money(s.price)}`, 194, by + 7.5, { align: "right" });

  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
  doc.text("Gracias por su compra. Conserve esta constancia como respaldo de su pago y para cualquier consulta o garantía.", 105, 155, { align: "center", maxWidth: 176 });
  return doc;
}

export async function shareReceipt(s: SaleDoc) {
  const doc = buildReceiptPdf(s);
  const blob = doc.output("blob");
  const file = new File([blob], `Constancia-${s.number}.pdf`, { type: "application/pdf" });
  const text = `Hola${s.customer_name ? " " + s.customer_name : ""}, gracias por tu compra en ${s.store_name}. Te enviamos tu constancia de venta ${s.number} por S/ ${money(s.price)}.`;
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text, title: `Constancia ${s.number}` }); return; } catch { /* cancelado */ }
  }
  doc.save(file.name);
  const digits = (s.phone ?? "").replace(/\D/g, "");
  const to = digits.length === 9 ? `51${digits}` : digits;
  window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, "_blank");
}

/** Ticket para tiquetera térmica (80 mm o 58 mm de ancho, alto automático). */
export function buildTicketPdf(s: SaleDoc, w: 80 | 58 = 80) {
  const draw = (doc: jsPDF) => {
    const m = 3, cw = w - 2 * m, cx = w / 2;
    const fs = w === 80 ? 8 : 7;
    const lh = fs * 0.46;
    let y = 6;
    const text = (t: string, o: { bold?: boolean; align?: "left" | "center"; size?: number } = {}) => {
      const size = o.size ?? fs;
      doc.setFont("courier", o.bold ? "bold" : "normal"); doc.setFontSize(size);
      (doc.splitTextToSize(t, cw) as string[]).forEach((l) => { doc.text(l, o.align === "center" ? cx : m, y, { align: o.align === "center" ? "center" : "left" }); y += size * 0.46; });
    };
    const pair = (a: string, b: string, bold = false) => { doc.setFont("courier", bold ? "bold" : "normal"); doc.setFontSize(fs); doc.text(a, m, y); doc.text(b, w - m, y, { align: "right" }); y += lh; };
    const hr = () => { y += 0.5; doc.setLineDashPattern([0.7, 0.7], 0); doc.setLineWidth(0.2); doc.line(m, y, w - m, y); doc.setLineDashPattern([], 0); y += lh; };

    text((s.store_owner || s.store_name).toUpperCase(), { bold: true, align: "center", size: fs + 1 });
    if (s.store_owner) text(`Nombre comercial: ${s.store_name}`, { align: "center" });
    if (s.store_ruc) text(`RUC: ${s.store_ruc}`, { align: "center" });
    if (s.store_address) text(s.store_address, { align: "center" });
    if (s.store_phone) text(`Tel.: ${s.store_phone}`, { align: "center" });
    hr();
    text("CONSTANCIA DE VENTA", { bold: true, align: "center", size: fs + 1 });
    text(`N° ${s.number}`, { bold: true, align: "center" });
    hr();
    text(`Fecha: ${fmtDateTime(s.created_at)}`);
    text(`Cliente: ${s.customer_name || "Cliente varios"}`);
    if (s.dni) text(`DNI: ${s.dni}`);
    if (s.phone) text(`Cel.: ${s.phone}`);
    text(`Atendido por: ${s.seller_name}`);
    hr();
    text("CANT  DESCRIPCION", { bold: true });
    y += 1;
    const d = describe(s);
    text(`${s.qty.toFixed(0)} x ${d[0]}`, { bold: true });
    d.slice(1).forEach((l) => text(l));
    y += 1;
    pair("P. unit.:", `S/ ${money(s.price / s.qty)}`);
    hr();
    pair("TOTAL:", `S/ ${money(s.price)}`, true);
    text(`SON: ${amountInWords(s.price)}`);
    y += 1;
    s.payments.forEach((p) => pair(p.method + ":", `S/ ${money(p.amount)}`));
    hr();
    text("Gracias por su compra.", { align: "center" });
    text("Conserve esta constancia como respaldo de su pago y garantia.", { align: "center" });
    return y;
  };
  const probe = new jsPDF({ unit: "mm", format: [w, 600] });
  const h = draw(probe) + 6;
  const doc = new jsPDF({ unit: "mm", format: [w, h] });
  draw(doc);
  return doc;
}

export function openTicket(s: SaleDoc, w: 80 | 58) {
  const doc = buildTicketPdf(s, w);
  doc.autoPrint();
  window.open(doc.output("bloburl").toString(), "_blank");
}
