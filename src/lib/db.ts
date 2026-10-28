import { createClient, type Client, type InValue } from "@libsql/client";
import { randomBytes, scryptSync } from "node:crypto";
import { BRAND_COLORS, CATALOG, COLORS } from "./catalog";
import { STOCK_SOLUCIONES } from "./seed-stock";
import { STOCK_EXTRA } from "./seed-stock2";

const g = globalThis as unknown as { __pm_client?: Client; __pm_ready?: Promise<void> };

function client(): Client {
  if (!g.__pm_client) {
    if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) throw new Error("Falta la variable TURSO_DATABASE_URL en Vercel (ver LEEME.md)");
    g.__pm_client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? "file:data/planet.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return g.__pm_client;
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}
export function checkPassword(pw: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  return scryptSync(pw, salt, 32).toString("hex") === hash;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS stores (id INTEGER PRIMARY KEY, name TEXT NOT NULL, short TEXT NOT NULL, series TEXT NOT NULL, address TEXT DEFAULT '', phone TEXT DEFAULT '', ruc TEXT DEFAULT '', color TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL COLLATE NOCASE, name TEXT NOT NULL, role TEXT NOT NULL, store_id INTEGER, password TEXT, active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS brands (name TEXT PRIMARY KEY COLLATE NOCASE, color TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS models (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL COLLATE NOCASE, brand TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'celular', type TEXT DEFAULT 'c', def_ram INTEGER DEFAULT 4, def_storage INTEGER DEFAULT 64)`,
  `CREATE TABLE IF NOT EXISTS colors (name TEXT PRIMARY KEY COLLATE NOCASE, hex TEXT DEFAULT '#9ca3af')`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, store_id INTEGER NOT NULL,
    brand TEXT, model TEXT NOT NULL, imei1 TEXT, imei2 TEXT, ident TEXT, code TEXT,
    ram INTEGER, storage INTEGER, color TEXT, condition TEXT, qty INTEGER DEFAULT 1,
    price_suggested REAL, cost REAL, supplier TEXT, purchase_date TEXT, entry_date TEXT NOT NULL,
    status TEXT DEFAULT 'stock', notes TEXT, created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_products_code ON products(code)`,
  `CREATE INDEX IF NOT EXISTS idx_products_imei1 ON products(imei1)`,
  `CREATE TABLE IF NOT EXISTS movements (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, from_store INTEGER, to_store INTEGER, user_name TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT, store_id INTEGER NOT NULL, seq INTEGER NOT NULL, number TEXT NOT NULL,
    product_id INTEGER, seller_id INTEGER, seller_name TEXT, item TEXT NOT NULL, qty INTEGER DEFAULT 1,
    price REAL NOT NULL, suggested REAL, cost REAL, customer_name TEXT, phone TEXT, dni TEXT,
    modified TEXT, day TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_day ON sales(day)`,
  `CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL, method TEXT NOT NULL, amount REAL NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, message TEXT NOT NULL, sale_id INTEGER, store_id INTEGER, flagged INTEGER DEFAULT 0, read INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
];

async function init() {
  const c = client();
  for (const s of SCHEMA) await c.execute(s);
  const n = await c.execute("SELECT COUNT(*) AS n FROM stores");
  if (Number(n.rows[0].n) > 0) return migrate(c);

  const stmts: { sql: string; args: InValue[] }[] = [
    { sql: "INSERT INTO stores (id,name,short,series,color,address) VALUES (1,'Planet Movil','Tienda 1','PM01','#1d4ed8','Piura')", args: [] },
    { sql: "INSERT INTO stores (id,name,short,series,color,address) VALUES (2,'Soluciones Móviles','Tienda 2','SM01','#0d9488','Piura')", args: [] },
    { sql: "INSERT INTO users (username,name,role,password) VALUES ('Omar','Omar','admin',?)", args: [hashPassword(process.env.ADMIN_PASSWORD ?? "admin")] },
    { sql: "INSERT INTO users (username,name,role) VALUES ('Jaime','Jaime','gerencia')", args: [] },
    { sql: "INSERT INTO users (username,name,role) VALUES ('Rosa','Rosa','admin')", args: [] },
    { sql: "INSERT INTO users (username,name,role,store_id) VALUES ('Milagros','Milagros','seller',0)", args: [] },
  ];
  for (const [b, color] of Object.entries(BRAND_COLORS)) stmts.push({ sql: "INSERT INTO brands VALUES (?,?)", args: [b, color] });
  for (const [name, hex] of COLORS) stmts.push({ sql: "INSERT INTO colors VALUES (?,?)", args: [name, hex] });
  for (const m of CATALOG)
    stmts.push({
      sql: "INSERT OR IGNORE INTO models (name,brand,kind,type,def_ram,def_storage) VALUES (?,?,?,?,?,?)",
      args: [m.model, m.brand, "celular", m.type, m.ram, m.storage],
    });
  await c.batch(stmts, "write");
  await migrate(c);
}

// Ajustes idempotentes que también aplican a bases ya creadas
async function migrate(c: Client) {
  try { await c.execute("ALTER TABLE products ADD COLUMN is_test INTEGER DEFAULT 0"); } catch {}
  // Las vendedoras rotan entre tiendas: store_id 0 = ambas (se elige al entrar)
  const rot = await c.execute("SELECT 1 FROM settings WHERE key='sellers_rotate'");
  if (!rot.rows.length) {
    await c.execute("UPDATE users SET store_id=0 WHERE role='seller'");
    await c.execute("INSERT INTO settings (key,value) VALUES ('sellers_rotate','1')");
  }
  await c.execute("UPDATE users SET username='Milagros' WHERE username='Milagros01'");
  await c.execute("DELETE FROM users WHERE username='Rosa02' AND id NOT IN (SELECT seller_id FROM sales WHERE seller_id IS NOT NULL)");
  await c.execute("UPDATE users SET role='admin' WHERE username='Rosa'");
  for (const col of ["status TEXT DEFAULT 'ok'", "late INTEGER DEFAULT 0", "manual INTEGER DEFAULT 0"]) {
    try { await c.execute(`ALTER TABLE sales ADD COLUMN ${col}`); } catch {}
  }
  try { await c.execute("ALTER TABLE stores ADD COLUMN owner TEXT DEFAULT ''"); } catch {}
  await c.execute("UPDATE stores SET ruc='10067717002', owner='OLIDEN VERA JAIME CONCEPCION' WHERE ruc IS NULL OR ruc=''");
  await c.execute("UPDATE users SET username='Jaime', name='Jaime', password=NULL WHERE username='jefe'");
  await c.execute("INSERT OR IGNORE INTO users (username,name,role) VALUES ('Rosa','Rosa','admin')");
  // El administrador pasa a llamarse Omar (usuario Omar, contraseña inicial "admin"); se aplica una sola vez
  const om = await c.execute("SELECT 1 FROM settings WHERE key='admin_is_omar'");
  if (!om.rows.length) {
    const taken = await c.execute("SELECT 1 FROM users WHERE username='Omar'");
    if (!taken.rows.length) {
      await c.execute({
        sql: "UPDATE users SET username='Omar', name='Omar', password=? WHERE username='admin'",
        args: [hashPassword("admin")],
      });
    }
    await c.execute("INSERT INTO settings (key,value) VALUES ('admin_is_omar','1')");
  }
  try { await c.execute("ALTER TABLE products ADD COLUMN flag TEXT"); } catch {}
  await loadSolucionesStock(c);
  await loadExtraStock(c);
  await flagRepeatedImei(c);
  await restoreRepeatedImei(c);
}

// Una sola vez: marca en rojo (Stock) los equipos cuyo IMEI venía repetido en las hojas, para corregirlos a mano.
async function flagRepeatedImei(c: Client) {
  if ((await c.execute("SELECT 1 FROM settings WHERE key='flag_imei_v1'")).rows.length) return;
  const noImei = ["1370", "1381", "1383", "1384", "1385", "1386", "1389", "1391", "1392", "1394", "1397", "1398", "1400", "1352", "1390", "1395"];
  await c.batch([
    { sql: `UPDATE products SET flag='IMEI repetido' WHERE status='stock' AND imei1 IS NULL AND code IN (${noImei.map(() => "?").join(",")})`, args: noImei },
    { sql: "UPDATE products SET flag='IMEI repetido' WHERE status='stock' AND store_id=2 AND code IN ('A104','8359')", args: [] },
    { sql: "INSERT INTO settings (key,value) VALUES ('flag_imei_v1','1')", args: [] },
  ], "write");
}

// Una sola vez: devuelve a esos equipos el IMEI que traía la hoja; se muestra con la marca "IMEI repetido" al lado.
async function restoreRepeatedImei(c: Client) {
  if ((await c.execute("SELECT 1 FROM settings WHERE key='restore_imei_v1'")).rows.length) return;
  await c.batch([
    { sql: "UPDATE products SET imei1='353207809078565' WHERE flag='IMEI repetido' AND imei1 IS NULL", args: [] },
    { sql: "INSERT INTO settings (key,value) VALUES ('restore_imei_v1','1')", args: [] },
  ], "write");
}

// RAM y almacenamiento a partir del nombre ("4+128GB", "256+8GB", "(256GB/4RAM)", "128gb"…)
function specsFromModel(model: string): { ram: number | null; storage: number | null } {
  let m = model.match(/(\d{1,2})\s*(?:\+|\/)\s*(\d{2,4})/);
  if (m && +m[1] <= 16 && +m[2] >= 32) return { ram: +m[1], storage: +m[2] };
  m = model.match(/(\d{3,4})\s*(?:\+|\/)\s*(\d{1,2})\s*(?:gb)?\b/i);
  if (m && +m[1] >= 64 && +m[2] <= 16) return { ram: +m[2], storage: +m[1] };
  const ram = model.match(/(\d{1,2})\s*ram/i);
  const st = model.match(/(\d{2,4})\s*gb/i);
  return { ram: ram ? +ram[1] : null, storage: st && +st[1] >= 16 ? +st[1] : null };
}

// Una sola vez: Almacén general, Planet Movil y el resto de Soluciones Móviles / Red i Mobile.
// Se omite lo que ya exista con el mismo código en esa tienda. Un IMEI repetido 3 o más veces
// (error de copiado en la hoja) se deja vacío para no mezclar equipos distintos.
async function loadExtraStock(c: Client) {
  if ((await c.execute("SELECT 1 FROM settings WHERE key='stock_extra_v1'")).rows.length) return;
  const seen = new Set<string>();
  const rows: { store: number; code: string; model: string; imei: string | null }[] = [];
  for (const line of STOCK_EXTRA.trim().split("\n")) {
    const [store, code, model, imei] = line.split("|");
    const key = `${store}|${code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ store: Number(store), code, model, imei: imei || null });
  }
  const count = new Map<string, number>();
  for (const r of rows) if (r.imei) count.set(r.imei, (count.get(r.imei) ?? 0) + 1);
  const day = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
  const stmts: { sql: string; args: InValue[] }[] = [];
  for (const r of rows) {
    const dup = await c.execute({ sql: "SELECT 1 FROM products WHERE status='stock' AND store_id=? AND code=?", args: [r.store, r.code] });
    if (dup.rows.length) continue;
    const imei = r.imei && (count.get(r.imei) ?? 0) < 3 ? r.imei : null;
    const { ram, storage } = specsFromModel(r.model);
    const brand = r.model.split(" ")[0];
    stmts.push({ sql: "INSERT OR IGNORE INTO brands (name,color) VALUES (?,?)", args: [brand, "#64748b"] });
    stmts.push({ sql: "INSERT OR IGNORE INTO models (name,brand,def_ram,def_storage) VALUES (?,?,?,?)", args: [r.model, brand, ram ?? 4, storage ?? 64] });
    stmts.push({
      sql: "INSERT INTO products (kind,store_id,brand,model,imei1,code,ram,storage,condition,qty,entry_date,created_by) VALUES ('celular',?,?,?,?,?,?,?,'Sellado',1,?,'Omar')",
      args: [r.store, brand, r.model, imei, r.code, ram, storage, day],
    });
  }
  stmts.push({ sql: "INSERT INTO settings (key,value) VALUES ('stock_extra_v1','1')", args: [] });
  await c.batch(stmts, "write");
}

// Una sola vez: borra los equipos de prueba (y sus ventas) y carga el stock real de Soluciones Móviles.
async function loadSolucionesStock(c: Client) {
  if ((await c.execute("SELECT 1 FROM settings WHERE key='stock_soluciones_v1'")).rows.length) return;
  const test = "(SELECT id FROM products WHERE is_test=1)";
  const stmts: { sql: string; args: InValue[] }[] = [
    { sql: `DELETE FROM payments WHERE sale_id IN (SELECT id FROM sales WHERE product_id IN ${test})`, args: [] },
    { sql: `DELETE FROM alerts WHERE sale_id IN (SELECT id FROM sales WHERE product_id IN ${test})`, args: [] },
    { sql: `DELETE FROM sales WHERE product_id IN ${test}`, args: [] },
    { sql: `DELETE FROM movements WHERE product_id IN ${test}`, args: [] },
    { sql: "DELETE FROM products WHERE is_test=1", args: [] },
  ];
  const day = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
  for (const [model, imei, code, ram, storage] of STOCK_SOLUCIONES) {
    const dup = await c.execute({ sql: "SELECT 1 FROM products WHERE status='stock' AND (code=? OR imei1=? OR imei2=?)", args: [code, imei, imei] });
    if (dup.rows.length) continue;
    const brand = model.split(" ")[0];
    stmts.push({ sql: "INSERT OR IGNORE INTO brands (name,color) VALUES (?,?)", args: [brand, "#64748b"] });
    stmts.push({ sql: "INSERT OR IGNORE INTO models (name,brand,def_ram,def_storage) VALUES (?,?,?,?)", args: [model, brand, ram ?? 4, storage ?? 64] });
    stmts.push({
      sql: "INSERT INTO products (kind,store_id,brand,model,imei1,code,ram,storage,condition,qty,entry_date,created_by) VALUES ('celular',2,?,?,?,?,?,?,'Sellado',1,?,'Omar')",
      args: [brand, model, imei, code, ram, storage, day],
    });
  }
  stmts.push({ sql: "INSERT INTO settings (key,value) VALUES ('stock_soluciones_v1','1')", args: [] });
  await c.batch(stmts, "write");
}

export async function db(): Promise<Client> {
  g.__pm_ready ??= init().catch((e) => {
    g.__pm_ready = undefined;
    throw e;
  });
  await g.__pm_ready;
  return client();
}

export async function all<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T[]> {
  const r = await (await db()).execute({ sql, args });
  return r.rows.map((row) => ({ ...row })) as T[];
}
export async function one<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T | null> {
  return (await all<T>(sql, args))[0] ?? null;
}
export async function run(sql: string, args: InValue[] = []) {
  return (await db()).execute({ sql, args });
}
