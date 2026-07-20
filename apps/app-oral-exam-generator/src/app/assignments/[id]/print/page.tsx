import { Fragment } from "react";
import { getStorage } from "@/lib/storage/adapter";
import type { Question, Submission } from "@/types";
import { PrintToolbar } from "./PrintToolbar";
import "./print.css";

export const dynamic = "force-dynamic";

/** 問いの並び順：客観（1,4）→ 産出（2,5）→ 著者性（3） */
const TYPE_ORDER: Record<number, number> = { 1: 0, 4: 1, 2: 2, 5: 3, 3: 4 };

/** 記述問題（型3,5）は4行、抜き出し・短答（型1,2,4）は1行 */
const ANSWER_LINES: Record<number, number> = { 1: 1, 2: 1, 4: 1, 3: 4, 5: 4 };

/** 設問文中の **語** を太字で描画 */
function renderBold(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>
  );
}

function sortQuestions(questions: Question[]): Question[] {
  return [...questions].sort(
    (a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9)
  );
}

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const isKey = view === "key";

  const storage = await getStorage();
  const [assignment] = await storage.list("assignments", {
    assignment_id: id,
  });
  const submissions = (
    await storage.list("submissions", { assignment_id: id })
  ).filter((s) => s.status === "approved");

  const questionsBySubmission = new Map<string, Question[]>();
  for (const s of submissions) {
    const questions = (
      await storage.list("questions", { submission_id: s.submission_id })
    ).filter((q) => q.status === "approved");
    questionsBySubmission.set(s.submission_id, sortQuestions(questions));
  }

  if (!assignment) {
    return <main className="p-8 text-sm">課題が見つかりません。</main>;
  }

  return (
    <div className="min-h-screen bg-slate-200">
      <PrintToolbar assignmentId={id} view={isKey ? "key" : "sheets"} />

      {submissions.length === 0 && (
        <p className="p-10 text-center text-sm text-slate-500">
          承認済みの提出がありません。レビュー画面で「全問を承認する」を実行してください。
        </p>
      )}

      {!isKey &&
        submissions.map((s) => (
          <StudentSheet
            key={s.submission_id}
            title={assignment.title}
            submission={s}
            questions={questionsBySubmission.get(s.submission_id) ?? []}
          />
        ))}

      {isKey && submissions.length > 0 && (
        <ScoringKey
          title={assignment.title}
          submissions={submissions}
          questionsBySubmission={questionsBySubmission}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 生徒配布用シート（1生徒＝A4縦1枚）
// ---------------------------------------------------------------------------

function StudentSheet({
  title,
  submission,
  questions,
}: {
  title: string;
  submission: Submission;
  questions: Question[];
}) {
  const sentences = submission.analysis?.sentences ?? [
    { index: 1, text: submission.text },
  ];
  return (
    <section className="sheet">
      {/* ヘッダー */}
      <div className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
        <div>
          <p className="text-[9pt] text-slate-600">内容理解テスト（口頭試問）</p>
          <h1 className="text-[14pt] font-bold">{title}</h1>
        </div>
        <table className="border-collapse text-[10pt]">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-1">番号</td>
              <td className="border border-black px-3 py-1 font-bold">
                {submission.student_label}
              </td>
              <td className="border border-black px-3 py-1">氏名</td>
              <td className="border border-black px-3 py-1" style={{ minWidth: "36mm" }}></td>
              <td className="border border-black px-3 py-1">得点</td>
              <td className="border border-black px-3 py-1 text-slate-400" style={{ minWidth: "18mm" }}>
                ／{questions.length}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 上部：本人の英文 */}
      <div className="mb-5 rounded border border-slate-400 p-4">
        <p className="mb-1 text-[8.5pt] font-bold text-slate-500">
          あなたが提出した英文（文番号つき）
        </p>
        <div className="essay-text">
          {sentences.map((s) => (
            <span key={s.index}>
              <span className="sentence-no">[{s.index}]</span>
              {s.text}{" "}
            </span>
          ))}
        </div>
      </div>

      {/* 中盤：問い＋下部：解答欄 */}
      <div className="space-y-5">
        {questions.map((q, i) => (
          <div key={q.question_id}>
            <p className="mb-2 text-[11pt] leading-relaxed">
              <span className="mr-2 font-bold">問{i + 1}.</span>
              {renderBold(q.question_text)}
            </p>
            <div className="ml-6 space-y-1">
              {Array.from({ length: ANSWER_LINES[q.type] ?? 2 }).map((_, li) => (
                <div key={li} className="answer-line" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[8pt] text-slate-400">
        ※ このテストはあなたの英文の内容にもとづいて個別に作成されています。本文を読み返して答えてかまいません。
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 教員用採点キー（全生徒の模範解答・採点基準一覧）
// ---------------------------------------------------------------------------

function ScoringKey({
  title,
  submissions,
  questionsBySubmission,
}: {
  title: string;
  submissions: Submission[];
  questionsBySubmission: Map<string, Question[]>;
}) {
  return (
    <section className="sheet">
      <h1 className="mb-1 text-[14pt] font-bold">採点キー（教員用）：{title}</h1>
      <p className="mb-4 text-[9pt] text-slate-500">
        ◯／×の2値で採点。1問の失点で丸投げと断定せず、複数問の傾向で判断してください。
      </p>
      {submissions.map((s) => (
        <div key={s.submission_id} className="mb-5 border-t border-slate-300 pt-3">
          <h2 className="mb-2 text-[11pt] font-bold">{s.student_label}</h2>
          {(questionsBySubmission.get(s.submission_id) ?? []).map((q, i) => (
            <div key={q.question_id} className="mb-3 ml-2 text-[9.5pt] leading-relaxed">
              <p className="font-semibold">
                問{i + 1}（型{q.type}・根拠：第{q.anchor.sentence_index}文「
                {q.anchor.quoted_span}」）：{renderBold(q.question_text)}
              </p>
              <ul className="ml-4 list-disc text-slate-800">
                <li>
                  <span className="font-semibold">模範解答</span>：{q.model_answer}
                </li>
                <li>
                  <span className="font-semibold">◯とする条件</span>：
                  {q.acceptable_conditions}
                </li>
                <li>
                  <span className="font-semibold">典型誤答</span>：{q.typical_wrong}
                </li>
                <li>
                  <span className="font-semibold">判定手順</span>：{q.scoring_steps}
                </li>
              </ul>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
