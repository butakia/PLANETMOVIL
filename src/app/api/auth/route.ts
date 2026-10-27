import { NextRequest, NextResponse } from "next/server";
import { checkPassword, one } from "@/lib/db";
import { createSession, currentUser, destroySession } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ user: await currentUser() });
}

// Vendedoras y gerencia entran solo con su usuario; quien tenga contraseña la usa.
export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const u = await one<{ id: number; role: string; password: string | null; active: number }>(
    "SELECT id,role,password,active FROM users WHERE username=?",
    [String(username ?? "").trim()],
  );
  if (!u || !u.active) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (u.password) {
    if (!password) return NextResponse.json({ needPassword: true });
    if (!checkPassword(String(password), u.password)) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 400 });
  }
  await createSession(u.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
