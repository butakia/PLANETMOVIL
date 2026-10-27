import { NextRequest, NextResponse } from "next/server";
import { all, hashPassword, run } from "@/lib/db";
import { guard } from "@/lib/auth";

export async function GET() {
  const g = await guard(["admin", "gerencia"]);
  if (g.error) return g.error;
  return NextResponse.json({ users: await all("SELECT id,username,name,role,store_id,active,(password IS NOT NULL) AS has_password FROM users ORDER BY role,name") });
}

export async function POST(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const b = await req.json();
  const username = String(b.username ?? "").trim();
  const name = String(b.name ?? "").trim();
  const role = ["admin", "seller", "gerencia"].includes(b.role) ? b.role : "seller";
  if (!username || !name) return NextResponse.json({ error: "Completa usuario y nombre" }, { status: 400 });
  if (role === "admin" && String(b.password ?? "").length < 4) return NextResponse.json({ error: "El administrador necesita contraseña (mín. 4 caracteres)" }, { status: 400 });
  try {
    await run("INSERT INTO users (username,name,role,store_id,password) VALUES (?,?,?,?,?)", [
      username, name, role, role === "seller" ? ([0, 1, 2].includes(Number(b.store_id)) ? Number(b.store_id) : 0) : null, b.password ? hashPassword(String(b.password)) : null,
    ]);
  } catch {
    return NextResponse.json({ error: "Ese usuario ya existe" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const g = await guard(["admin"]);
  if (g.error) return g.error;
  const b = await req.json();
  if ("active" in b) await run("UPDATE users SET active=? WHERE id=? AND id<>?", [b.active ? 1 : 0, Number(b.id), g.user.id]);
  if ("store_id" in b && [0, 1, 2].includes(Number(b.store_id))) await run("UPDATE users SET store_id=? WHERE id=? AND role='seller'", [Number(b.store_id), Number(b.id)]);
  if ("password" in b) {
    const pw = String(b.password ?? "");
    if (pw === "") await run("UPDATE users SET password=NULL WHERE id=? AND role<>'admin'", [Number(b.id)]);
    else if (pw.length >= 4) await run("UPDATE users SET password=? WHERE id=?", [hashPassword(pw), Number(b.id)]);
    else return NextResponse.json({ error: "La contraseña debe tener al menos 4 caracteres" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
