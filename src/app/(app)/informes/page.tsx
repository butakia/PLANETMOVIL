import { currentUser } from "@/lib/auth";
import Reports from "@/components/Reports";

export default async function InformesPage() {
  const u = (await currentUser())!;
  return <Reports role={u.role} defaultPreset={u.role === "seller" ? "hoy" : "semana"} />;
}
