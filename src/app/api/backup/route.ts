import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { guard, limaDay } from "@/lib/auth";

// Respaldo completo (todas las tablas) en un solo archivo JSON.
export async function GET() {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const tables: Record<string, unknown[]> = {};
  for (const t of ["stores", "brands", "models", "colors", "products", "sales", "payments", "movements", "alerts"]) tables[t] = await all("SELECT * FROM " + t);
  tables.users = await all("SELECT id,username,name,role,store_id,active,created_at FROM users");
  const body = JSON.stringify({ app: "Planet Movil", fecha: new Date().toISOString(), tablas: tables }, null, 1);
  return new NextResponse(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="planetmovil-respaldo-' + limaDay() + '.json"' } });
}
