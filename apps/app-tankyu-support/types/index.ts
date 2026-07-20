export type Role = "user" | "model";

export type ChatMessage = {
  role: Role;
  content: string;
};

/** UI ブロック（JSON 応答またはヒューリスティック解析の結果） */
export type ParsedBlock =
  | {
      type: "options";
      title?: string;
      options: Array<{ label: string; sendValue: string; tooltip?: string }>;
    }
  | {
      type: "lensPicker";
      title?: string;
      lenses: Array<{ label: string; sendValue: string; tooltip?: string }>;
    }
  | {
      type: "sections";
      title?: string;
      sections: Array<{
        title: string;
        displayTitle?: string;
        items: Array<{ label: string; sendValue: string; tooltip: string }>;
        tone?: "green" | "blue" | "amber" | "slate";
      }>;
    }
  | { type: "steps"; title?: string; steps: Array<{ title: string; body?: string }> }
  | { type: "themes"; title?: string; themes: Array<{ title: string; body?: string }> }
  | { type: "markdown"; content: string };

