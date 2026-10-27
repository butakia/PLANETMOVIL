import { NextRequest, NextResponse } from "next/server";
import { all, run } from "@/lib/db";
import { guard } from "@/lib/auth";

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;
  const [models, colors, brands, stores] = await Promise.all([
    all("SELECT name,brand,kind,type,def_ram,def_storage FROM models ORDER BY name"),
    all("SELECT name,hex FROM colors ORDER BY rowid"),
    all("SELECT name,color FROM brands ORDER BY name"),
    all("SELECT id,name,short,series,color,address,phone,ruc,owner FROM stores ORDER BY id"),
  ]);
  return NextResponse.json({ models, colors, brands, stores });
}

// Guardar un modelo nuevo o un color nuevo en el catálogo
export async function POST(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const b = await req.json();
  if (b.type === "color") {
    const name = String(b.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    await run("INSERT OR IGNORE INTO colors (name,hex) VALUES (?,?)", [name, b.hex || "#9ca3af"]);
    return NextResponse.json({ ok: true });
  }
  const name = String(b.name ?? "").trim().replace(/\s+/g, " ");
  const brand = String(b.brand ?? "").trim() || "Otros";
  if (!name) return NextResponse.json({ error: "Falta el nombre del modelo" }, { status: 400 });
  await run("INSERT OR IGNORE INTO brands (name,color) VALUES (?,?)", [brand, "#64748b"]);
  await run(
    "INSERT INTO models (name,brand,kind,type,def_ram,def_storage) VALUES (?,?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET brand=excluded.brand, def_ram=excluded.def_ram, def_storage=excluded.def_storage",
    [name, brand, "celular", b.modelType ?? "c", Number(b.ram ?? 4), Number(b.storage ?? 64)],
  );
  return NextResponse.json({ ok: true });
}

// Editar color de marca / datos de tienda
export async function PATCH(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const b = await req.json();
  if (b.brand) await run("INSERT INTO brands (name,color) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET color=excluded.color", [b.brand, b.color]);
  if (b.store)
    await run("UPDATE stores SET address=?, phone=?, ruc=?, owner=? WHERE id=?", [b.store.address ?? "", b.store.phone ?? "", b.store.ruc ?? "", b.store.owner ?? "", b.store.id]);
  return NextResponse.json({ ok: true });
}
