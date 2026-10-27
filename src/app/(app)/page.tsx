import Link from "next/link";
import { ArrowLeftRight, BarChart3, Clock, PackagePlus, Receipt, ShoppingCart, Warehouse } from "lucide-react";
import { currentUser } from "@/lib/auth";
import Reports from "@/components/Reports";
import QuickStockSearch from "@/components/QuickStockSearch";
import TodayStrip from "@/components/TodayStrip";

export default async function Home() {
  const u = (await currentUser())!;

  if (u.role === "seller") {
    return (
      <div className="stagger mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-extrabold tracking-tight">Hola, {u.name}</h1><p className="text-slate-500">¿Qué deseas hacer?</p></div>
          <Link href="/vender/fuera-de-tiempo" className="btn-ghost !py-2 text-amber-800"><Clock className="h-4 w-4" /> Registrar venta fuera de tiempo</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/vender" className="lift group flex min-h-40 flex-col justify-between rounded-3xl bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white shadow-lg">
            <ShoppingCart className="h-9 w-9 transition group-hover:scale-110" />
            <div><div className="text-2xl font-extrabold">Ingresar venta</div><div className="text-sm text-blue-100">Escribe el código y listo</div></div>
          </Link>
          <Link href="/ventas" className="lift group flex min-h-40 flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <Receipt className="h-9 w-9 text-blue-800 transition group-hover:scale-110" />
            <div><div className="text-2xl font-extrabold">Mis ventas</div><div className="text-sm text-slate-500">Hoy, la semana y más</div></div>
          </Link>
        </div>
        <TodayStrip />
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/stock" className="btn-ghost"><Warehouse className="h-4 w-4" /> Consultar stock</Link>
          <Link href="/trasladar" className="btn-ghost"><ArrowLeftRight className="h-4 w-4" /> Trasladar equipo</Link>
        </div>
      </div>
    );
  }

  const tiles = u.role === "admin"
    ? [
        { href: "/stock/nuevo", label: "Ingresar stock", icon: PackagePlus },
        { href: "/vender", label: "Vender", icon: ShoppingCart },
        { href: "/ventas", label: "Ventas", icon: Receipt },
        { href: "/informes", label: "Informes", icon: BarChart3 },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-extrabold tracking-tight">{u.role === "admin" ? "Hola, administrador" : `Hola, ${u.name}`}</h1>
        <p className="text-slate-500">Así van hoy las dos tiendas.</p></div>
      {tiles.length > 0 && (
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map(({ href, label, icon: I }) => (
            <Link key={href} href={href} className="lift group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-800 transition group-hover:bg-blue-800 group-hover:text-white"><I className="h-5 w-5" /></span>
              <span className="font-bold">{label}</span>
            </Link>
          ))}
        </div>
      )}
      <Reports role={u.role} home />
      <QuickStockSearch />
    </div>
  );
}
