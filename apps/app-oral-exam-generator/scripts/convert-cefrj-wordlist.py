#!/usr/bin/env python3
"""CEFR-J Wordlist の CSV を data/wordlist.csv（word,level 形式）へ変換する。

使い方:
    python3 scripts/convert-cefrj-wordlist.py

入力: data/cefrj-vocabulary-profile-1.5.csv
      （Open Language Profiles 公開の CEFR-J Vocabulary Profile。
        列: headword, pos, CEFR, ...）
出力: data/wordlist.csv（word,level の2列・小文字見出し語）

変換ルール:
- 同じ語が複数の品詞で異なるレベルを持つ場合は最も易しいレベルを採用
  （いずれかの一般的な用法で易しいなら既知語とみなす）
- "a.m./A.M./am/AM" のようなスラッシュ区切りの表記ゆれは分割して全て登録
"""

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "cefrj-vocabulary-profile-1.5.csv"
DEST = ROOT / "data" / "wordlist.csv"

ORDER = {"A1": 0, "A2": 1, "B1": 2, "B2": 3, "C1": 4, "C2": 5}


def main() -> None:
    words: dict[str, str] = {}
    with SOURCE.open() as f:
        for row in csv.DictReader(f):
            level = row["CEFR"].strip().upper()
            if level not in ORDER:
                continue
            for variant in row["headword"].split("/"):
                word = variant.strip().lower()
                if not word:
                    continue
                if word not in words or ORDER[level] < ORDER[words[word]]:
                    words[word] = level

    with DEST.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["word", "level"])
        for word in sorted(words):
            writer.writerow([word, words[word]])

    print(f"{len(words)} words -> {DEST}")


if __name__ == "__main__":
    main()
