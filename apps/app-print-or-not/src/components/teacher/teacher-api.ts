// 教員画面から教員 API を呼ぶ小さな道具（ブラウザ側）。
import type { ApiResult } from "@/lib/types";

export const PASSCODE_KEY = "pon:teacher:passcode";

export interface TeacherResponse<T> {
  status: number;
  result: ApiResult<T>;
}

export async function teacherPost<T>(
  path: string,
  passcode: string,
  extra: Record<string, unknown> = {},
): Promise<TeacherResponse<T>> {
  try {
    const res = await fetch(`/api/teacher/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...extra, passcode }),
    });
    const result = (await res.json()) as ApiResult<T>;
    return { status: res.status, result };
  } catch {
    return { status: 0, result: { ok: false, error: "通信できませんでした。接続を確認してください。" } };
  }
}

/** パスコードが違う・ロック中・未設定のときは、ダッシュボードを閉じて入力画面に戻す */
export function isAuthFailure(status: number): boolean {
  return status === 401 || status === 429 || status === 503;
}

/** CSV を取得して端末に保存する。失敗時はエラーメッセージ、成功時は null */
export async function downloadCsv(
  passcode: string,
  type: "cards" | "students",
  classId: string,
): Promise<{ error: string | null; status: number }> {
  try {
    const res = await fetch("/api/teacher/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode, type, classId: classId || undefined }),
    });
    if (!(res.headers.get("content-type") ?? "").includes("text/csv")) {
      const r = (await res.json()) as ApiResult;
      return { error: r.error ?? "CSV を作れませんでした", status: res.status };
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `print-or-not_${type}_${classId || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { error: null, status: 200 };
  } catch {
    return { error: "通信できませんでした。接続を確認してください。", status: 0 };
  }
}
