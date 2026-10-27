import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import LabelPrinter from "@/components/LabelPrinter";

export default async function EtiquetasPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const u = await currentUser();
  if (u?.role !== "admin") redirect("/");
  const { id } = await searchParams;
  return <LabelPrinter initialId={id ? Number(id) : undefined} />;
}
