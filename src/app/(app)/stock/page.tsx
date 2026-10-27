import { currentUser } from "@/lib/auth";
import StockTable from "@/components/StockTable";

export default async function StockPage() {
  const u = (await currentUser())!;
  return <StockTable role={u.role} />;
}
