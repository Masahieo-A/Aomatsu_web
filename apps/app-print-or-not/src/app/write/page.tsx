"use client";
import RequireStudent from "@/components/RequireStudent";
import WritingBuilder from "@/components/writing/WritingBuilder";

export default function WritePage() {
  return <RequireStudent>{(s) => <WritingBuilder s={s} />}</RequireStudent>;
}
