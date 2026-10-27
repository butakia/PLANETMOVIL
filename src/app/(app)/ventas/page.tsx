import { currentUser } from "@/lib/auth";
import SalesList from "@/components/SalesList";

export default async function VentasPage() {
  return <SalesList role={(await currentUser())!.role} />;
}
