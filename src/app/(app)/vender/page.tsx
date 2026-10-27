import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { currentUser } from "@/lib/auth";
import SaleForm from "@/components/SaleForm";

export default async function VenderPage() {
  const u = (await currentUser())!;
  if (u.role === "gerencia") redirect("/");
  return (
    <div className="space-y-5">
      <div className="mx-auto flex max-w-2xl flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">Registrar venta</h1>
          <p className="text-sm text-slate-500">Escribe el código del equipo y se completan sus datos.</p>
        </div>
        <Link href="/vender/fuera-de-tiempo" className="btn-ghost !py-2 text-amber-800"><Clock className="h-4 w-4" /> Registrar venta fuera de tiempo</Link>
      </div>
      <SaleForm user={u} />
    </div>
  );
}
