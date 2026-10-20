"use client";
import { useCallback, useEffect, useState } from "react";
import StanceChart from "@/components/StanceChart";
import { getArticle } from "@/lib/content";
import type { Settings } from "@/lib/types";
import PurgePanel from "./PurgePanel";
import SettingsForm from "./SettingsForm";
import StudentList from "./StudentList";
import { downloadCsv, isAuthFailure, teacherPost, type TeacherResponse } from "./teacher-api";
import type { DashboardData } from "./types";

export default function Dashboard({
  passcode,
  onLogout,
  onAuthFail,
}: {
  passcode: string;
  onLogout: () => void;
  onAuthFail: (message: string) => void;
}) {
  const [classId, setClassId] = useState(""); // "" = 全クラス
  const [data, setData] = useState<DashboardData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noDb, setNoDb] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const apply = useCallback(
    ({ status, result }: TeacherResponse<DashboardData>) => {
      if (isAuthFailure(status)) return onAuthFail(result.error ?? "認証できませんでした");
      if (result.noDb) {
        setNoDb(true);
        setNotice(result.error ?? null);
      } else if (result.ok && result.data) {
        setNoDb(false);
        setNotice(null);
        setData(result.data);
      } else {
        setNotice(result.error ?? "読み込めませんでした");
      }
    },
    [onAuthFail],
  );

  const fetchData = useCallback(
    (cls: string) => teacherPost<DashboardData>("dashboard", passcode, { classId: cls || undefined }),
    [passcode],
  );

  useEffect(() => {
    // クラスを素早く切り替えたとき、古い応答で上書きしない
    let alive = true;
    void fetchData(classId).then((r) => {
      if (alive) apply(r);
    });
    return () => {
      alive = false;
    };
  }, [classId, fetchData, apply]);

  async function csv(type: "cards" | "students") {
    setCsvError(null);
    const r = await downloadCsv(passcode, type, classId);
    if (isAuthFailure(r.status)) return onAuthFail(r.error ?? "認証できませんでした");
    if (r.error) setCsvError(r.error);
  }

  const loading = !!data && data.classId !== (classId || null) && !notice;
  const classes = data?.settings.classes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="field-label" htmlFor="class-select">
            クラス
          </label>
          <select id="class-select" className="field" value={classId} onChange={(e) => setClassId(e.target.value)} disabled={!data}>
            <option value="">全クラス</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-secondary" onClick={onLogout}>
          閉じる
        </button>
      </div>

      {noDb && (
        <p className="box text-sm font-semibold" role="status">
          {notice}。Supabase を設定すると集計が表示されます（README 参照）。
        </p>
      )}
      {!noDb && notice && (
        <p className="error-text" role="alert">
          {notice}
        </p>
      )}
      {!data && !noDb && !notice && <p className="muted">読み込み中…</p>}

      {data && (
        <div className={loading ? "space-y-6 opacity-50" : "space-y-6"} aria-busy={loading}>
          <section>
            <h2 className="section-title">立場の分布（{data.classId ?? "全クラス"}・回答 {data.stats.students} 人）</h2>
            <div className="box">
              <StanceChart before={data.stats.before} after={data.stats.after} />
            </div>
          </section>

          <section>
            <h2 className="section-title">Card</h2>
            <div className="box text-sm">
              <p>
                作成数 <span className="font-bold">{data.cardCount}</span> 枚（作成した生徒 {data.cardStudents} 人）
              </p>
              <p>
                So what 記入あり {data.soWhatCount} 枚／
                {data.cardCount - data.soWhatCount > 0 ? (
                  <span className="font-semibold text-red-700">未記入 {data.cardCount - data.soWhatCount} 枚</span>
                ) : (
                  "未記入 0 枚"
                )}
              </p>
            </div>
          </section>

          <section>
            <h2 className="section-title">ヒントがよく開かれた段落 Top 3</h2>
            {data.hintTop.length === 0 ? (
              <p className="muted">まだ記録がありません。</p>
            ) : (
              <ol className="box space-y-2 text-sm">
                {data.hintTop.map((h, i) => (
                  <li key={`${h.articleId}:${h.level}:${h.paragraph}`}>
                    <span className="font-bold">{i + 1}. </span>
                    {h.articleId} {getArticle(h.articleId)?.hookTitle ?? ""}
                    <br />
                    <span className="muted">
                      {h.level === "lv1" ? "Lv1" : "Lv2"}・第{h.paragraph + 1}段落・{h.count} 回
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2 className="section-title">生徒別の Card</h2>
            {data.classId ? (
              <StudentList students={data.students} />
            ) : (
              <p className="muted">クラスを選ぶと、生徒ごとの一覧が表示されます。</p>
            )}
          </section>

          <section>
            <h2 className="section-title">CSV（{data.classId ?? "全クラス"}）</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => csv("cards")}>
                Card 一覧 CSV
              </button>
              <button type="button" className="btn-secondary" onClick={() => csv("students")}>
                立場 CSV
              </button>
            </div>
            {csvError && (
              <p className="error-text mt-2" role="alert">
                {csvError}
              </p>
            )}
          </section>

          <section>
            <h2 className="section-title">設定</h2>
            <SettingsForm
              key={JSON.stringify(data.settings)}
              settings={data.settings}
              passcode={passcode}
              onAuthFail={onAuthFail}
              onSaved={(s: Settings) => setData({ ...data, settings: s })}
            />
          </section>

          <section>
            <h2 className="section-title">データ削除</h2>
            <PurgePanel passcode={passcode} onAuthFail={onAuthFail} onPurged={() => void fetchData(classId).then(apply)} />
          </section>
        </div>
      )}
    </div>
  );
}
