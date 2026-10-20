"use client";
import { useParams } from "next/navigation";
import RequireStudent from "@/components/RequireStudent";
import CardForm from "@/components/card/CardForm";

export default function CardPage() {
  const params = useParams<{ id: string }>();
  return <RequireStudent>{(s) => <CardForm id={params.id} s={s} />}</RequireStudent>;
}
