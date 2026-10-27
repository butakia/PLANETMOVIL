import ReceiptView from "@/components/ReceiptView";

export default async function ReciboPage({ params }: { params: Promise<{ id: string }> }) {
  return <ReceiptView id={Number((await params).id)} />;
}
