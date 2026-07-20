#!/usr/bin/env python3
"""PDFを既存juken-dataの規約に合わせてページ区切りテキストに変換する。
使い方: python3 pdf_to_txt.py <input.pdf> <output.txt>
既存ファイル例と同じ "=== PAGE N ===" 区切りを使う。
"""
import sys
import pdfplumber


def convert(pdf_path: str, txt_path: str) -> int:
    with pdfplumber.open(pdf_path) as pdf, open(txt_path, "w", encoding="utf-8") as out:
        for i, page in enumerate(pdf.pages, start=1):
            out.write(f"=== PAGE {i} ===\n")
            text = page.extract_text() or ""
            out.write(text)
            out.write("\n\n")
    return len(pdf.pages) if 'pdf' in dir() else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: pdf_to_txt.py <input.pdf> <output.txt>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
    print(f"wrote {sys.argv[2]}")
