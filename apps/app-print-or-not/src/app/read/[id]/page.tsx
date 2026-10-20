"use client";
import { useParams } from "next/navigation";
import RequireStudent from "@/components/RequireStudent";
import ReaderView from "@/components/reader/ReaderView";

export default function ReadPage() {
  const params = useParams<{ id: string }>();
  return <RequireStudent>{(s) => <ReaderView id={params.id} s={s} />}</RequireStudent>;
}
