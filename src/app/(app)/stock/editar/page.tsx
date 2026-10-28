import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import StockEditor from "@/components/StockEditor";

export default async function EditarStockPage() {
  const u = (await currentUser())!;
  if (u.role !== "admin") redirect("/stock");
  return <StockEditor />;
}
