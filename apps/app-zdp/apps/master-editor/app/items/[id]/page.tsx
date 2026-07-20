import ItemEditor from "@/components/ItemEditor";

export default function EditItemPage({ params }: { params: { id: string } }) {
  return <ItemEditor id={params.id} />;
}
