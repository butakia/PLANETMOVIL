import { createClient, type Client, type InValue } from "@libsql/client";
import { randomBytes, scryptSync } from "node:crypto";
import { BRAND_COLORS, CATALOG, COLORS } from "./catalog";

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
    { sql: "INSERT INTO users (username,name,role,password) VALUES ('admin','Administrador','admin',?)", args: [hashPassword(process.env.ADMIN_PASSWORD ?? "admin123")] },
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
