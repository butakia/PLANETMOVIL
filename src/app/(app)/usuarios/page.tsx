import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import UsersAdmin from "@/components/UsersAdmin";

export default async function UsuariosPage() {
  const u = await currentUser();
  if (u?.role !== "admin") redirect("/");
  return <UsersAdmin />;
}
