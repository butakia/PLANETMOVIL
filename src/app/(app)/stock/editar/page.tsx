import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import StockEditor from "@/components/StockEditor";

export default async function EditarStockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const u = (await currentUser())!;
  if (u.role !== "admin") redirect("/stock");
  const { q } = await searchParams;
  return <StockEditor initialQ={q ?? ""} />;
}
