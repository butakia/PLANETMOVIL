import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import StockForm from "@/components/StockForm";

export default async function NuevoStock() {
  const u = await currentUser();
  if (u?.role !== "admin") redirect("/stock");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Ingresar stock</h1>
        <p className="text-sm text-slate-500">Elige el tipo, escribe el modelo, escanea el IMEI y guarda. Los datos del equipo anterior se mantienen para ir más rápido.</p>
      </div>
      <StockForm />
    </div>
  );
}
