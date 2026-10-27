import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import Purchases from "@/components/Purchases";

export default async function ComprasPage() {
  const u = await currentUser();
  if (u?.role === "seller") redirect("/");
  return <Purchases />;
}
