// Reporte de ventas en PDF con el mismo estilo del reporte de stock (colores por tienda, resumen arriba).
import { fmtDay, fmtTime, soles } from "./format";

export type SaleRow = {
  number: string; day: string; created_at: string; status: string; store_id: number; store_name: string; seller_name: string;
  customer_name: string | null; price: number; item: { kind: string; model: string; imei1?: string | null; code?: string | null; technician?: string | null };
  payments: { method: string; amount: number }[];
};
export type SalesMeta = { title: string; period: string; filters: string[]; storeColor: (id: number) => string; tag?: string };

const NAVY = "#1e3a8a";
const PAY_COLORS: Record<string, string> = { Efectivo: "#059669", Yape: "#7c3aed", Plin: "#0891b2", Transferencia: "#2563eb" };
const payColor = (m: string) => PAY_COLORS[m] ?? (m.toLowerCase().includes("tarjeta") ? "#ea580c" : "#64748b");
const TYPE_COLORS: Record<string, string> = { Celulares: "#1e3a8a", Accesorios: "#059669", "Servicio técnico": "#d97706" };
const typeOf = (k: string) => (k === "celular" ? "Celulares" : k === "servicio" ? "Servicio técnico" : "Accesorios");
const statusLabel = (s: string) => (s === "ok" ? "Válida" : s === "pending" ? "Por aprobar" : "Rechazada");

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
};
const tint = (hex: string, t: number): [number, number, number] => rgb(hex).map((c) => Math.round(c + (255 - c) * t)) as [number, number, number];
const nowLabel = () => new Date().toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" });
const group = (rows: SaleRow[], key: (r: SaleRow) => string) => {
  const m = new Map<string, { n: number; total: number }>();
  for (const r of rows) { const k = key(r); const g = m.get(k) ?? { n: 0, total: 0 }; g.n++; g.total += Number(r.price); m.set(k, g); }
  return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);
};

export async function downloadSalesPdf(allRows: SaleRow[], meta: SalesMeta) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 10;
  const rows = allRows;
  const ok = rows.filter((r) => r.status === "ok");
  const total = ok.reduce((s, r) => s + Number(r.price), 0);
  const pend = rows.filter((r) => r.status === "pending").length;
  const rej = rows.filter((r) => r.status === "rejected").length;

  // Cabecera
  doc.setFillColor(...rgb(NAVY)); doc.rect(0, 0, W, 26, "F");
  doc.setFillColor(...rgb("#10b981")); doc.rect(0, 26, W, 1.4, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text(meta.title, M, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.text(meta.period, M, 21);
  doc.setFontSize(9); doc.text(nowLabel(), W - M, 14, { align: "right" });
  doc.text(`${rows.length} registro${rows.length === 1 ? "" : "s"} en el reporte`, W - M, 21, { align: "right" });
  doc.setTextColor(100, 116, 139); doc.setFontSize(8.5);
  doc.text("Filtros: " + (meta.filters.length ? meta.filters.join("  ·  ") : "ninguno (todas las ventas del periodo)"), M, 35);

  // Tarjetas
  const cards: [string, string, string][] = [
    ["Total vendido", soles(total), "#059669"],
    ["Ventas válidas", String(ok.length), NAVY],
    ["Ticket promedio", ok.length ? soles(total / ok.length) : "S/ 0.00", "#0891b2"],
    ["Por aprobar / rechazadas", `${pend} / ${rej}`, "#d97706"],
  ];
  const cw = (W - 2 * M - 12) / 4;
  cards.forEach(([label, value, color], i) => {
    const x = M + i * (cw + 4);
    doc.setFillColor(...tint(color, 0.9)); doc.roundedRect(x, 39, cw, 20, 3, 3, "F");
    doc.setFillColor(...rgb(color)); doc.roundedRect(x, 39, 2.2, 20, 1, 1, "F");
    doc.setTextColor(...rgb(color)); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(value, x + 7, 51);
    doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text(label, x + 7, 56.5);
  });

  const half = (W - 2 * M - 8) / 2;
  const bars = (x: number, y: number, title: string, data: { name: string; n: number; total: number; color: string }[]) => {
    doc.setFillColor(...rgb("#1e293b")); doc.rect(x, y, half, 7.2, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.text(title, x + 2.5, y + 5);
    const mx = Math.max(1, ...data.map((d) => d.total));
    data.slice(0, 6).forEach((d, i) => {
      const yy = y + 7.2 + i * 7.6;
      if (i % 2) { doc.setFillColor(248, 250, 252); doc.rect(x, yy, half, 7.6, "F"); }
      doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.text(d.name.slice(0, 20), x + 2.5, yy + 5);
      const bx = x + 38, bw = half - 38 - 36;
      doc.setFillColor(...tint(d.color, 0.82)); doc.roundedRect(bx, yy + 1.6, bw, 4.4, 1.2, 1.2, "F");
      doc.setFillColor(...rgb(d.color)); doc.roundedRect(bx, yy + 1.6, Math.max(2, (bw * d.total) / mx), 4.4, 1.2, 1.2, "F");
      doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "normal"); doc.text(`${soles(d.total)}  (${d.n})`, x + half - 2.5, yy + 5, { align: "right" });
    });
  };

  const byStore = group(ok, (r) => String(r.store_id)).map((g) => ({ ...g, id: Number(g.name), name: ok.find((r) => String(r.store_id) === g.name)?.store_name ?? g.name, color: meta.storeColor(Number(g.name)) }));
  const byPay = new Map<string, { n: number; total: number }>();
  for (const r of ok) for (const p of r.payments) { const g = byPay.get(p.method) ?? { n: 0, total: 0 }; g.n++; g.total += Number(p.amount); byPay.set(p.method, g); }
  const payData = [...byPay.entries()].map(([name, v]) => ({ name, ...v, color: payColor(name) })).sort((a, b) => b.total - a.total);
  const bySeller = group(ok, (r) => r.seller_name).map((g) => ({ ...g, color: "#1e3a8a" }));
  const byType = group(ok, (r) => typeOf(r.item.kind)).map((g) => ({ ...g, color: TYPE_COLORS[g.name] ?? "#64748b" }));

  bars(M, 65, "Ventas por tienda", byStore);
  bars(M + half + 8, 65, "Ventas por medio de pago", payData);
  const y2 = 65 + 7.2 + Math.max(Math.min(byStore.length, 6), Math.min(payData.length, 6)) * 7.6 + 8;
  bars(M, y2, "Ventas por vendedora", bySeller);
  bars(M + half + 8, y2, "Ventas por tipo (celular / accesorio / servicio)", byType);

  // Detalle por tienda
  doc.addPage();
  let y = M;
  const storeIds = [...new Set(rows.map((r) => r.store_id))].sort((a, b) => a - b);
  for (const id of storeIds) {
    const list = rows.filter((r) => r.store_id === id);
    const t = list.filter((r) => r.status === "ok").reduce((s, r) => s + Number(r.price), 0);
    const color = meta.storeColor(id);
    if (y > H - 45) { doc.addPage(); y = M; }
    doc.setFillColor(...rgb(color)); doc.roundedRect(M, y, W - 2 * M, 9, 2, 2, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(list[0].store_name, M + 4, y + 6.2);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`${list.filter((r) => r.status === "ok").length} venta${list.filter((r) => r.status === "ok").length === 1 ? "" : "s"}  ·  ${soles(t)}`, W - M - 4, y + 6.1, { align: "right" });
    autoTable(doc, {
      startY: y + 11, margin: { left: M, right: M, bottom: 14 },
      head: [["N°", "Fecha", "Hora", "Vendedora", "Detalle", "Cliente", "Pago", "Monto", "Estado"]],
      body: list.map((r) => [
        r.number, fmtDay(r.day), fmtTime(r.created_at), r.seller_name,
        r.item.model + (r.item.technician ? ` (téc. ${r.item.technician})` : ""),
        r.customer_name ?? "-", r.payments.map((p) => `${p.method} ${soles(p.amount)}`).join(" + "), soles(r.price), statusLabel(r.status),
      ]),
      foot: [["", "", "", "", "", "", "Total válidas", soles(t), ""]],
      theme: "plain",
      styles: { fontSize: 8, cellPadding: { top: 1.7, bottom: 1.7, left: 2, right: 2 }, textColor: [30, 41, 59], overflow: "linebreak" },
      headStyles: { fillColor: rgb("#1e293b"), textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: tint(color, 0.88), textColor: rgb(color), fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 24, fontStyle: "bold" }, 1: { cellWidth: 19 }, 2: { cellWidth: 19 }, 3: { cellWidth: 24 }, 7: { halign: "right", cellWidth: 24, fontStyle: "bold" }, 8: { cellWidth: 20 } },
      didParseCell: (d) => {
        if (d.section !== "body") return;
        const r = list[d.row.index];
        d.cell.styles.fillColor = r.status === "pending" ? [254, 243, 199] : d.row.index % 2 ? [248, 250, 252] : [255, 255, 255];
        if (r.status === "rejected") d.cell.styles.textColor = [148, 163, 184];
        else if (d.column.index === 7) d.cell.styles.textColor = rgb("#047857");
      },
      didDrawCell: (d) => {
        if (d.section === "body" && d.column.index === 0) { doc.setFillColor(...rgb(TYPE_COLORS[typeOf(list[d.row.index].item.kind)] ?? "#64748b")); doc.rect(d.cell.x, d.cell.y, 1.4, d.cell.height, "F"); }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.line(M, H - 9, W - M, H - 9);
    doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(`${meta.title}  ·  ${nowLabel()}`, M, H - 4.5);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 4.5, { align: "right" });
  }
  doc.save(`reporte-ventas${meta.tag ? "-" + meta.tag.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : ""}-${meta.period.replace(/[^\d]+/g, "-").replace(/^-|-$/g, "")}.pdf`);
}
