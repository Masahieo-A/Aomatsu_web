#!/usr/bin/env python3
"""flagged修復用の共通検証スクリプト。
使い方: python3 verify_quotes.py <repaired_json_path>
juken-data/ 直下で実行される前提のパス解決（このファイルと同階層のjuken-dataを見る）。
全evidence.quoteが対応する.txtに正規化後・部分一致するかを判定して結果を出力する。
終了コード: 全pass=0 / 失敗あり=1
"""
import json, re, sys, unicodedata, os

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "juken-data")

def normalize(s):
    s = unicodedata.normalize("NFKC", s)
    return re.sub(r"\s+", "", s)

def main(path):
    d = json.load(open(path))
    cache = {}
    def load(pdf):
        tp = os.path.join(BASE, pdf[:-4] + ".txt")
        if tp not in cache:
            cache[tp] = normalize(open(tp, encoding="utf-8", errors="ignore").read()) if os.path.exists(tp) else None
        return cache[tp]

    fails = 0
    for r in d:
        for e in r.get("evidence", []):
            t = load(e["pdfFile"])
            ok = t is not None and normalize(e["quote"]) in t
            if not ok:
                fails += 1
                print(f"FAIL {r['id']} :: {e['field']} :: {e['quote'][:60]!r}")
    print(f"--- {len(d)} records, {fails} quote failures ---")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
