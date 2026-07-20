"use client";

import { JudgeResult } from "@/lib/judge";
import { ExamMethod } from "@/lib/types";
import MethodCard from "./MethodCard";
import { Badge } from "./Badge";

function VerdictBadge({ verdict }: { verdict: JudgeResult }) {
  switch (verdict.verdict) {
    case "ok":
      return <Badge color="green">○ 完全充足</Badge>;
    case "range_mismatch":
      return (
        <Badge color="yellow">
          △ 条件付き（
          {verdict.mismatches.map((m) => `${m.subject}:${m.baseRange}→${m.targetRange}`).join(", ")}）
        </Badge>
      );
    case "plus_one":
      return <Badge color="yellow">△ 追加1科目（{verdict.addSubject}）で受験可</Badge>;
    case "no_subject_exam":
      return <Badge color="purple">学科試験なし（書類・面接型）</Badge>;
    case "ng":
      return <Badge color="red">× 追加2科目以上必要</Badge>;
  }
}

export default function CandidateResult({
  method,
  verdict,
}: {
  method: ExamMethod;
  verdict: JudgeResult;
}) {
  return <MethodCard method={method} rightSlot={<VerdictBadge verdict={verdict} />} />;
}
