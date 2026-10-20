// 教員ダッシュボード用の集計。サーバー専用（クライアントから import しない）。
import type { Settings } from "@/lib/types";
import type { DashboardData, DashStudent } from "@/components/teacher/types";
import type { Repo } from "./db";

export async function buildDashboard(repo: Repo, settings: Settings, classId?: string): Promise<DashboardData> {
  const [stats, cards, hints, students] = await Promise.all([
    repo.getStats(classId),
    repo.listCards(classId),
    repo.hintCounts(classId),
    // 全クラス表示のときは生徒別一覧を返さない（件数が多く、クラスを選んで見る前提）
    classId ? repo.listStudents(classId) : Promise.resolve([]),
  ]);

  const byStudent = new Map<number, DashStudent>();
  const ensure = (number: number): DashStudent => {
    let s = byStudent.get(number);
    if (!s) {
      s = { classId: classId ?? "", number, stanceBefore: null, stanceAfter: null, cardCount: 0, soWhatCount: 0, cards: [] };
      byStudent.set(number, s);
    }
    return s;
  };
  for (const st of students) {
    const s = ensure(st.number);
    s.stanceBefore = st.stanceBefore;
    s.stanceAfter = st.stanceAfter;
  }

  const cardStudents = new Set<string>();
  let soWhatCount = 0;
  for (const c of cards) {
    const has = c.soWhat.trim() !== "";
    cardStudents.add(`${c.classId}:${c.number}`);
    if (has) soWhatCount += 1;
    if (!classId) continue;
    const s = ensure(c.number);
    s.cardCount += 1;
    if (has) s.soWhatCount += 1;
    s.cards.push({ articleId: c.articleId, side: c.side, point: c.point, fact: c.fact, soWhat: c.soWhat, weakPoint: c.weakPoint, hasSoWhat: has });
  }

  return {
    classId: classId ?? null,
    stats,
    cardCount: cards.length,
    soWhatCount,
    cardStudents: cardStudents.size,
    hintTop: hints.slice(0, 3),
    students: [...byStudent.values()].sort((a, b) => a.number - b.number),
    settings,
  };
}
