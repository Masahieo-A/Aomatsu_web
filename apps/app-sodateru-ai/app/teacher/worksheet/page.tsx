"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { WorksheetPrint } from "@/components/worksheet/WorksheetPrint";
import { UNIT_CATALOG } from "@/lib/unit-catalog";
import { buildRequestTsv } from "@/lib/worksheet/export";
import { parseWorksheet } from "@/lib/worksheet/parse";
import { SYSTEM_PROMPT_VERSION, WORKSHEET_SYSTEM_PROMPT } from "@/lib/worksheet/system-prompt";
import type { WorksheetLevel, WorksheetParseResult, WorksheetSource } from "@/lib/worksheet/types";

const STORAGE_PREFIX = "sodateru-worksheet:v1:";
const LAST_UNIT_KEY = "sodateru-worksheet:v1:last-unit";

function initialUnitId(): string {
  try {
    const saved = typeof window === "undefined" ? null : window.localStorage.getItem(LAST_UNIT_KEY);
    if (saved && UNIT_CATALOG.some((u) => u.id === saved)) return saved;
  } catch {
    // 読めなければ先頭の単元
  }
  return UNIT_CATALOG[0].id;
}

type SavedState = { text: string; selectedKnowledgeIds: string[]; questionCount: number; level: WorksheetLevel };

function loadSaved(unitId: string): SavedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + unitId);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SavedState>;
    if (typeof value.text !== "string" || !Array.isArray(value.selectedKnowledgeIds)) return null;
    return {
      text: value.text,
      selectedKnowledgeIds: value.selectedKnowledgeIds.filter((id): id is string => typeof id === "string"),
      questionCount: typeof value.questionCount === "number" ? value.questionCount : 8,
      level: value.level === "basic" ? "basic" : "standard",
    };
  } catch {
    return null;
  }
}

function saveState(unitId: string, state: SavedState) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + unitId, JSON.stringify(state));
    window.localStorage.setItem(LAST_UNIT_KEY, unitId);
  } catch {
    // 保存できなくても画面はそのまま使える
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const inputClass =
  "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";
const buttonClass =
  "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-40";

export default function WorksheetPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"checking" | "ok" | "forbidden">("checking");

  const [unitId, setUnitId] = useState(initialUnitId);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>(
    () => UNIT_CATALOG.find((u) => u.id === unitId)?.knowledgeTopics.map((t) => t.id) ?? [],
  );
  const [questionCount, setQuestionCount] = useState(8);
  const [level, setLevel] = useState<WorksheetLevel>("standard");

  const [source, setSource] = useState<WorksheetSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [pasteText, setPasteText] = useState("");
  const [result, setResult] = useState<WorksheetParseResult | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [copied, setCopied] = useState<"tsv" | "prompt" | "failed" | null>(null);

  const unit = UNIT_CATALOG.find((u) => u.id === unitId);

  // 教員ログインの確認
  useEffect(() => {
    fetch("/api/teacher")
      .then((res) => res.json())
      .then((data: { authenticated?: boolean; teacher?: boolean }) => {
        if (!data?.authenticated) router.replace("/teacher");
        else setAuthState(data.teacher ? "ok" : "forbidden");
      })
      .catch(() => router.replace("/teacher"));
  }, [router]);

  // 単元の材料を取得し、前回の取り込み結果があれば復元する
  useEffect(() => {
    if (authState !== "ok") return;
    let cancelled = false;
    fetch(`/api/teacher/worksheet/${encodeURIComponent(unitId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "材料の取得に失敗しました");
        return data as WorksheetSource;
      })
      .then((data) => {
        if (cancelled) return;
        setSource(data);
        const saved = loadSaved(unitId);
        if (!saved) return;
        const validIds = saved.selectedKnowledgeIds.filter((id) => data.knowledge.some((k) => k.id === id));
        const ids = validIds.length > 0 ? validIds : data.knowledge.map((k) => k.id);
        setSelectedKnowledgeIds(ids);
        setQuestionCount(saved.questionCount);
        setLevel(saved.level);
        setPasteText(saved.text);
        if (saved.text.trim()) {
          setResult(parseWorksheet(saved.text, {
            unitId, selectedKnowledgeIds: ids, practice: data.practice, assessmentQuestionIds: data.assessmentQuestionIds,
          }));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setSourceError(error instanceof Error ? error.message : "材料の取得に失敗しました");
      });
    return () => { cancelled = true; };
  }, [authState, unitId]);

  const tsv = useMemo(
    () => (source ? buildRequestTsv(source, { selectedKnowledgeIds, questionCount, level }) : ""),
    [source, selectedKnowledgeIds, questionCount, level],
  );

  const changeUnit = (next: string) => {
    setUnitId(next);
    setSelectedKnowledgeIds(UNIT_CATALOG.find((u) => u.id === next)?.knowledgeTopics.map((t) => t.id) ?? []);
    setSource(null);
    setSourceError(null);
    setPasteText("");
    setResult(null);
  };

  // 選択を変えると、取り込み済みのプリントは材料と合わなくなるので破棄する
  const changeSelection = (ids: string[]) => {
    setSelectedKnowledgeIds(ids);
    setResult(null);
  };

  const handleCopy = async (kind: "tsv" | "prompt") => {
    const ok = await copyText(kind === "tsv" ? tsv : WORKSHEET_SYSTEM_PROMPT);
    setCopied(ok ? kind : "failed");
    window.setTimeout(() => setCopied(null), 2500);
  };

  const handleImport = () => {
    if (!source) return;
    const parsed = parseWorksheet(pasteText, {
      unitId,
      selectedKnowledgeIds,
      practice: source.practice,
      assessmentQuestionIds: source.assessmentQuestionIds,
    });
    setResult(parsed);
    if (parsed.worksheet) saveState(unitId, { text: pasteText, selectedKnowledgeIds, questionCount, level });
  };

  if (authState === "checking") {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">読み込み中...</div>;
  }
  if (authState === "forbidden") {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-600">このページは教員アカウントでのみ使えます。</div>;
  }

  const worksheet = result?.worksheet ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 print:min-h-0 print:bg-none print:bg-white">
      <header className="bg-white/80 backdrop-blur border-b border-gray-100 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AppIcon name="plant" size={28} className="text-green-600 shrink-0" />
            <span className="font-black text-indigo-700 text-lg whitespace-nowrap">育てるAI</span>
            <span className="text-sm text-gray-400 truncate">グループ準備プリント</span>
          </div>
          <Link href="/teacher/dashboard" className="text-sm text-gray-500 hover:text-gray-700 font-medium whitespace-nowrap">
            ← ダッシュボード
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 print:max-w-none print:p-0">
        <div className="space-y-6 print:hidden">
          {/* STEP 1 */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-800 mb-3">STEP 1　対象の文法項目を選ぶ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="sm:col-span-3 text-sm font-medium text-gray-700">
                単元
                <select value={unitId} onChange={(e) => changeUnit(e.target.value)} className={`${inputClass} mt-1`}>
                  {UNIT_CATALOG.map((u) => (
                    <option key={u.id} value={u.id}>{u.code} {u.title} — {u.description}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                確認問題の数
                <select value={questionCount} onChange={(e) => { setQuestionCount(Number(e.target.value)); setResult(null); }} className={`${inputClass} mt-1`}>
                  {Array.from({ length: 9 }, (_, i) => i + 4).map((n) => <option key={n} value={n}>{n}問</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                難易度の目安
                <select value={level} onChange={(e) => { setLevel(e.target.value === "basic" ? "basic" : "standard"); setResult(null); }} className={`${inputClass} mt-1`}>
                  <option value="standard">標準</option>
                  <option value="basic">基礎寄り</option>
                </select>
              </label>
            </div>
            <fieldset className="mt-4 border-t border-gray-100 pt-3">
              <legend className="text-sm font-bold text-gray-700 mb-2">
                扱う知識項目
                <button type="button" className="ml-3 text-xs font-medium text-indigo-600" onClick={() => changeSelection(unit?.knowledgeTopics.map((t) => t.id) ?? [])}>すべて選ぶ</button>
                <button type="button" className="ml-2 text-xs font-medium text-indigo-600" onClick={() => changeSelection([])}>すべて外す</button>
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {(unit?.knowledgeTopics ?? []).map((topic) => (
                  <label key={topic.id} className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedKnowledgeIds.includes(topic.id)}
                      onChange={(e) => changeSelection(
                        e.target.checked ? [...selectedKnowledgeIds, topic.id] : selectedKnowledgeIds.filter((id) => id !== topic.id),
                      )}
                    />
                    {topic.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">育てるAIの授業セッションで選ぶ項目と同じものにそろえてください。</p>
            </fieldset>
          </section>

          {/* STEP 2 */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-800 mb-2">STEP 2　サブスクAIに材料を渡す</h2>
            <ol className="text-sm text-gray-600 list-decimal pl-5 space-y-0.5 mb-3">
              <li>システムプロンプトを設定したAI（GPTs / Gem / Claude の Project など）を開く。未設定なら「システムプロンプトをコピー」して設定する。</li>
              <li>「材料をコピー」を押し、AIに貼り付けて送信する。</li>
              <li>返ってきたコードブロックを丸ごとコピーして、STEP 3 に貼る。</li>
            </ol>
            {sourceError && <p className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{sourceError}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy("tsv")}
                disabled={!source || selectedKnowledgeIds.length === 0}
                className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
              >
                材料をコピー
              </button>
              <button type="button" onClick={() => handleCopy("prompt")} className={`${buttonClass} border border-indigo-200 text-indigo-700 hover:bg-indigo-50`}>
                システムプロンプトをコピー
              </button>
              <span className="text-xs text-gray-400">プロンプト {SYSTEM_PROMPT_VERSION}</span>
              {copied === "tsv" && <span className="text-sm font-bold text-green-600">材料をコピーしました</span>}
              {copied === "prompt" && <span className="text-sm font-bold text-green-600">システムプロンプトをコピーしました</span>}
              {copied === "failed" && <span className="text-sm font-bold text-red-600">コピーできませんでした。下の欄から手動でコピーしてください。</span>}
            </div>
            {!source && !sourceError && <p className="mt-2 text-xs text-gray-400">材料を読み込み中...</p>}
            {selectedKnowledgeIds.length === 0 && <p className="mt-2 text-xs text-red-600">知識項目を1つ以上選んでください。</p>}
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-gray-500">材料の中身を見る（手動でコピーする場合）</summary>
              <textarea readOnly value={tsv} className={`${inputClass} mt-2 h-40 font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
            </details>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-500">システムプロンプトの中身を見る</summary>
              <textarea readOnly value={WORKSHEET_SYSTEM_PROMPT} className={`${inputClass} mt-2 h-40 font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
            </details>
          </section>

          {/* STEP 3 */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-800 mb-2">STEP 3　AIの出力を貼り付ける</h2>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'```json\n{ "format": "sodateru-worksheet", ... }\n```'}
              className={`${inputClass} h-48 font-mono text-xs`}
            />
            <div className="mt-2 flex items-center gap-3">
              <button type="button" onClick={handleImport} disabled={!source || !pasteText.trim()} className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>
                取り込む
              </button>
              {worksheet && <span className="text-sm font-bold text-green-600">取り込みました。下で確認して印刷できます。</span>}
            </div>
            {result && result.errors.length > 0 && (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <p className="font-bold mb-1">取り込めませんでした（{result.errors.length}件）。AIに直してもらうか、貼った内容を修正して再度「取り込む」を押してください。</p>
                <ul className="list-disc pl-5 space-y-0.5">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
            {result && result.warnings.length > 0 && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <p className="font-bold mb-1">確認してください（{result.warnings.length}件）</p>
                <ul className="list-disc pl-5 space-y-0.5">{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
          </section>

          {/* STEP 4 */}
          {worksheet && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-wrap items-center gap-4">
              <h2 className="text-base font-bold text-gray-800">STEP 4　確認して印刷</h2>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" checked={!showAnswers} onChange={() => setShowAnswers(false)} />生徒用のみ
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" checked={showAnswers} onChange={() => setShowAnswers(true)} />生徒用＋解答ページ（教員用）
              </label>
              <button type="button" onClick={() => window.print()} className={`${buttonClass} bg-green-600 text-white hover:bg-green-700 ml-auto`}>
                印刷する
              </button>
            </section>
          )}
        </div>

        {/* 印刷プレビュー（A4幅） */}
        {worksheet && source && (
          <div className="overflow-x-auto print:overflow-visible">
            <div className="mx-auto w-[210mm] bg-white p-[12mm] shadow-lg print:w-auto print:p-0 print:shadow-none">
              <WorksheetPrint worksheet={worksheet} source={source} showAnswers={showAnswers} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
