import { all, one } from "./db";

export type Product = {
  id: number; kind: "celular" | "accesorio"; store_id: number; brand: string | null; model: string;
  imei1: string | null; imei2: string | null; ident: string | null; code: string | null;
  ram: number | null; storage: number | null; color: string | null; condition: string | null; qty: number;
  price_suggested: number | null; cost: number | null; supplier: string | null; purchase_date: string | null;
  entry_date: string; status: string; notes: string | null; created_by: string | null;
};

export const clean = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
export const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Busca otro producto en stock con el mismo código interno o IMEI (para avisar duplicados). */
export async function findConflicts(opts: { code?: string | null; imeis?: (string | null)[]; ident?: string | null; excludeId?: number }) {
  const ex = opts.excludeId ?? -1;
  const sel = `SELECT p.id,p.model,p.code,p.imei1,p.imei2,p.status,COALESCE(s.name,'Almacén general') AS store_name FROM products p LEFT JOIN stores s ON s.id=p.store_id`;
  const code = opts.code
    ? await one(`${sel} WHERE p.code=? AND p.status='stock' AND p.id<>? LIMIT 1`, [opts.code, ex])
    : null;
  const imeis = (opts.imeis ?? []).filter(Boolean) as string[];
  let imei = null;
  for (const i of imeis) {
    imei = await one(`${sel} WHERE (p.imei1=? OR p.imei2=?) AND p.status='stock' AND p.id<>? LIMIT 1`, [i, i, ex]);
    if (imei) break;
  }
  return { code, imei };
}

export const stripCost = <T extends Record<string, unknown>>(rows: T[]) => rows.map(({ cost, supplier, purchase_date, ...r }) => (void cost, void supplier, void purchase_date, r));

export async function listProducts(where: string[], args: (string | number)[]) {
  return all<Product & { store_name: string }>(
    `SELECT p.*, COALESCE(s.name,'Almacén general') AS store_name FROM products p LEFT JOIN stores s ON s.id=p.store_id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY p.brand, p.model, p.id`,
    args,
  );
}
