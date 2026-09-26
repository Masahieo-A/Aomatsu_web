import type { Worksheet, WorksheetCheckQuestion, WorksheetSource } from "@/lib/worksheet/types";

type Props = {
  worksheet: Worksheet;
  source: WorksheetSource;
  showAnswers: boolean;
};

/** 全問の1行目（「空所に入る…選びなさい。」など）が同じなら、Part の指示として1回だけ出す */
function splitCommonInstruction(questions: WorksheetCheckQuestion[]): { instruction: string; bodies: string[] } {
  const firstLines = questions.map((q) => q.prompt.split("\n")[0].trim());
  const common = firstLines[0] ?? "";
  const shared = questions.length > 1
    && common.endsWith("。")
    && firstLines.every((line) => line === common)
    && questions.every((q) => q.prompt.includes("\n"));
  if (!shared) return { instruction: "", bodies: questions.map((q) => q.prompt) };
  return { instruction: common, bodies: questions.map((q) => q.prompt.split("\n").slice(1).join("\n").trim()) };
}

/** 表示幅の目安（全角=2、半角=1） */
function textWidth(text: string): number {
  return [...text].reduce((sum, char) => sum + (char.charCodeAt(0) > 0xff ? 2 : 1), 0);
}

/** 確認問題は2列配置なので、半分の幅に収まるよう選択肢の並べ方を決める */
function choiceColumns(question: WorksheetCheckQuestion): string {
  const longest = Math.max(...question.choices.map((c) => textWidth(c.text)));
  if (longest <= 6) return "grid-cols-4";
  if (longest <= 16) return "grid-cols-2";
  return "grid-cols-1";
}

function Lines({ count, className = "" }: { count: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-[8mm] border-b border-dotted border-gray-500" />
      ))}
    </div>
  );
}

function PartHeading({ no, title, note }: { no: number; title: string; note?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2 border-b-2 border-gray-800 pb-0.5">
      <span className="rounded-sm bg-gray-800 px-1.5 text-[9pt] font-bold text-white">Part {no}</span>
      <h2 className="text-[11.5pt] font-bold">{title}</h2>
      {note && <span className="text-[8.5pt] text-gray-600">{note}</span>}
    </div>
  );
}

export function WorksheetPrint({ worksheet, source, showAnswers }: Props) {
  const labelOf = new Map(source.knowledge.map((k) => [k.id, k.label]));
  const { instruction, bodies } = splitCommonInstruction(worksheet.checkQuestions);
  const unitName = `${source.unitCode} ${source.unitTitle}`.trim();

  return (
    <div className="ws-sheet bg-white text-[10pt] leading-[1.55] text-black">
      {/* ヘッダー */}
      <header className="ws-avoid-break mb-2">
        <div className="flex items-end justify-between gap-3 border-b-[3px] border-double border-gray-800 pb-1">
          <div>
            <p className="text-[8.5pt] text-gray-600">育てるAI グループ準備シート ｜ {unitName}</p>
            <h1 className="text-[16pt] font-black leading-tight">{worksheet.title}</h1>
          </div>
          <p className="whitespace-nowrap text-[10pt]">
            <span className="inline-block w-[10mm] border-b border-gray-700" />年
            <span className="ml-1 inline-block w-[10mm] border-b border-gray-700" />組
            <span className="ml-3">グループ No.</span>
            <span className="inline-block w-[12mm] border-b border-gray-700" />
          </p>
        </div>
        <div className="mt-2 grid grid-cols-5 border border-gray-700 text-[8.5pt]">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`h-[10mm] px-1 ${i < 4 ? "border-r border-gray-700" : ""}`}>
              <span className="text-gray-600">メンバー{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 rounded border border-gray-700 px-2 py-1">
          <span className="mr-2 text-[9pt] font-bold">今日のゴール</span>
          {worksheet.goal}
        </div>
      </header>

      {/* Part 1 確認問題 */}
      <section className="mb-3">
        <PartHeading no={1} title="確認問題" note="まず一人で解く → グループで答え合わせ。答えだけでなく「決め手」も話そう。" />
        {instruction && <p className="mb-1 text-[9pt]">{instruction}</p>}
        <ol className="grid grid-cols-2 gap-x-5 gap-y-2.5">
          {worksheet.checkQuestions.map((q, i) => (
            <li key={q.no} className="ws-avoid-break">
              <div className="flex gap-2">
                <span className="font-bold">({q.no})</span>
                <div className="flex-1">
                  <p className="whitespace-pre-line">{bodies[i]}</p>
                  <div className={`grid ${choiceColumns(q)} gap-x-2`}>
                    {q.choices.map((c) => (
                      <span key={c.label}>{c.label}. {c.text}</span>
                    ))}
                  </div>
                  <div className="mt-0.5 flex items-end gap-1.5 text-[8.5pt]">
                    <span className="whitespace-nowrap">答え</span>
                    <span className="inline-block h-[6mm] w-[9mm] shrink-0 border border-gray-700" />
                    <span className="pl-1 leading-tight">決め手：{q.reasonPrompt}</span>
                    <span className="h-[5mm] min-w-[12mm] flex-1 border-b border-dotted border-gray-500" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Part 2 ルールを言葉にしよう */}
      <section className="mb-3">
        <PartHeading no={2} title="ルールを言葉にしよう" note="ソウタに説明するつもりで、自分たちの言葉で書こう。" />
        <ol className="grid grid-cols-2 gap-x-5 gap-y-2">
          {worksheet.ruleQuestions.map((q, i) => (
            <li key={i} className="ws-avoid-break flex flex-col">
              <p className="text-[9.5pt] leading-snug">
                <span className="mr-1 font-bold">Q{i + 1}.</span>
                {q.question}
                {q.hint && <span className="ml-1 text-[8pt] text-gray-600">（ヒント：{q.hint}）</span>}
              </p>
              <Lines count={2} className="mt-auto" />
            </li>
          ))}
        </ol>
      </section>

      {/* Part 3 ソウタの間違いを直そう */}
      <section className="mb-3">
        <PartHeading no={3} title="ソウタの間違いを直そう" note="どこが違う？ ソウタにどう教え直す？" />
        <ol className="space-y-2">
          {worksheet.fixSouta.map((item, i) => (
            <li key={i} className="ws-avoid-break">
              <div className="flex items-start gap-2">
                <span className="mt-1 whitespace-nowrap rounded-full border border-gray-700 px-1.5 text-[8.5pt] font-bold">ソウタ</span>
                <p className="flex-1 rounded-lg border border-gray-700 px-2 py-1">{item.soutaSays}</p>
              </div>
              <Lines count={2} className="pl-12" />
            </li>
          ))}
        </ol>
      </section>

      {/* Part 4 例文づくり */}
      <section className="mb-3">
        <PartHeading no={4} title="教えるための例文を作ろう" note="ソウタに見せる例文をグループで作ろう。" />
        <ol className="space-y-2">
          {worksheet.exampleTasks.map((task, i) => (
            <li key={i} className="ws-avoid-break">
              <p><span className="mr-1 font-bold">{i + 1}.</span>{task.instruction}</p>
              <Lines count={2} className="pl-5" />
            </li>
          ))}
        </ol>
      </section>

      {/* Part 5 作戦メモ */}
      <section className="ws-avoid-break mb-2">
        <PartHeading no={5} title="ソウタに教える作戦メモ" />
        <div className="grid grid-cols-[1fr_auto] gap-x-5">
          <div>
            <p className="text-[9pt] font-bold">必ず使いたいキーワード（使えたら ✓）</p>
            <p className="mb-1 flex flex-wrap gap-x-3 text-[9.5pt]">
              {worksheet.teachingPlan.keywords.map((k) => (
                <span key={k}>□ {k}</span>
              ))}
            </p>
            <p className="text-[9pt] font-bold">
              教える順番
              {worksheet.teachingPlan.orderHint && <span className="ml-2 text-[8pt] font-normal text-gray-600">ヒント：{worksheet.teachingPlan.orderHint}</span>}
            </p>
            <div className="pl-1">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-end gap-1">
                  <span>{n}.</span>
                  <span className="h-[7mm] flex-1 border-b border-dotted border-gray-500" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9pt] font-bold">この文法を30字以内で説明すると？</p>
            <div className="mt-1 grid w-fit grid-cols-10 border-l border-t border-gray-700">
              {Array.from({ length: 30 }, (_, i) => (
                <span key={i} className="h-[7mm] w-[7mm] border-b border-r border-gray-700" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 解答ページ（教員用） */}
      {showAnswers && (
        <section className="ws-page-break pt-4 print:pt-0">
          <h2 className="mb-2 border-b-[3px] border-double border-gray-800 pb-1 text-[14pt] font-black">
            解答・指導メモ（教員用）<span className="ml-2 text-[9pt] font-normal text-gray-600">{worksheet.title}</span>
          </h2>
          <h3 className="mb-1 mt-2 font-bold">Part 1 確認問題</h3>
          <table className="w-full border-collapse text-[9pt]">
            <tbody>
              {worksheet.checkQuestions.map((q) => (
                <tr key={q.no} className="ws-avoid-break border-b border-gray-300 align-top">
                  <td className="w-[8mm] py-0.5 font-bold">({q.no})</td>
                  <td className="w-[8mm] py-0.5 font-bold">{q.answer}</td>
                  <td className="py-0.5">
                    {q.explanation}
                    <span className="ml-1 text-[7.5pt] text-gray-500">{q.source === "bank" ? q.sourceQuestionId : "新規作成"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="mb-1 mt-3 font-bold">Part 2 ルールを言葉にしよう（模範解答）</h3>
          <ol className="space-y-1 text-[9pt]">
            {worksheet.ruleQuestions.map((q, i) => (
              <li key={i} className="ws-avoid-break">
                <b>Q{i + 1}.</b>
                <span className="mx-1 text-[8pt] text-gray-500">［{labelOf.get(q.knowledgeId) ?? q.knowledgeId}］</span>
                {q.modelAnswer || "（模範解答なし）"}
              </li>
            ))}
          </ol>
          <h3 className="mb-1 mt-3 font-bold">Part 3 ソウタの間違い（直し方）</h3>
          <ol className="space-y-1 text-[9pt]">
            {worksheet.fixSouta.map((item, i) => (
              <li key={i} className="ws-avoid-break"><b>{i + 1}.</b> {item.modelAnswer || "（記載なし）"}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
