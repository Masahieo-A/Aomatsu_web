// 併願照合アプリ データ型定義（要件定義書 §4 準拠）

export type SubjectName =
  | "英語"
  | "国語"
  | "数学"
  | "日本史"
  | "世界史"
  | "地理"
  | "公民"
  | "物理"
  | "化学"
  | "生物"
  | "情報";

export const ALL_SUBJECTS: SubjectName[] = [
  "英語",
  "国語",
  "数学",
  "日本史",
  "世界史",
  "地理",
  "公民",
  "物理",
  "化学",
  "生物",
  "情報",
];

export type SubjectCode = {
  subject: SubjectName;
  range?: string; // 範囲限定。例 国語:"古文漢文除く" / 数学:"ⅠAⅡBC"
};

export type NonAcademicItem =
  | "小論文"
  | "面接"
  | "書類"
  | "プレゼン"
  | "実技"
  | "基礎学力調査";

export type SubjectRequirement = {
  required: SubjectCode[];
  choiceGroups: { from: SubjectCode[]; pick: number }[];
  totalCount: number;
  nonAcademic: NonAcademicItem[];
};

export type Evidence = {
  field: string; // 例 "schedule.examDates"
  quote: string; // 要項からの逐語引用
  pdfFile: string; // juken-data相対パス
  page: number;
  verified: boolean;
};

export type MethodCategory = "shiteiko" | "kobo" | "sogo" | "ippan" | "kyotsu";

export type HeiganPolicy = "sengan" | "heigan_ok" | "unknown";

export type DataStatus = "confirmed_2027" | "carryover_2026";

export type ReviewStatus = "auto" | "flagged" | "confirmed";

export type Schedule = {
  applicationStart: string | null;
  applicationEnd: string | null;
  examDates: string[];
  examDateSelectable: boolean;
  resultDate: string | null;
  enrollDeadline: string | null;
};

export type ExamMethod = {
  id: string;
  university: string;
  faculty: string;
  department: string; // 学部一括募集は "-"
  methodName: string;
  methodCategory: MethodCategory;
  heiganPolicy: HeiganPolicy;
  subjects: SubjectRequirement | null;
  schedule: Schedule | null;
  fee: number | null;
  feeNote: string | null;
  dataYear: 2027 | 2026;
  dataStatus: DataStatus;
  evidence: Evidence[];
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export const METHOD_CATEGORY_LABEL: Record<MethodCategory, string> = {
  shiteiko: "指定校推薦",
  kobo: "公募推薦",
  sogo: "総合型選抜",
  ippan: "一般選抜",
  kyotsu: "共通テスト利用",
};

export const HEIGAN_POLICY_LABEL: Record<HeiganPolicy, string> = {
  sengan: "専願",
  heigan_ok: "併願可",
  unknown: "要確認",
};
