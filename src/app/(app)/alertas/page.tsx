import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AlertsList from "@/components/AlertsList";

export default async function AlertasPage() {
  const u = await currentUser();
  if (u?.role === "seller") redirect("/");
  return <AlertsList />;
}
