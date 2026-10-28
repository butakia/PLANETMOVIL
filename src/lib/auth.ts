import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { one } from "./db";

export type Role = "admin" | "seller" | "gerencia";
export type User = { id: number; username: string; name: string; role: Role; store_id: number | null; rotating?: boolean };

if (process.env.VERCEL && !process.env.SESSION_SECRET) throw new Error("Falta la variable SESSION_SECRET en Vercel (ver LEEME.md)");
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "planet-movil-dev-secret-cambiar-en-produccion");
const COOKIE = "pm_session";

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.COOKIE_SECURE === "true",
  });
}
export async function destroySession() {
  (await cookies()).delete(COOKIE);
}
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const u = await one<User>("SELECT id,username,name,role,store_id FROM users WHERE id=? AND active=1", [Number(payload.uid)]);
    if (u && u.role === "seller" && !u.store_id) {
      const c = Number((await cookies()).get("pm_store")?.value);
      return { ...u, store_id: [2, 3, 4].includes(c) ? c : 1, rotating: true };
    }
    return u;
  } catch {
    return null;
  }
}

/** Para route handlers: devuelve el usuario o una respuesta de error. */
export async function guard(roles?: Role[]): Promise<{ user: User; error?: undefined } | { error: NextResponse; user?: undefined }> {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Sesión expirada" }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) return { error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) };
  return { user };
}

/** Fecha (YYYY-MM-DD) en hora de Lima/Piura (UTC-5). */
export const limaDay = (d = new Date()) => new Date(d.getTime() - 5 * 3600e3).toISOString().slice(0, 10);
