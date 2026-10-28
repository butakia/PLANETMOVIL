import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import Shell from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const stores = user.rotating ? await all<{ id: number; name: string; color: string }>("SELECT id,name,color FROM stores WHERE id IN (1,2) ORDER BY id") : [];
  return <Shell user={user} stores={stores}>{children}</Shell>;
}
