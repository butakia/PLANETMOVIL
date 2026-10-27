import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import SettingsAdmin from "@/components/SettingsAdmin";

export default async function AjustesPage() {
  const u = await currentUser();
  if (u?.role !== "admin") redirect("/");
  return <SettingsAdmin />;
}
