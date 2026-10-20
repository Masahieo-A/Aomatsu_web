// 静的データ（記事・論点・既定設定）の読み出し口。画面側はここ経由で参照する。
import type { Article, PointDef, Settings, Side } from "./types";
import pro01 from "@/data/articles/pro-01.json";
import pro02 from "@/data/articles/pro-02.json";
import pro03 from "@/data/articles/pro-03.json";
import pro04 from "@/data/articles/pro-04.json";
import con01 from "@/data/articles/con-01.json";
import con02 from "@/data/articles/con-02.json";
import con03 from "@/data/articles/con-03.json";
import con04 from "@/data/articles/con-04.json";
import pointsJson from "@/data/points.json";
import settingsJson from "@/data/settings-default.json";

export const ARTICLES = [pro01, pro02, pro03, pro04, con01, con02, con03, con04] as unknown as Article[];
export const POINTS = pointsJson as PointDef[];
export const DEFAULT_SETTINGS = settingsJson as Settings;

export function getArticle(id: string): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}

export function articlesBySide(side: Side): Article[] {
  return ARTICLES.filter((a) => a.side === side);
}

export function getPoint(id: string): PointDef | undefined {
  return POINTS.find((p) => p.id === id);
}

export const SIDE_LABEL: Record<Side, { en: string; ja: string; icon: string }> = {
  pro: { en: "Spread it", ja: "広めるべき", icon: "▲" },
  con: { en: "Restrict it", ja: "制限すべき", icon: "■" },
};

export const AUTHOR_TYPE_LABEL: Record<string, string> = {
  university: "大学",
  government: "政府・公的機関",
  company: "企業",
  media: "報道",
  journal: "学術誌",
};
