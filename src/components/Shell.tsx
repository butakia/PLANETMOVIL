"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight, BarChart3, Bell, BellRing, Home, LogOut, PackagePlus, Receipt, Settings, ShoppingBag, ShoppingCart, Users, Warehouse, Wallet,
} from "lucide-react";
import Logo from "./Logo";
import { api } from "@/lib/client";

type U = { id: number; username: string; name: string; role: "admin" | "seller" | "gerencia"; store_id: number | null };

const NAV: Record<U["role"], { href: string; label: string; icon: typeof Home }[]> = {
  admin: [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/stock", label: "Stock", icon: Warehouse },
    { href: "/stock/nuevo", label: "Ingresar", icon: PackagePlus },
    { href: "/vender", label: "Vender", icon: ShoppingCart },
    { href: "/ventas", label: "Ventas", icon: Receipt },
    { href: "/informes", label: "Informes", icon: BarChart3 },
    { href: "/compras", label: "Compras", icon: Wallet },
    { href: "/alertas", label: "Alertas", icon: Bell },
    { href: "/usuarios", label: "Usuarios", icon: Users },
    { href: "/ajustes", label: "Ajustes", icon: Settings },
  ],
  gerencia: [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/stock", label: "Stock", icon: Warehouse },
    { href: "/ventas", label: "Ventas", icon: Receipt },
    { href: "/informes", label: "Informes", icon: BarChart3 },
    { href: "/compras", label: "Compras", icon: Wallet },
    { href: "/alertas", label: "Alertas", icon: Bell },
  ],
  seller: [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/vender", label: "Vender", icon: ShoppingCart },
    { href: "/ventas", label: "Mis ventas", icon: Receipt },
    { href: "/stock", label: "Stock", icon: Warehouse },
  ],
};
const ROLE_LABEL = { admin: "Administrador", gerencia: "Gerencia · Consulta e informes", seller: "Vendedora" };

export default function Shell({ user, children }: { user: U; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const items = NAV[user.role];
  const active = (href: string) => (href === "/" ? path === "/" : path === href || (path.startsWith(href + "/") && !items.some((i) => i.href !== href && i.href.startsWith(href + "/") && path.startsWith(i.href))));
  const watcher = user.role !== "seller";

  async function logout() {
    await api("/api/auth", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Barra lateral (PC) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-blue-800 to-blue-950 p-4 text-white lg:flex">
        <div className="mb-6 flex items-center gap-3 px-2 pt-2">
          <Logo size={40} />
          <div>
            <div className="text-lg font-extrabold leading-tight">Planet Movil</div>
            <div className="text-[11px] text-blue-200">Gestión de tiendas</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active(href) ? "bg-white text-blue-800 shadow" : "text-blue-100 hover:bg-white/10"}`}>
              <Icon className="h-[18px] w-[18px]" /> {label}
            </Link>
          ))}
        </nav>
        <div className="rounded-xl bg-white/10 p-3 text-sm">
          <div className="font-bold">{user.name}</div>
          <div className="text-xs text-blue-200">{ROLE_LABEL[user.role]}</div>
          <button onClick={logout} className="mt-2 flex items-center gap-2 text-xs font-semibold text-blue-100 hover:text-white"><LogOut className="h-3.5 w-3.5" /> Cerrar sesión</button>
        </div>
      </aside>

      {/* Cabecera (móvil) */}
      <header className="no-print sticky top-0 z-20 flex items-center gap-3 bg-gradient-to-r from-blue-700 to-blue-800 px-4 py-3 text-white shadow lg:hidden">
        <Logo size={30} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-extrabold">Planet Movil</div>
          <div className="truncate text-[11px] text-blue-200">{user.name} · {ROLE_LABEL[user.role]}</div>
        </div>
        {watcher && <BellButton />}
        <button onClick={logout} aria-label="Salir" className="rounded-lg p-2 hover:bg-white/10"><LogOut className="h-5 w-5" /></button>
      </header>

      <main key={path} className="anim-in mx-auto max-w-[1400px] px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      {watcher && <AlertWatcher />}

      {/* Navegación inferior (móvil) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex min-w-[4.6rem] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-semibold ${active(href) ? "text-blue-700" : "text-slate-500"}`}>
            <span className={`rounded-full px-4 py-1 ${active(href) ? "bg-blue-100" : ""}`}><Icon className="h-5 w-5" /></span>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function BellButton() {
  return (
    <Link href="/alertas" className="relative rounded-lg p-2 hover:bg-white/10" aria-label="Alertas">
      <Bell className="h-5 w-5" />
      <span id="pm-bell-dot" className="absolute right-1 top-1 hidden h-2.5 w-2.5 rounded-full bg-rose-400" />
    </Link>
  );
}

/** Consulta alertas cada 15 s, muestra avisos emergentes y notificaciones del navegador. */
function AlertWatcher() {
  const lastId = useRef<number | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; flagged: number }[]>([]);
  const [perm, setPerm] = useState<string>("unsupported");
  const router = useRouter();

  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
    let stop = false;
    async function tick() {
      try {
        const { alerts, unread } = await api<{ alerts: { id: number; message: string; flagged: number; type: string }[]; unread: number }>("/api/alerts?limit=10");
        const dot = document.getElementById("pm-bell-dot");
        if (dot) dot.classList.toggle("hidden", unread === 0);
        const maxId = alerts[0]?.id ?? 0;
        if (lastId.current === null) lastId.current = maxId;
        else if (maxId > lastId.current) {
          const fresh = alerts.filter((a) => a.id > lastId.current!).reverse();
          lastId.current = maxId;
          setToasts((t) => [...t, ...fresh.map((a) => ({ id: a.id, message: a.message, flagged: a.flagged }))]);
          if (typeof Notification !== "undefined" && Notification.permission === "granted")
            fresh.forEach((a) => new Notification(a.flagged ? "Venta con modificación" : "Planet Movil", { body: a.message, icon: "/icon.svg" }));
          router.refresh();
          window.dispatchEvent(new Event("pm-new-alert"));
        }
      } catch {}
      if (!stop) setTimeout(tick, 15000);
    }
    tick();
    return () => { stop = true; };
  }, [router]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((x) => x.slice(1)), 9000);
    return () => clearTimeout(t);
  }, [toasts]);

  return (
    <>
      {perm === "default" && (
        <button onClick={async () => setPerm(await Notification.requestPermission())}
          className="no-print fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg lg:bottom-6">
          <BellRing className="h-4 w-4" /> Activar notificaciones de ventas
        </button>
      )}
      <div className="fixed right-3 top-16 z-50 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2 lg:top-4">
        {toasts.slice(0, 3).map((t) => (
          <div key={t.id} className={`flex gap-3 rounded-2xl border p-3.5 shadow-xl ${t.flagged ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-white"}`}>
            <div className={`mt-0.5 rounded-full p-2 ${t.flagged ? "bg-amber-200 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}><ShoppingBag className="h-4 w-4" /></div>
            <p className="text-sm font-medium text-slate-800">{t.message}</p>
          </div>
        ))}
      </div>
    </>
  );
}
