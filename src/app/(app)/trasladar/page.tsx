import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import TransferForm from "@/components/TransferForm";

export default async function TrasladarPage() {
  const u = (await currentUser())!;
  if (u.role === "gerencia") redirect("/");
  return <TransferForm user={u} />;
}
