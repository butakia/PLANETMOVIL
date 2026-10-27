import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import SaleForm from "@/components/SaleForm";

export default async function FueraDeTiempoPage() {
  const u = (await currentUser())!;
  if (u.role === "gerencia") redirect("/");
  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold tracking-tight">Venta fuera de tiempo</h1>
        <p className="text-sm text-slate-500">Para una venta que olvidaste registrar el día que la hiciste.</p>
      </div>
      <SaleForm user={u} late />
    </div>
  );
}
