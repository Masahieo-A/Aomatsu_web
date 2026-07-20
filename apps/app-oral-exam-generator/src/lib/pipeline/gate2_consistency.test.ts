import { describe, it, expect } from "vitest";
import {
  normalizeExtraction,
  extractionMatches,
} from "./gate2_consistency";

describe("Gate2 抜き出し解答の正規化・照合", () => {
  it("大文字小文字・前後空白の違いを吸収する", () => {
    expect(extractionMatches("To become a doctor", "  to become a doctor ")).toBe(
      true
    );
  });

  it("引用符・末尾句読点の違いを吸収する", () => {
    expect(extractionMatches('"my club activities"', "my club activities.")).toBe(
      true
    );
    expect(extractionMatches("「science」", "science")).toBe(true);
  });

  it("連続空白を1つに圧縮する", () => {
    expect(extractionMatches("real  effort", "real effort")).toBe(true);
  });

  it("内容が異なる解答は一致しない", () => {
    expect(extractionMatches("to become a doctor", "my grandmother")).toBe(false);
  });

  it("部分一致は一致とみなさない", () => {
    expect(extractionMatches("become a doctor", "to become a doctor")).toBe(false);
  });

  it("先頭の限定詞・所有格の差を吸収する", () => {
    expect(extractionMatches("These small actions", "small actions")).toBe(true);
    expect(extractionMatches("the national team", "national team")).toBe(true);
    expect(extractionMatches("my club activities", "club activities")).toBe(true);
    expect(extractionMatches("this experience", "that experience")).toBe(true);
  });

  it("先頭以外の限定詞は除去しない", () => {
    expect(
      extractionMatches("join the national team", "join national team")
    ).toBe(false);
  });

  it("限定詞だけの解答を空文字にしない", () => {
    // "these" 単独は限定詞除去の対象にしない（後続語が必要）
    expect(extractionMatches("these", "these")).toBe(true);
  });

  it("normalizeExtraction は文中の句読点を保持する", () => {
    expect(normalizeExtraction("I study science, and I read.")).toBe(
      "i study science, and i read"
    );
  });
});
