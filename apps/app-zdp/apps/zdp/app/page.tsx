"use client";

import { useState } from "react";

type Phase =
  | "input"
  | "analyzing"
  | "vocab"
  | "probes"
  | "diagnosing"
  | "result"
  | "practice"
  | "done";

interface Identified {
  id: string;
  name: string;
  level: string;
  evidence: string;
  prerequisites: string[];
}
interface VocabWord {
  word: string;
  level: string;
  aboveTarget: boolean;
}
interface Probe {
  item_id: string;
  question: string;
  choices: string[];
  correct_index: number;
  misconception_index: number;
  rationale: string;
}
interface Outcome {
  item_id: string;
  quadrant: string;
}
interface Diagnosis {
  root_cause: string;
  error_items: string[];
  primary_item: { id: string; name: string; level: string } | null;
  scaffold: { id: string; name: string }[];
}

const LEVELS = ["A1", "A2", "B1", "B2"];

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [sentence, setSentence] = useState("");
  const [level, setLevel] = useState("B1");
  const [classCode, setClassCode] = useState("");
  const [seat, setSeat] = useState("");
  const [meta, setMeta] = useState<{ mock: boolean; cached: boolean; storage: string } | null>(null);

  const [sessionId, setSessionId] = useState("");
  const [difficult, setDifficult] = useState<VocabWord[]>([]);
  const [identified, setIdentified] = useState<Identified[]>([]);
  const [unknownWords, setUnknownWords] = useState<Set<string>>(new Set());

  const [probeIdx, setProbeIdx] = useState(0);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);

  // practice
  const [similar, setSimilar] = useState<{ sentence: string; span: string; japanese: string; verified: boolean } | null>(null);
  const [showJa, setShowJa] = useState(false);
  const [recheck, setRecheck] = useState<Probe | null>(null);
  const [recheckSel, setRecheckSel] = useState<number | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [revealed, setRevealed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const learnerId = classCode && seat ? `${classCode}-${seat}` : "anonymous";

  async function api<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error || `error ${res.status}`);
    return res.json();
  }

  // ---- STEP1-2 ----
  async function startAnalyze() {
    if (!sentence.trim()) return;
    setError("");
    setPhase("analyzing");
    setLoading(true);
    try {
      const r = await api<any>("/api/analyze", { sentence, learnerId, level });
      setSessionId(r.session_id);
      setDifficult(r.difficult_words ?? []);
      setIdentified(r.identified ?? []);
      setMeta({ mock: r.mock, cached: r.cached, storage: r.storage });
      setProbeIdx(0);
      setOutcomes([]);
      if ((r.difficult_words ?? []).length > 0) {
        setPhase("vocab");
      } else {
        await loadProbe(0, r.identified ?? []);
      }
    } catch (e) {
      setError((e as Error).message);
      setPhase("input");
    } finally {
      setLoading(false);
    }
  }

  // ---- 語彙プローブ（LLM不使用） ----
  function toggleWord(w: string) {
    const next = new Set(unknownWords);
    if (next.has(w)) next.delete(w);
    else next.add(w);
    setUnknownWords(next);
  }
  async function finishVocab() {
    await loadProbe(0, identified);
  }

  // ---- STEP3 構造プローブ ----
  async function loadProbe(idx: number, items: Identified[]) {
    if (idx >= items.length) {
      return runDiagnose(outcomes);
    }
    setPhase("probes");
    setProbeIdx(idx);
    setSelected(null);
    setConfidence(3);
    setLoading(true);
    try {
      const p = await api<Probe>("/api/probe", {
        sentence,
        item_id: items[idx].id,
      });
      setProbe(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitProbe() {
    if (selected == null || !probe) return;
    const isCorrect = selected === probe.correct_index;
    setLoading(true);
    try {
      const r = await api<{ quadrant: string }>("/api/respond", {
        session_id: sessionId,
        item_id: probe.item_id,
        probe_type: "structure",
        question: probe.question,
        answer: probe.choices[selected],
        is_correct: isCorrect,
        confidence,
      });
      const nextOutcomes = [...outcomes, { item_id: probe.item_id, quadrant: r.quadrant }];
      setOutcomes(nextOutcomes);
      const nextIdx = probeIdx + 1;
      if (nextIdx >= identified.length) {
        await runDiagnose(nextOutcomes);
      } else {
        await loadProbe(nextIdx, identified);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ---- STEP4 診断 ----
  async function runDiagnose(finalOutcomes: Outcome[]) {
    setPhase("diagnosing");
    setLoading(true);
    try {
      const d = await api<Diagnosis>("/api/diagnose", {
        session_id: sessionId,
        learnerId,
        outcomes: finalOutcomes,
      });
      setDiagnosis(d);
      setPhase("result");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ---- STEP5 練習 ----
  async function startPractice() {
    if (!diagnosis?.primary_item) {
      setPhase("done");
      return;
    }
    setPhase("practice");
    setLoading(true);
    setShowJa(false);
    setRevealed(false);
    setHintLevel(0);
    setFeedback("");
    setRecheckSel(null);
    try {
      const s = await api<any>("/api/similar", {
        item_id: diagnosis.primary_item.id,
        target_level: level,
      });
      setSimilar(s);
      const p = await api<Probe>("/api/probe", {
        sentence: s.sentence,
        item_id: diagnosis.primary_item.id,
      });
      setRecheck(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRecheck() {
    if (recheckSel == null || !recheck || !diagnosis?.primary_item) return;
    const correct = recheckSel === recheck.correct_index;
    if (correct) {
      setFeedback("正解！この構造をつかめてきたね。");
      setRevealed(true);
      return;
    }
    const nextHint = Math.min(hintLevel + 1, 3);
    setHintLevel(nextHint);
    setLoading(true);
    try {
      const f = await api<{ feedback: string }>("/api/feedback", {
        question: recheck.question,
        correct_answer: recheck.choices[recheck.correct_index],
        student_answer: recheck.choices[recheckSel],
        rationale: recheck.rationale,
        item_id: diagnosis.primary_item.id,
        hint_level: nextHint,
      });
      setFeedback(f.feedback);
      if (nextHint >= 3) setRevealed(true);
      setRecheckSel(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhase("input");
    setSentence("");
    setIdentified([]);
    setDifficult([]);
    setUnknownWords(new Set());
    setOutcomes([]);
    setDiagnosis(null);
    setSimilar(null);
    setProbe(null);
    setRecheck(null);
    setError("");
  }

  return (
    <main className="container-mobile">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand">ZDP つまずき診断</h1>
        {meta && (
          <span className="text-[10px] text-slate-400">
            {meta.mock ? "MOCK" : "LIVE"} / {meta.storage}
            {meta.cached ? " / cache" : ""}
          </span>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {/* ---------------- INPUT ---------------- */}
      {phase === "input" && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <label className="block text-sm font-medium">
              分からない英文を入力
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 p-3 text-sm"
              rows={3}
              placeholder="The theory, first proposed in 1984, has been challenged."
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">今の目安レベル</span>
              <select
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <details className="card">
            <summary className="cursor-pointer text-sm text-slate-500">
              クラス情報（任意・記録用）
            </summary>
            <div className="mt-3 flex gap-2">
              <input
                className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="クラスコード"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
              />
              <input
                className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="出席番号"
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
              />
            </div>
          </details>

          <button
            className="btn-primary w-full"
            onClick={startAnalyze}
            disabled={!sentence.trim()}
          >
            診断をはじめる
          </button>
          <p className="text-center text-xs text-slate-400">
            <a href="/teacher" className="underline">
              先生用ページ
            </a>
          </p>
        </div>
      )}

      {/* ---------------- ANALYZING ---------------- */}
      {(phase === "analyzing" || phase === "diagnosing") && (
        <div className="card text-center text-sm text-slate-500">
          {phase === "analyzing" ? "英文を分析しています…" : "原因を特定しています…"}
        </div>
      )}

      {/* ---------------- VOCAB ---------------- */}
      {phase === "vocab" && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <p className="text-sm font-medium">
              意味を<strong>知っている</strong>語をタップしてください
            </p>
            <div className="flex flex-wrap gap-2">
              {difficult.map((w) => (
                <button
                  key={w.word}
                  onClick={() => toggleWord(w.word)}
                  className={`rounded-full px-3 py-1 text-sm ring-1 ${
                    unknownWords.has(w.word)
                      ? "bg-white text-slate-400 ring-slate-200"
                      : "bg-blue-50 text-brand ring-brand/30"
                  }`}
                >
                  {w.word}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              タップを外した語＝まだ知らない語として扱います
            </p>
          </div>
          <button className="btn-primary w-full" onClick={finishVocab}>
            次へ
          </button>
        </div>
      )}

      {/* ---------------- PROBES ---------------- */}
      {phase === "probes" && probe && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            確認問題 {probeIdx + 1} / {identified.length}
          </div>
          <div className="card space-y-3">
            <p className="whitespace-pre-wrap text-sm font-medium">
              {probe.question}
            </p>
            <div className="space-y-2">
              {probe.choices.map((c, i) => (
                <button
                  key={i}
                  className={`choice ${selected === i ? "choice-selected" : ""}`}
                  onClick={() => setSelected(i)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="card space-y-2">
            <p className="text-xs text-slate-500">どのくらい自信がある？</p>
            <input
              type="range"
              min={1}
              max={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>自信なし</span>
              <span>{confidence}</span>
              <span>自信あり</span>
            </div>
          </div>
          <button
            className="btn-primary w-full"
            disabled={selected == null || loading}
            onClick={submitProbe}
          >
            回答する
          </button>
        </div>
      )}

      {/* ---------------- RESULT ---------------- */}
      {phase === "result" && diagnosis && (
        <div className="space-y-4">
          <div className="card space-y-2">
            <p className="text-xs text-slate-400">診断結果</p>
            {diagnosis.primary_item ? (
              <>
                <p className="text-base font-bold">
                  あなたの躓きは「{diagnosis.primary_item.name}」の
                  可能性が高いです
                </p>
                {diagnosis.scaffold.length > 0 && (
                  <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                    足場として先に確認したい項目:{" "}
                    {diagnosis.scaffold.map((s) => s.name).join(" → ")}
                  </div>
                )}
              </>
            ) : diagnosis.root_cause === "vocab" ||
              unknownWords.size > 0 ? (
              <p className="text-base font-bold">
                文法よりも語彙が原因の可能性が高いです。
                知らない語を先に確認しましょう。
              </p>
            ) : (
              <p className="text-base font-bold">
                大きな体系的つまずきは見つかりませんでした（偶発的なミスの可能性）。
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {diagnosis.primary_item && (
              <button className="btn-primary flex-1" onClick={startPractice}>
                似た例文で練習する
              </button>
            )}
            <button className="btn-ghost flex-1" onClick={reset}>
              最初から
            </button>
          </div>
        </div>
      )}

      {/* ---------------- PRACTICE ---------------- */}
      {phase === "practice" && similar && (
        <div className="space-y-4">
          <div className="card space-y-2">
            <p className="text-xs text-slate-400">
              類似例文（i+1・{similar.verified ? "検証済み" : "フォールバック"}）
            </p>
            <p className="text-sm font-medium">{similar.sentence}</p>
            {similar.span && (
              <p className="text-xs text-brand">注目: {similar.span}</p>
            )}
            <button
              className="text-xs text-slate-400 underline"
              onClick={() => setShowJa((v) => !v)}
            >
              {showJa ? "訳を隠す" : "訳を見る"}
            </button>
            {showJa && similar.japanese && (
              <p className="text-xs text-slate-500">{similar.japanese}</p>
            )}
          </div>

          {recheck && !revealed && (
            <div className="card space-y-3">
              <p className="text-sm font-medium">{recheck.question}</p>
              <div className="space-y-2">
                {recheck.choices.map((c, i) => (
                  <button
                    key={i}
                    className={`choice ${recheckSel === i ? "choice-selected" : ""}`}
                    onClick={() => setRecheckSel(i)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                className="btn-primary w-full"
                disabled={recheckSel == null || loading}
                onClick={submitRecheck}
              >
                回答する
              </button>
            </div>
          )}

          {feedback && (
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-brand-dark ring-1 ring-brand/20">
              {feedback}
            </div>
          )}

          {revealed && recheck && (
            <div className="card space-y-2 text-sm">
              <p className="font-medium">正解: {recheck.choices[recheck.correct_index]}</p>
              <p className="text-xs text-slate-500">{recheck.rationale}</p>
              <button className="btn-primary w-full" onClick={reset}>
                別の文を診断する
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="card space-y-3 text-center text-sm">
          <p>お疲れさま！</p>
          <button className="btn-primary w-full" onClick={reset}>
            最初から
          </button>
        </div>
      )}
    </main>
  );
}
