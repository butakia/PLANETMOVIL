// Reporte de stock descargable: PDF y Excel con el mismo estilo de la web (colores por tienda y marca, resumen arriba).
import { fmtDay, soles, storageLabel } from "./format";

export type ReportRow = {
  store_id: number; store_name: string; brand: string | null; model: string; ram: number | null; storage: number | null;
  color: string | null; condition: string | null; code: string | null; imei1: string | null; imei2: string | null; ident: string | null;
  qty: number; price_suggested: number | null; entry_date: string; status: string; kind: string; flag?: string | null; seller?: string | null; sale_price?: number | null;
};
export type ReportMeta = {
  title: string;
  filters: string[];
  storeColor: (id: number) => string;
  brandColor: (brand: string | null) => string;
  /** false = informe solo con lo disponible (sin vendidos). Los incautados nunca salen en el reporte. */
  includeSold?: boolean;
  /** Texto para el nombre del archivo (por ejemplo la tienda). */
  tag?: string;
};

const tagOf = (m: ReportMeta) => (m.tag ? "-" + m.tag.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "");
const forReport = (rows: ReportRow[], meta: ReportMeta) => rows.filter((r) => r.status !== "incautado" && (meta.includeSold !== false || r.status !== "sold"));

const NAVY = "#1e3a8a";
const statusLabel = (s: string) => (s === "stock" ? "En stock" : s === "incautado" ? "Incautado" : "Vendido");
const nowLabel = () => new Date().toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" });
const fileStamp = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
};
const tint = (hex: string, t: number): [number, number, number] => rgb(hex).map((c) => Math.round(c + (255 - c) * t)) as [number, number, number];
const argb = (c: [number, number, number] | string) => "FF" + (typeof c === "string" ? c.replace("#", "") : c.map((x) => x.toString(16).padStart(2, "0")).join("")).toUpperCase();

function summarize(rows: ReportRow[], meta: ReportMeta) {
  const inStock = rows.filter((r) => r.status === "stock");
  const units = inStock.reduce((s, r) => s + r.qty, 0);
  const value = inStock.reduce((s, r) => s + (r.price_suggested ?? 0) * r.qty, 0);
  const noPrice = inStock.filter((r) => r.price_suggested == null).length;
  const stores = new Map<number, { name: string; n: number; units: number; value: number }>();
  const brands = new Map<string, number>();
  for (const r of rows) {
    const s = stores.get(r.store_id) ?? { name: r.store_name, n: 0, units: 0, value: 0 };
    s.n++;
    if (r.status === "stock") { s.units += r.qty; s.value += (r.price_suggested ?? 0) * r.qty; }
    stores.set(r.store_id, s);
    const b = r.brand ?? "Otros";
    brands.set(b, (brands.get(b) ?? 0) + 1);
  }
  const byStatus = ["stock", "sold"].map((k) => [statusLabel(k), rows.filter((r) => r.status === k).length] as const);
  return {
    units, value, noPrice, total: rows.length, byStatus,
    stores: [...stores.entries()].sort((a, b) => a[0] - b[0]).map(([id, s]) => ({ id, ...s, color: meta.storeColor(id) })),
    brands: [...brands.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n, color: meta.brandColor(name === "Otros" ? null : name) })),
  };
}

/* Nota: el nombre del archivo del PDF distingue el informe sin vendidos. */
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ───────────── PDF ───────────── */
export async function downloadStockPdf(allRows: ReportRow[], meta: ReportMeta) {
  const rows = forReport(allRows, meta);
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 10;
  const sm = summarize(rows, meta);

  // Cabecera
  doc.setFillColor(...rgb(NAVY)); doc.rect(0, 0, W, 26, "F");
  doc.setFillColor(...rgb("#0ea5e9")); doc.rect(0, 26, W, 1.4, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text(meta.title, M, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("Planet Movil  ·  Soluciones Móviles  ·  Red i Mobile  ·  Jaimes Tienda", M, 21);
  doc.setFontSize(9); doc.text(nowLabel(), W - M, 14, { align: "right" });
  doc.text(`${sm.total} equipos en el reporte`, W - M, 21, { align: "right" });

  doc.setTextColor(100, 116, 139); doc.setFontSize(8.5);
  doc.text("Filtros: " + (meta.filters.length ? meta.filters.join("  ·  ") : "ninguno (todo el stock)"), M, 35);

  // Tarjetas de resumen
  const cards: [string, string, string][] = [
    ["Unidades en stock", String(sm.units), NAVY],
    ["Valor a precio sugerido", soles(sm.value), "#059669"],
    ["Sin precio sugerido", String(sm.noPrice), "#d97706"],
    meta.includeSold === false ? ["Marcas distintas", String(sm.brands.length), "#475569"] : ["Vendidos", String(sm.byStatus[1][1]), "#475569"],
  ];
  const cw = (W - 2 * M - 3 * 4) / 4;
  cards.forEach(([label, value, color], i) => {
    const x = M + i * (cw + 4);
    doc.setFillColor(...tint(color, 0.9)); doc.roundedRect(x, 39, cw, 20, 3, 3, "F");
    doc.setFillColor(...rgb(color)); doc.roundedRect(x, 39, 2.2, 20, 1, 1, "F");
    doc.setTextColor(...rgb(color)); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(value, x + 7, 51);
    doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text(label, x + 7, 56.5);
  });

  // Por tienda (tabla) y por marca (barras)
  const half = (W - 2 * M - 8) / 2;
  autoTable(doc, {
    startY: 65, margin: { left: M, right: W - M - half }, tableWidth: half,
    head: [["Tienda", "Equipos", "En stock", "Valor sugerido"]],
    body: sm.stores.map((s) => [s.name, s.n, s.units, soles(s.value)]),
    theme: "plain",
    headStyles: { fillColor: rgb("#1e293b"), textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 9, cellPadding: 2.2 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    didParseCell: (d) => {
      if (d.section === "body") {
        const s = sm.stores[d.row.index];
        d.cell.styles.fillColor = d.row.index % 2 ? [248, 250, 252] : [255, 255, 255];
        if (d.column.index === 0) { d.cell.styles.textColor = rgb(s.color); d.cell.styles.fontStyle = "bold"; }
      }
    },
    didDrawCell: (d) => {
      if (d.section === "body" && d.column.index === 0) { doc.setFillColor(...rgb(sm.stores[d.row.index].color)); doc.rect(d.cell.x, d.cell.y, 1.6, d.cell.height, "F"); }
    },
  });
  const bx = M + half + 8;
  doc.setFillColor(...rgb("#1e293b")); doc.rect(bx, 65, half, 7.2, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.text("Marcas con más equipos", bx + 2.5, 70);
  const top = sm.brands.slice(0, 8);
  const maxN = Math.max(1, ...top.map((b) => b.n));
  top.forEach((b, i) => {
    const y = 72.2 + i * 7.6;
    if (i % 2) { doc.setFillColor(248, 250, 252); doc.rect(bx, y, half, 7.6, "F"); }
    doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(b.name, bx + 2.5, y + 5);
    const bw = ((half - 62) * b.n) / maxN;
    doc.setFillColor(...tint(b.color, 0.82)); doc.roundedRect(bx + 36, y + 1.6, half - 62, 4.4, 1.2, 1.2, "F");
    doc.setFillColor(...rgb(b.color)); doc.roundedRect(bx + 36, y + 1.6, Math.max(2, bw), 4.4, 1.2, 1.2, "F");
    doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "normal"); doc.text(String(b.n), bx + half - 4, y + 5, { align: "right" });
  });

  // Detalle por tienda
  const showSit = rows.some((r) => r.status !== "stock");
  const head = ["Cód.", "Marca", "Modelo", "RAM", "Alm.", "Color", "IMEI 1", "IMEI 2 / Ident.", "P. sugerido", "Ingreso", ...(showSit ? ["Situación", "Vendedora", "P. venta"] : [])];
  doc.addPage();
  let y = M;
  for (const s of sm.stores) {
    const list = rows.filter((r) => r.store_id === s.id);
    if (y > H - 45) { doc.addPage(); y = M; }
    doc.setFillColor(...rgb(s.color)); doc.roundedRect(M, y, W - 2 * M, 9, 2, 2, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(s.name, M + 4, y + 6.2);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`${list.length} equipos  ·  ${s.units} en stock  ·  ${soles(s.value)}`, W - M - 4, y + 6.1, { align: "right" });
    autoTable(doc, {
      startY: y + 11, margin: { left: M, right: M, bottom: 14 },
      head: [head],
      body: list.map((r) => [r.code ?? "-", r.brand ?? "-", r.model + (r.kind === "accesorio" && r.qty > 1 ? ` x${r.qty}` : ""), r.ram ? `${r.ram}GB` : "-", r.storage ? storageLabel(r.storage) : "-", r.color ?? "-", r.imei1 ?? "-", r.imei2 ?? r.ident ?? "-", r.price_suggested == null ? "-" : soles(r.price_suggested), fmtDay(r.entry_date), ...(showSit ? [statusLabel(r.status), r.seller ?? "-", r.sale_price == null ? "-" : soles(r.sale_price)] : [])]),
      theme: "plain",
      styles: { fontSize: 8, cellPadding: { top: 1.7, bottom: 1.7, left: 2, right: 2 }, textColor: [30, 41, 59], overflow: "linebreak" },
      headStyles: { fillColor: rgb("#1e293b"), textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: { 0: { cellWidth: 16, fontStyle: "bold" }, 1: { cellWidth: 22, fontStyle: "bold" }, 3: { cellWidth: 13 }, 4: { cellWidth: 14 }, 6: { cellWidth: 33, font: "courier" }, 7: { cellWidth: 33, font: "courier" }, 8: { halign: "right", cellWidth: 22, fontStyle: "bold" }, 9: { cellWidth: 20 } },
      didParseCell: (d) => {
        if (d.section !== "body") return;
        const r = list[d.row.index];
        d.cell.styles.fillColor = r.flag ? [254, 226, 226] : r.status === "incautado" ? [254, 243, 199] : d.row.index % 2 ? [248, 250, 252] : [255, 255, 255];
        if (r.status === "sold") d.cell.styles.textColor = [148, 163, 184];
        else if (d.column.index === 1) d.cell.styles.textColor = rgb(meta.brandColor(r.brand));
      },
      didDrawCell: (d) => {
        if (d.section === "body" && d.column.index === 0) { doc.setFillColor(...rgb(meta.brandColor(list[d.row.index].brand))); doc.rect(d.cell.x, d.cell.y, 1.4, d.cell.height, "F"); }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Pie de página
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.line(M, H - 9, W - M, H - 9);
    doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(`${meta.title}  ·  ${nowLabel()}`, M, H - 4.5);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 4.5, { align: "right" });
  }
  doc.save(`${meta.includeSold === false ? "informe-stock-sin-vendidos" : "reporte-stock-con-vendidos"}${tagOf(meta)}-${fileStamp()}.pdf`);
}

/* ───────────── Excel ───────────── */
export async function downloadStockXlsx(allRows: ReportRow[], meta: ReportMeta) {
  const rows = forReport(allRows, meta);
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Planet Movil";
  wb.created = new Date();
  const sm = summarize(rows, meta);
  const thin = { style: "thin" as const, color: { argb: argb("#e2e8f0") } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = (hex: string | [number, number, number]) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: argb(hex) } });

  // Hoja 1: resumen
  const rs = wb.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  rs.columns = [{ width: 30 }, { width: 14 }, { width: 14 }, { width: 20 }, { width: 4 }, { width: 24 }, { width: 12 }];
  rs.mergeCells("A1:G1");
  Object.assign(rs.getCell("A1"), { value: meta.title });
  rs.getCell("A1").font = { name: "Calibri", size: 20, bold: true, color: { argb: argb("#ffffff") } };
  rs.getCell("A1").fill = fill(NAVY);
  rs.getCell("A1").alignment = { vertical: "middle", indent: 1 };
  rs.getRow(1).height = 36;
  rs.mergeCells("A2:G2");
  rs.getCell("A2").value = `${nowLabel()}  ·  ${meta.filters.length ? "Filtros: " + meta.filters.join(" · ") : "Sin filtros (todo el stock)"}`;
  rs.getCell("A2").font = { size: 10, color: { argb: argb("#64748b") } };
  rs.getCell("A2").alignment = { indent: 1 };

  const kpis: [string, string | number, string, string?][] = [
    ["Unidades en stock", sm.units, "#1e3a8a"],
    ["Valor a precio sugerido", sm.value, "#059669", '"S/" #,##0.00'],
    ["Sin precio sugerido", sm.noPrice, "#d97706"],
    meta.includeSold === false ? ["Marcas distintas", sm.brands.length, "#475569"] : ["Vendidos", sm.byStatus[1][1], "#475569"],
  ];
  kpis.forEach(([label, value, color, fmt], i) => {
    const col = ["A", "B", "C", "D"][i];
    const l = rs.getCell(`${col}4`), v = rs.getCell(`${col}5`);
    l.value = label; l.font = { size: 9, color: { argb: argb("#64748b") } }; l.fill = fill(tint(color, 0.9)); l.alignment = { indent: 1, wrapText: true };
    v.value = value; v.font = { size: 18, bold: true, color: { argb: argb(color) } }; v.fill = fill(tint(color, 0.9)); v.alignment = { indent: 1, vertical: "middle" };
    if (fmt) v.numFmt = fmt;
  });
  rs.getRow(4).height = 26; rs.getRow(5).height = 32;

  const hdr = (cell: import("exceljs").Cell, text: string, right = false) => {
    cell.value = text; cell.font = { bold: true, color: { argb: argb("#ffffff") } }; cell.fill = fill("#1e293b");
    cell.alignment = { horizontal: right ? "right" : "left", indent: 1 };
  };
  ["Tienda", "Equipos", "En stock", "Valor sugerido"].forEach((t, i) => hdr(rs.getCell(7, i + 1), t, i > 0));
  sm.stores.forEach((s, i) => {
    const r = 8 + i;
    const c = rs.getCell(r, 1);
    c.value = s.name; c.font = { bold: true, color: { argb: argb("#ffffff") } }; c.fill = fill(s.color); c.alignment = { indent: 1 };
    [s.n, s.units, s.value].forEach((v, j) => {
      const x = rs.getCell(r, j + 2);
      x.value = v; x.alignment = { horizontal: "right" }; x.border = border; x.fill = fill(i % 2 ? "#f8fafc" : "#ffffff");
      if (j === 2) x.numFmt = '"S/" #,##0.00';
    });
  });
  hdr(rs.getCell(7, 6), "Marca"); hdr(rs.getCell(7, 7), "Equipos", true);
  sm.brands.slice(0, 12).forEach((b, i) => {
    const r = 8 + i;
    const c = rs.getCell(r, 6);
    c.value = b.name; c.font = { bold: true, color: { argb: argb(b.color) } }; c.fill = fill(tint(b.color, 0.88)); c.alignment = { indent: 1 };
    const n = rs.getCell(r, 7);
    n.value = b.n; n.alignment = { horizontal: "right" }; n.border = border; n.fill = fill(tint(b.color, 0.88));
  });

  // Hoja 2: detalle
  const ws = wb.addWorksheet("Stock", { views: [{ state: "frozen", ySplit: 1 }] });
  const cols: [string, number][] = [["Tienda", 20], ["Cód.", 10], ["Marca", 13], ["Modelo", 28], ["RAM", 8], ["Almacenamiento", 15], ["Color", 14], ["Caja", 10], ["IMEI 1", 18], ["IMEI 2 / Ident.", 18], ["Cant.", 7], ["Precio sugerido", 16], ["Ingreso", 12], ["Situación", 12], ["Vendedora", 14], ["Precio de venta", 16]];
  ws.columns = cols.map(([header, width]) => ({ header, width }));
  const h = ws.getRow(1);
  h.height = 24;
  h.eachCell((c) => { c.font = { bold: true, color: { argb: argb("#ffffff") } }; c.fill = fill("#1e293b"); c.alignment = { vertical: "middle", indent: 1 }; });
  rows.forEach((r, i) => {
    const row = ws.addRow([r.store_name, r.code ?? "", r.brand ?? "", r.model, r.ram ?? "", r.storage ? storageLabel(r.storage) : "", r.color ?? "", r.condition ?? "", r.imei1 ?? "", r.imei2 ?? r.ident ?? "", r.qty, r.price_suggested ?? "", fmtDay(r.entry_date), statusLabel(r.status), r.seller ?? "", r.sale_price ?? ""]);
    const base = r.flag ? "#fee2e2" : r.status === "incautado" ? "#fef3c7" : i % 2 ? "#f8fafc" : "#ffffff";
    const sold = r.status === "sold";
    row.eachCell({ includeEmpty: true }, (c) => { c.fill = fill(base); c.border = border; c.font = { color: { argb: argb(sold ? "#94a3b8" : "#1e293b") } }; c.alignment = { vertical: "middle" }; });
    const sc = row.getCell(1);
    sc.fill = fill(meta.storeColor(r.store_id)); sc.font = { bold: true, color: { argb: argb("#ffffff") } }; sc.alignment = { indent: 1, vertical: "middle" };
    row.getCell(2).font = { bold: true, name: "Consolas", color: { argb: argb(sold ? "#94a3b8" : "#1e293b") } };
    if (!sold) { row.getCell(3).font = { bold: true, color: { argb: argb(meta.brandColor(r.brand)) } }; }
    row.getCell(9).numFmt = "@"; row.getCell(10).numFmt = "@";
    row.getCell(9).font = { name: "Consolas", color: { argb: argb(sold ? "#94a3b8" : "#1e293b") } };
    row.getCell(10).font = { name: "Consolas", color: { argb: argb(sold ? "#94a3b8" : "#1e293b") } };
    row.getCell(12).numFmt = '"S/" #,##0.00';
    row.getCell(16).numFmt = '"S/" #,##0.00';
    if (r.sale_price != null) row.getCell(16).font = { bold: true, color: { argb: argb("#047857") } };
    row.getCell(12).font = { bold: true, color: { argb: argb(sold ? "#94a3b8" : "#047857") } };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

  const buf = await wb.xlsx.writeBuffer();
  save(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `stock${tagOf(meta)}-${fileStamp()}.xlsx`);
}
