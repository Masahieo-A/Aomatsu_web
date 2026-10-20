/* Question Time 印刷 — ブラウザ内だけで動く（通信・AI なし）
 * データの流れ: Googleフォームの回答シート（essay）＋「質問」シート（Gemの出力） → IDで結合 → 点検 → A4描画 → 印刷
 */
(function () {
  "use strict";

  // ---------------- 固定仕様（Question Time 要件定義 v1.1 より） ----------------
  // プロンプト v5 の3問構成（答えやすい順: どっち型 → なぜ型 → もしも型）
  const Q_TYPES = [
    { label: "どっち型", structure: "選択と理由（I choose ... because）" },
    { label: "なぜ型", structure: "理由の説明（because / One reason is that）" },
    { label: "もしも型", structure: "条件と予想（If ..., I think ... because）" },
  ];
  const Q_FIELDS = ["引用", "質問", "和訳", "意図", "論点", "A例", "B例", "等価構造"];
  const REQUIRED_FIELDS = ["引用", "質問", "論点", "A例", "B例"];
  const LANGUAGE_RUBRIC = [
    ["2", "指定構造、または機能が同じ構造（等価構造）を使い、意味が通る（PL-3）"],
    ["1", "構造を使おうとしているが誤りがあり、意味が不明瞭"],
    ["0", "指定構造・等価構造が見られない／日本語で解答（PL-2）"],
  ];
  // §17.2 汎用予備問題（essayに依存しない。Content軸は評価対象外）。本番の質問と同じ「なぜ型・どっち型・もしも型」
  const BACKUP = [
    ["Think about the main idea of your essay. Is this idea more important for you or for people around you? Choose one and give one reason.", "あなたのessayの主な考えは、あなた自身と、あなたの周りの人のどちらにとって、より大切だと思いますか。どちらかを選び、理由を1つ書きましょう（1文でよい）。"],
    ["Choose the most important reason in your essay. Why is this reason important to you? Give one reason.", "あなたのessayでいちばん大事な理由を1つ選びましょう。それがあなたにとって大事なのはなぜですか。正解でなくてよいので、自分の考えを1文で書きましょう。"],
    ["Think about the main idea of your essay. If you lived in another country, do you think your idea would still be true? Give one reason.", "もし外国に住んでいたら、あなたのessayの主な考えはそれでも当てはまると思いますか。予想と理由を1つ書きましょう（1文でよい）。"],
  ];

  function rubricFor(qi, quote, point) {
    return {
      A: `問いに答え、essayの「${quote}」とつなげて説明している（論点: ${point}）`,
      B: `問いには答えているが、essayの「${quote}」とつながらない一般論`,
      C: "問いに答えていない／無回答／essayの丸写しだけ（PL-1）",
    };
  }

  // ---------------- 状態 ----------------
  const state = {
    essays: new Map(), // ID → {id, cls, num, name, essay, dup}
    fileQuestions: new Map(), // ID → row（スプレッドシートの「質問」シート）
    pastedQuestions: new Map(), // ID → row（画面に直接貼った分。こちらを優先）
    idAlias: new Map(), // 旧ID → 新ID（クラス表記をまとめたときの読み替え。例 1組-37 → 301組-37）
    edits: new Map(), // ID → {hash, fields: {列名: 修正後の値}}（編集タブでの個別修正。localStorage に保存）
    view: "preview", // preview | edit
    editId: "",
    kind: "student",
    status: "all",
    copied: new Set(),
  };
  const $ = (id) => document.getElementById(id);

  // ---------------- テキスト処理 ----------------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const nfkc = (s) => String(s ?? "").normalize("NFKC").trim();
  const normalize = (t) => nfkc(t).toLowerCase().replace(/[‘’`´]/g, "'").replace(/[“”«»]/g, '"').replace(/\s+/g, " ");
  const words = (t) => normalize(t).match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
  const wordCount = (t) => words(t).length;
  const joined = (t) => ` ${words(t).join(" ")} `;
  const containsQuote = (hay, quote) => words(quote).length > 0 && joined(hay).includes(joined(quote));
  function sharesNgram(a, b, n = 4) {
    const x = words(a);
    const y = joined(b);
    for (let i = 0; i + n <= x.length; i++) if (y.includes(` ${x.slice(i, i + n).join(" ")} `)) return true;
    return false;
  }
  const normId = (s) => nfkc(s).toUpperCase().replace(/\s+/g, "");
  const pad2 = (n) => String(n).padStart(2, "0");
  const hkey = (h) => nfkc(h).toLowerCase().replace(/\s+/g, "");

  // ---------------- 設定（このブラウザに保存） ----------------
  const SETTINGS = ["s-title", "s-date", "s-topic", "s-cefr", "s-minutes"];
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("qt-print-settings") || "{}");
      SETTINGS.forEach((k) => { if (saved[k] !== undefined) $(k).value = saved[k]; });
    } catch (_) { /* 保存領域が使えない環境でも動く */ }
  }
  function saveSettings() {
    try {
      localStorage.setItem("qt-print-settings", JSON.stringify(Object.fromEntries(SETTINGS.map((k) => [k, $(k).value]))));
    } catch (_) { /* noop */ }
  }
  const settings = () => ({
    title: $("s-title").value.trim() || "Question Time",
    date: $("s-date").value,
    topic: $("s-topic").value.trim(),
    cefr: $("s-cefr").value,
    minutes: $("s-minutes").value || "15",
  });

  // ---------------- 読み込み ----------------
  function sheetRows(ws) {
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false, blankrows: false })
      .map((r) => r.map((c) => String(c ?? "")));
  }

  function findCol(header, tests) {
    return header.findIndex((h) => tests.some((t) => (t instanceof RegExp ? t.test(hkey(h)) : hkey(h) === t)));
  }

  /** クラスと番号から ID を作る。数字だけのクラス名（例: 1）だと「1-01」がスプレッドシートで日付に化けるため「1組-01」にする */
  function essayId(cls, num) {
    const clsKey = /^\d+$/.test(cls) ? `${cls}組` : cls;
    return normId(`${clsKey}-${Number.isFinite(num) && num > 0 ? pad2(num) : "?"}`);
  }

  /**
   * クラスの表記ゆれをまとめる。「301」と「1」が混在していたら、「1」を末尾の組番号が一致する3桁クラス「301」に読み替える。
   * 候補の3桁クラスが1つに決まらない（301 と 201 が両方ある等）・3桁クラスがない場合は変えない。
   */
  function unifyClasses(list) {
    const long = [...new Set(list.map((e) => e.cls).filter((c) => /^\d{3}$/.test(c)))];
    const merged = new Map(); // "1" → {to: "301", count}
    const unresolved = new Set();
    if (!long.length) return { merged, unresolved };
    list.forEach((e) => {
      if (!e.fromCls || !/^\d{1,2}$/.test(e.cls)) return;
      const hits = long.filter((c) => Number(c.slice(1)) === Number(e.cls));
      if (hits.length !== 1) return unresolved.add(e.cls);
      const m = merged.get(e.cls) || { to: hits[0], count: 0 };
      m.count++;
      merged.set(e.cls, m);
      const oldId = e.id;
      e.cls = hits[0];
      e.id = essayId(e.cls, e.num);
      state.idAlias.set(oldId, e.id);
    });
    return { merged, unresolved };
  }

  /** フォームの回答シートらしいか（クラス・番号・essay 列があるか） */
  function parseEssaySheet(rows) {
    if (!rows.length) return null;
    const h = rows[0];
    const col = {
      id: findCol(h, ["id"]),
      ts: findCol(h, [/タイムスタンプ|timestamp/]),
      cls: findCol(h, [/クラス|^組$|^class/]),
      num: findCol(h, [/番号|^no\.?$|^number/]),
      name: findCol(h, [/氏名|名前|^name/]),
      essay: findCol(h, [/essay|エッセイ|英作文|本文/]),
    };
    if (col.essay < 0 || (col.id < 0 && (col.cls < 0 || col.num < 0))) return null;
    const list = [];
    rows.slice(1).forEach((r, i) => {
      const essay = String(r[col.essay] || "").replace(/\r\n/g, "\n").trim();
      if (!essay) return;
      const cls = col.cls >= 0 ? nfkc(r[col.cls]).toUpperCase() : "";
      const num = col.num >= 0 ? parseInt(nfkc(r[col.num]), 10) : NaN;
      const fromCls = !(col.id >= 0 && nfkc(r[col.id]));
      const id = fromCls ? essayId(cls, num) : normId(r[col.id]);
      list.push({ id, fromCls, cls, num: Number.isFinite(num) ? num : 0, name: col.name >= 0 ? nfkc(r[col.name]) : "", essay, order: i });
    });
    return list;
  }

  /** Gemの出力（見出し: ID, 主張, 理由, Q1_引用 …）。見出し行が途中に繰り返されても可 */
  function parseQuestionRows(rows) {
    const map = new Map();
    let header = null;
    for (const r of rows) {
      const first = hkey(r[0]);
      if (first === "id" && r.some((c) => hkey(c) === "q1_質問")) { header = r.map((c) => nfkc(c)); continue; }
      if (!header || !nfkc(r[0])) continue;
      const obj = {};
      header.forEach((k, i) => { if (k) obj[k] = nfkc(r[i] ?? "").replace(/^"|"$/g, ""); });
      map.set(normId(obj.ID), obj);
    }
    return map;
  }

  async function loadFiles(files) {
    const notes = [];
    let essayList = null;
    let qMap = null;
    for (const file of files) {
      try {
        // CSV は UTF-8 の文字列として読む（BOMのないGoogleスプレッドシートのCSVが文字化けして列を判定できないため）
        const wb = /\.(csv|tsv|txt)$/i.test(file.name)
          ? XLSX.read((await file.text()).replace(/^\uFEFF/, ""), { type: "string" })
          : XLSX.read(await file.arrayBuffer(), { type: "array" });
        for (const name of wb.SheetNames) {
          const rows = sheetRows(wb.Sheets[name]);
          // 再編集用データの「設定」シート（課題名・トピックなど）を復元する
          if (name === "設定" && hkey(rows[0]?.[0]) === "キー") {
            let n = 0;
            rows.slice(1).forEach(([k, v]) => { if (SETTINGS.includes(nfkc(k))) { $(nfkc(k)).value = v ?? ""; n++; } });
            if (n) { saveSettings(); notes.push(["ok", `「設定」シートから課題情報（課題名・トピックなど）を復元しました。`]); }
            continue;
          }
          const q = parseQuestionRows(rows);
          if (q.size) {
            qMap = qMap || new Map();
            q.forEach((v, k) => qMap.set(k, v));
            notes.push(["ok", `「${name}」シート（${file.name}）から質問を ${q.size} 人分読み込みました。`]);
            continue;
          }
          const e = parseEssaySheet(rows);
          if (e && e.length) {
            essayList = (essayList || []).concat(e);
            notes.push(["ok", `「${name}」シート（${file.name}）から essay を ${e.length} 件読み込みました。`]);
          }
        }
      } catch (err) {
        notes.push(["error", `${file.name} を読み込めませんでした（${err.message || err}）`]);
      }
    }
    if (essayList) {
      state.idAlias = new Map();
      const { merged, unresolved } = unifyClasses(essayList);
      merged.forEach((m, from) => notes.push(["warn", `クラス「${from}」の ${m.count} 件を「${m.to}」と同じクラスにまとめました。`]));
      if (unresolved.size) notes.push(["warn", `クラス「${[...unresolved].join("」「")}」は、どの3桁クラスにまとめるか決められないため、そのままにしました。`]);
      // 同じIDの重複提出は最後の回答を採用（§2.9）
      const map = new Map();
      const dups = new Set();
      essayList.forEach((e) => { if (map.has(e.id)) dups.add(e.id); map.set(e.id, e); });
      dups.forEach((id) => (map.get(id).dup = true));
      state.essays = map;
      if (dups.size) notes.push(["warn", `同じ番号の提出が複数ありました（${[...dups].join(", ")}）。最後の回答を使います。`]);
    }
    if (qMap) state.fileQuestions = qMap;
    if (!essayList && !qMap) notes.push(["error", "フォームの回答シート（クラス・番号・essay の列）も「質問」シート（ID・Q1_質問 の列）も見つかりませんでした。"]);
    const orphan = [...questionsMap().keys()].filter((id) => !state.essays.has(id));
    if (state.essays.size && orphan.length) notes.push(["warn", `質問はあるが essay が見つからないID: ${orphan.join(", ")}（IDの書き方を確認してください）`]);
    $("load-summary").innerHTML = notes.map(([t, m]) => `<p class="notice ${t === "ok" ? "" : t}">${esc(m)}</p>`).join("");
    refreshAll();
  }

  /** 質問（ファイル＋貼り付け）。クラスをまとめる前の旧ID（例 1組-37）で作った質問も新IDで引けるようにする */
  const baseQuestionsMap = () => {
    const map = new Map([...state.fileQuestions, ...state.pastedQuestions]);
    state.idAlias.forEach((to, from) => {
      if (map.has(from) && !map.has(to)) map.set(to, map.get(from));
      map.delete(from);
    });
    return map;
  };
  /** Gemの出力に、編集タブでの個別修正を重ねたもの（点検・プレビュー・印刷はすべてこれを使う） */
  const questionsMap = () => {
    const map = baseQuestionsMap();
    state.essays.forEach((s) => {
      const f = editsFor(s);
      if (f && Object.keys(f).length) map.set(s.id, { ...(map.get(s.id) || { ID: s.id }), ...f });
    });
    return map;
  };

  // ---------------- 個別修正（編集タブ） ----------------
  const EDIT_KEY = "qt-print-edits";
  const HEADER = ["ID", "主張", "理由", ...[1, 2, 3].flatMap((i) => Q_FIELDS.map((f) => `Q${i}_${f}`))];
  // 編集欄の並びと、その欄が印刷される場所
  const EDIT_WHERE = {
    主張: "採点シート", 理由: "採点シート", 引用: "解答用紙の下線（essayの本文と一字一句同じにする）", 質問: "解答用紙・採点シート・返却シート",
    和訳: "解答用紙・返却シート", 論点: "採点シート・返却シート（A基準）", A例: "採点シート・返却シート", B例: "採点シート",
    等価構造: "採点シート・返却シート", 意図: "採点シート",
  };
  const ED_Q_FIELDS = ["質問", "和訳", "引用", "論点", "A例", "B例", "等価構造", "意図"];
  // essay の本文が変わったら前の修正を使わないための目印
  const essayHash = (t) => { let h = 5381; for (const c of String(t)) h = ((h * 33) ^ c.codePointAt(0)) >>> 0; return h.toString(36); };
  function editsFor(s) {
    const e = state.edits.get(s.id);
    return e && e.hash === essayHash(s.essay) ? e.fields : null;
  }
  function loadEdits() {
    try { state.edits = new Map(Object.entries(JSON.parse(localStorage.getItem(EDIT_KEY) || "{}"))); } catch (_) { state.edits = new Map(); }
  }
  let saveTimer = null;
  function saveEdits() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(EDIT_KEY, JSON.stringify(Object.fromEntries(state.edits))); } catch (_) { toast("修正をこのブラウザに保存できませんでした（プライベートウィンドウなど）", true); }
    }, 300);
  }
  function setEdit(s, key, value) {
    const base = (baseQuestionsMap().get(s.id) || {})[key] || "";
    const cur = editsFor(s) || {};
    const fields = { ...cur };
    if (value === base) delete fields[key]; else fields[key] = value;
    if (Object.keys(fields).length) state.edits.set(s.id, { hash: essayHash(s.essay), fields });
    else state.edits.delete(s.id);
    saveEdits();
  }
  const editedCount = () => [...state.essays.values()].filter((s) => Object.keys(editsFor(s) || {}).length).length;

  // ---------------- 点検（V-1〜V-6 相当） ----------------
  /**
   * 点検（プログラムによる機械判定。AIの出力にエラー情報は含まれない）。
   * problems は欄ごとの問題: {level: "ng"|"warn"|"memo", key: 列名, q: 問番号, msg}
   *   ng = このままでは印刷対象外／warn = 印刷はできるが確認したい／memo = AI自身が書いた【要確認】メモ
   */
  function check(student, q) {
    if (!q) return { level: "missing", issues: ["質問なし"], problems: [] };
    if (/^【要確認】/.test(q["主張"] || "")) return { level: "flag", issues: [q["主張"]], problems: [{ level: "memo", key: "主張", q: 0, msg: q["主張"] }] };
    const problems = [];
    const add = (level, key, qn, msg) => problems.push({ level, key, q: qn, msg });
    // AIが意味を汲み取りきれなかった箇所（理由・意図の【要確認】メモ）は、印刷前に教員が確認する
    (q["理由"] || "").split(/[；;]/).filter((x) => x.includes("【要確認】")).forEach((x) => add("memo", "理由", 0, x.trim()));
    [1, 2, 3].forEach((i) => {
      const v = q[`Q${i}_意図`] || "";
      if (v.includes("【要確認】")) add("memo", `Q${i}_意図`, i, v.slice(v.indexOf("【要確認】")).trim());
    });
    for (let i = 1; i <= 3; i++) {
      const k = (f) => `Q${i}_${f}`;
      const g = (f) => q[k(f)] || "";
      const missing = REQUIRED_FIELDS.filter((f) => !g(f));
      missing.forEach((f) => add("ng", k(f), i, `${f}が空`));
      if (missing.length) continue;
      const quote = g("引用");
      if (HEADER.includes(nfkc(quote))) add("ng", k("引用"), i, "引用欄に見出しの文字が入っている（AIの出力ミス）");
      else if (!containsQuote(student.essay, quote)) add("ng", k("引用"), i, "引用がessayの本文にない（一字一句同じでないと下線を引けない）");
      const qw = wordCount(quote);
      if (qw < 5 || qw > 30) add("ng", k("引用"), i, `引用が${qw}語（5〜30語にする）`);
      const w = wordCount(g("質問"));
      if (w < 12 || w > 40) add("warn", k("質問"), i, `質問が${w}語（12〜35語が目安）`);
      if (words(g("A例")).join(" ") === words(g("B例")).join(" ")) add("ng", k("B例"), i, "A例とB例が同じ");
      if (sharesNgram(quote, g("B例"))) add("warn", k("B例"), i, "B例が引用の語句を使っている（B例はessayとつながらない一般論にする）");
      if (/use\s+["“']?(although|if|even if|unlike)/i.test(g("質問"))) add("warn", k("質問"), i, "質問が使う文法を指示している");
    }
    const issues = problems.map((p) => (p.q && !p.msg.startsWith(`Q${p.q}`) ? `Q${p.q}: ${p.msg}` : p.msg));
    const level = problems.some((p) => p.level === "ng") ? "ng" : problems.length ? "warn" : "ok";
    return { level, issues, problems };
  }

  // ---------------- 修正案（AIなし・プログラムで作れるものだけ） ----------------
  const STOP = new Set("the a an and or but is are was were be been to of in on for with that this it its you your essay says say said think do does did why what how would will can could give one reason choose more if as at by from they them their we our us i my me so not about have has had there these those which who than then also very just still many much some any when because".split(" "));
  const contentWords = (t) => words(t).filter((w) => w.length >= 3 && !STOP.has(w));
  /** essay を文に分け（長い文は読点などで区切り）、引用に使える 5〜30語の候補を作る。候補の文字列は本文そのまま */
  function quoteCandidates(essay) {
    const out = [];
    const re = /[^.!?]+[.!?]*/g;
    let m;
    while ((m = re.exec(essay))) {
      const sent = m[0].trim();
      if (!sent) continue;
      const n = wordCount(sent);
      if (n >= 5 && n <= 30) out.push(sent);
      if (n > 30 || n >= 12) sent.split(/,\s+|;\s+|\s+(?=because\s|but\s|so\s)/i).map((x) => x.trim()).filter((x) => { const c = wordCount(x); return c >= 5 && c <= 30 && x !== sent; }).forEach((x) => out.push(x));
    }
    return [...new Set(out)];
  }
  function suggestQuote(student, q, qn) {
    const target = contentWords(`${q[`Q${qn}_質問`] || ""} ${q[`Q${qn}_質問`] || ""} ${q[`Q${qn}_引用`] || ""} ${q[`Q${qn}_論点`] || ""}`);
    if (!target.length) return null;
    const used = [1, 2, 3].filter((i) => i !== qn).map((i) => q[`Q${i}_引用`] || "").filter((x) => containsQuote(student.essay, x));
    let best = null;
    quoteCandidates(student.essay).forEach((c) => {
      if (used.some((u) => joined(u).includes(joined(c)) || joined(c).includes(joined(u)))) return;
      const cw = new Set(contentWords(c));
      const hit = [...new Set(target.filter((w) => cw.has(w)))];
      const score = target.filter((w) => cw.has(w)).length - wordCount(c) * 0.02;
      if (hit.length >= 2 && (!best || score > best.score)) best = { score, value: c, hit };
    });
    return best ? { value: best.value, note: `質問文と同じ語（${best.hit.slice(0, 5).join(", ")}）が最も多い本文の文です` } : null;
  }
  /** 問題ごとの修正案。作れないものは null（その場合はGemへの作り直し依頼を使う） */
  function suggestFix(student, q, p) {
    if (p.key.endsWith("_引用") && p.level === "ng") return suggestQuote(student, q, p.q);
    if (p.key.endsWith("_質問") && p.msg.includes("文法を指示")) {
      const v = (q[p.key] || "").replace(/\s*Use\s+["“']?(although|if|even if|unlike)[^.?!]*[.?!]?/gi, "").trim();
      return v && v !== q[p.key] ? { value: v, note: "文法を指示している文を取り除いた案です" } : null;
    }
    return null;
  }
  /** 修正案が作れない問題用：Question Time（Gem・プラグイン）に、この生徒だけ作り直してもらう依頼文 */
  function regenerateRequest(student, problems) {
    const list = problems.filter((p) => p.level !== "memo").map((p) => (p.q ? `Q${p.q}の${p.key.split("_")[1]}: ` : "") + p.msg.replace(/^Q\d: /, ""));
    return `次の1人分を作成してください。前回の出力には次の問題がありました。直して、見出し行つきのTSV（27列）で作り直してください。\n- ${list.join("\n- ")}\n${student.id}\t${student.essay.replace(/\s+/g, " ")}`;
  }

  function sortedStudents() {
    return [...state.essays.values()].sort((a, b) => (a.cls === b.cls ? a.num - b.num || a.id.localeCompare(b.id) : a.cls.localeCompare(b.cls, "ja")));
  }

  // ---------------- 画面更新 ----------------
  function refreshAll() {
    const classes = [...new Set(sortedStudents().map((s) => s.cls))];
    const cf = $("class-filter");
    const current = cf.value;
    cf.innerHTML = `<option value="">全クラス</option>` + classes.map((c) => `<option ${c === current ? "selected" : ""}>${esc(c)}</option>`).join("");
    renderBatches();
    renderCheck();
    if (state.view === "edit" && $("editor")) renderEditor();
    renderSheets();
  }

  function renderCheck() {
    const qs = questionsMap();
    const cls = $("class-filter").value;
    const rows = sortedStudents().filter((s) => !cls || s.cls === cls).map((s) => ({ s, r: check(s, qs.get(s.id)) }));
    const counts = { ok: 0, warn: 0, ng: 0, missing: 0, flag: 0 };
    rows.forEach(({ r }) => counts[r.level]++);
    const shown = rows.filter(({ r }) => state.status === "all" || (state.status === "ng" && ["ng", "flag", "warn"].includes(r.level)) || (state.status === "missing" && r.level === "missing"));
    const label = { ok: ["ok", "OK"], warn: ["warn", "注意"], ng: ["ng", "✗ 要修正"], missing: ["", "質問なし"], flag: ["warn", "要確認（異常essay）"] };
    $("check-table").innerHTML =
      `<thead><tr><th>ID</th><th>氏名</th><th>語数</th><th>判定</th><th>内容</th></tr></thead><tbody>` +
      shown.map(({ s, r }) => `<tr class="${r.level === "ng" ? "row-ng" : ""}"><td>${esc(s.id)}${s.dup ? ' <span class="badge warn">重複</span>' : ""}</td><td>${esc(s.name)}</td><td>${wordCount(s.essay)}</td>
        <td><span class="badge ${label[r.level][0]}">${label[r.level][1]}</span></td>
        <td class="small">${r.problems.length ? r.problems.map((p) => `<div class="issue-${p.level}">${p.level === "ng" ? "✗ " : p.level === "warn" ? "△ " : ""}${esc((p.q ? `Q${p.q}: ` : "") + p.msg.replace(/^Q\d: /, ""))}</div>`).join("") : esc(r.issues.join(" ／ "))}
          ${r.problems.some((p) => p.level !== "memo") && $("editor") ? `<button type="button" class="btn btn-secondary btn-sm fix-btn" data-id="${esc(s.id)}">直す →</button>` : ""}</td></tr>`).join("") +
      `</tbody>` +
      (rows.length ? "" : `<tbody><tr><td colspan="5" class="muted">まだ読み込んでいません</td></tr></tbody>`);
    const f = $("status-filter").children;
    f[0].textContent = `全員 ${rows.length}`;
    f[1].textContent = `要確認 ${counts.ng + counts.warn + counts.flag}`;
    f[2].textContent = `質問なし ${counts.missing}`;
  }

  function renderBatches() {
    const size = Math.max(1, Math.min(10, parseInt($("batch-size").value, 10) || 5));
    const qs = questionsMap();
    const list = sortedStudents().filter((s) => !$("batch-missing-only").checked || !qs.has(s.id));
    const box = $("batches");
    box.innerHTML = "";
    for (let i = 0; i < list.length; i += size) {
      const chunk = list.slice(i, i + size);
      const key = chunk.map((s) => s.id).join(",");
      const b = document.createElement("button");
      b.type = "button";
      b.className = `btn btn-secondary btn-sm batch ${state.copied.has(key) ? "done" : ""}`;
      b.textContent = `${state.copied.has(key) ? "✓ " : ""}${chunk[0].id} 〜 ${chunk[chunk.length - 1].id}（${chunk.length}人）`;
      b.addEventListener("click", () => {
        const text = `次の${chunk.length}人分を作成してください。\n` + chunk.map((s) => `${s.id}\t${s.essay.replace(/\s+/g, " ")}`).join("\n");
        copy(text, `${chunk.length}人分をコピーしました。Gemに貼り付けてください。`);
        state.copied.add(key);
        b.classList.add("done");
        b.textContent = `✓ ${chunk[0].id} 〜 ${chunk[chunk.length - 1].id}（${chunk.length}人）`;
      });
      box.appendChild(b);
    }
  }

  // ---------------- A4 描画 ----------------
  function markQuotes(essay, quotes) {
    // essay 中の引用箇所に下線と問番号を付ける（生徒が根拠の場所をすぐ見つけられるように）
    const spans = [];
    quotes.forEach((q, i) => {
      const w = words(q);
      if (!w.length) return;
      const re = new RegExp(w.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]")).join("[^A-Za-z0-9'’]+"), "i");
      const m = re.exec(essay);
      if (m && !spans.some((s) => m.index < s.end && m.index + m[0].length > s.start)) spans.push({ start: m.index, end: m.index + m[0].length, n: i + 1 });
    });
    spans.sort((a, b) => a.start - b.start);
    let out = "";
    let pos = 0;
    spans.forEach((s) => {
      out += esc(essay.slice(pos, s.start)) + `<u>${esc(essay.slice(s.start, s.end))}</u><sup>Q${s.n}</sup>`;
      pos = s.end;
    });
    return out + esc(essay.slice(pos));
  }

  function headBlock(s, st, subtitle) {
    return `<div class="s-head">
      <div class="s-title">
        <div class="brand">QUESTION TIME ・ ${esc(subtitle)}</div>
        <h1>${esc(st.title)}</h1>
        ${st.topic ? `<div class="topic" lang="en">${esc(st.topic)}</div>` : ""}
      </div>
      <div class="idbox">
        <div>クラス・番号</div><div>${esc(s.cls)}　${s.num ? `${s.num}番` : ""}</div>
        <div>氏名</div><div class="name">${esc(s.name)}</div>
        <div>実施日</div><div>${esc(st.date ? st.date.replace(/-/g, "/") : "")}</div>
      </div>
    </div>`;
  }

  function questionsFor(s, useBackup) {
    const q = questionsMap().get(s.id);
    const r = check(s, q);
    if (q && r.level !== "flag" && r.level !== "missing") {
      return { backup: false, level: r.level, items: [0, 1, 2].map((i) => Object.fromEntries(Q_FIELDS.map((f) => [f, q[`Q${i + 1}_${f}`] || ""]))), claim: q["主張"] || "", reasons: q["理由"] || "" };
    }
    if (!useBackup) return null;
    return { backup: true, level: r.level, items: BACKUP.map(([t, ja]) => ({ 質問: t, 和訳: ja, 引用: "", 意図: "汎用予備問題", 論点: "", A例: "", B例: "", 等価構造: "" })), claim: q?.["主張"] || "", reasons: "" };
  }

  function studentSheet(s, qd, st) {
    const quotes = qd.items.map((x) => x["引用"]);
    return `<section class="sheet student" data-id="${esc(s.id)}"><div class="sheet-inner">
      ${headBlock(s, st, "解答用紙")}
      <div class="essay-box"><div class="label">YOUR ESSAY</div><div class="essay-text" lang="en">${qd.backup ? esc(s.essay) : markQuotes(s.essay, quotes)}</div></div>
      ${qd.items.map((x, i) => `<div class="q">
        <div class="q-head"><span class="q-no">Q${i + 1}</span><span class="q-text" lang="en">${esc(x["質問"])}</span>
          <span class="q-score">内容<span></span> 英語<span></span></span></div>
        ${x["和訳"] ? `<div class="q-ja">${esc(x["和訳"])}</div>` : ""}
        <div class="lines" data-q="${i}"></div>
      </div>`).join("")}
    </div>
    <div class="sheet-foot"><span>${esc(s.id)}${qd.backup ? "　予備問題" : ""}</span></div>
    </section>`;
  }

  function teacherSheet(s, qd, st) {
    return `<section class="sheet teacher" data-id="${esc(s.id)}"><div class="sheet-inner">
      <div class="t-head">
        <div>
          <div class="s-title"><div class="brand">QUESTION TIME ・ 採点シート</div></div>
          <h1>${esc(s.cls)} ${s.num ? `${s.num}番` : ""}　${esc(s.name)}</h1>
          <div class="muted">${esc(st.title)}${st.date ? `（${esc(st.date.replace(/-/g, "/"))}）` : ""}</div>
        </div>
        <div class="t-total"><div>内容 <span></span>/${qd.backup ? "—" : "6"}</div><div>英語 <span></span>/6</div></div>
      </div>
      ${qd.backup
        ? `<p class="backup-note">汎用予備問題で実施（Content軸は評価対象外。Language軸のみ採点）${qd.claim ? `：${esc(qd.claim)}` : ""}</p>`
        : `<div class="t-claim"><b>主張：</b>${esc(qd.claim)}<br /><b>理由：</b>${esc(qd.reasons)}</div>`}
      ${qd.items.map((x, i) => {
        const rb = rubricFor(i, x["引用"], x["論点"]);
        return `<div class="t-q">
          <div class="q-head"><span><span class="q-no">Q${i + 1}</span> <span class="t-type">${Q_TYPES[i].label}</span>　指定構造: ${Q_TYPES[i].structure}</span>
            <span class="t-scores">
              <span class="box">内容 <span class="opt">0</span><span class="opt">1</span><span class="opt">2</span></span>
              <span class="box">英語 <span class="opt">0</span><span class="opt">1</span><span class="opt">2</span></span>
              <span class="box"><span class="opt">V</span><span class="opt">J</span></span>
            </span></div>
          <div lang="en"><b>Q:</b> ${esc(x["質問"])}</div>
          ${qd.backup ? "" : `<div class="muted">意図：${esc(x["意図"])}</div>
          <div class="t-grid"><b>A 2点</b><span>${esc(rb.A)}</span><b>B 1点</b><span>${esc(rb.B)}</span><b>C 0点</b><span>${esc(rb.C)}</span></div>
          <div class="t-samples"><div><b>A例</b> <span lang="en">${esc(x["A例"])}</span></div><div><b>B例</b> <span lang="en">${esc(x["B例"])}</span></div></div>
          <div><b>等価構造（英語2点）：</b><span lang="en">${esc(x["等価構造"])}</span></div>`}
        </div>`;
      }).join("")}
      <div class="t-rules">
        <b>英語（Language）全問共通：</b>${LANGUAGE_RUBRIC.map(([p, t]) => `${p}＝${esc(t)}`).join("　")}<br />
        <b>PL-1 逐語コピー（V）：</b>essayの連続15語以上の写しは内容の加点根拠にしない。
        <b>PL-2 日本語（J）：</b>内容は日本語でも満点可・英語は0。
        <b>PL-3：</b>指定と違う構造でも同じ働きなら英語2点。解答の「真偽」ではなく「essayの論理との接続」を見る。
      </div>
    </div>
    <div class="sheet-foot"><span>${esc(s.id)}</span><span>essayの内容は引用で確認できます（essayを読み返さずに採点できる設計）</span></div>
    </section>`;
  }

  function feedbackSheet(s, qd, st) {
    return `<section class="sheet teacher feedback" data-id="${esc(s.id)}"><div class="sheet-inner">
      ${headBlock(s, st, "返却シート")}
      <p>点数よりも、<b>A基準と解答例</b>を読んで「自分のessayの理由と、どうつなげればよかったか」を確かめましょう。解答用紙と一緒に見てください。</p>
      ${qd.items.map((x, i) => {
        const rb = rubricFor(i, x["引用"], x["論点"]);
        return `<div class="f-q">
          <div class="q-head"><span class="q-no">Q${i + 1}</span><span class="q-text" lang="en">${esc(x["質問"])}</span></div>
          ${x["和訳"] ? `<div class="q-ja">${esc(x["和訳"])}</div>` : ""}
          ${qd.backup ? "" : `<div class="f-row"><b>内容のA基準</b><span>${esc(rb.A)}</span></div>
          <div class="f-row"><b>解答例</b><span lang="en">${esc(x["A例"])}</span></div>
          <div class="f-row"><b>使える表現</b><span lang="en">${esc(x["等価構造"])}</span></div>`}
          <div class="f-row"><b>直すなら</b><span class="lines"><div class="line"></div><div class="line"></div></span></div>
        </div>`;
      }).join("")}
      <div class="f-self">
        <b>次のessayに向けて（Step 4 想定問答）</b>
        <p class="small">essayはAIや友だちの力を借りて書いてもかまいません。でも最後に説明するのは自分です。次に書くときは、書き終える前に次の2つを準備しておこう。</p>
        <div class="f-row"><b>来そうな反論</b><span class="lines"><div class="line"></div><div class="line"></div></span></div>
        <div class="f-row"><b>それへの答え</b><span class="lines"><div class="line"></div><div class="line"></div><div class="line"></div></span></div>
      </div>
    </div>
    <div class="sheet-foot"><span>${esc(s.id)}</span></div>
    </section>`;
  }

  // 用紙に収まるように文字サイズと罫線の数を調整する
  const MM = 96 / 25.4;
  function fits(sheet) {
    const inner = sheet.querySelector(".sheet-inner");
    const style = getComputedStyle(sheet);
    const limit = sheet.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 3 * MM;
    return inner.offsetHeight <= limit;
  }
  function setLines(sheet, n) {
    sheet.querySelectorAll(".lines[data-q]").forEach((el) => { el.innerHTML = '<div class="line"></div>'.repeat(n); });
  }
  function fitStudent(sheet) {
    const text = sheet.querySelector(".essay-text");
    let fs = 10.5;
    setLines(sheet, 4);
    text.style.setProperty("--essay-fs", `${fs}pt`);
    while (!fits(sheet) && fs > 6.5) { fs -= 0.25; text.style.setProperty("--essay-fs", `${fs}pt`); }
    let n = fits(sheet) ? 4 : 3;
    setLines(sheet, n);
    while (n < 14) { setLines(sheet, n + 1); if (!fits(sheet)) { setLines(sheet, n); break; } n++; }
    if (!fits(sheet)) sheet.dataset.overflow = "1";
  }
  function fitSmall(sheet) {
    let fs = 9.6;
    sheet.style.setProperty("--t-fs", `${fs}pt`);
    while (!fits(sheet) && fs > 5.8) { fs -= 0.2; sheet.style.setProperty("--t-fs", `${fs}pt`); }
    if (!fits(sheet)) sheet.dataset.overflow = "1";
  }

  let renderTimer = null;
  function renderSheets() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(doRenderSheets, 150);
  }
  /** 1人分の用紙のHTML。印刷対象外（質問なし・✗など）なら null */
  function sheetHtmlFor(s, st = settings()) {
    const qd = questionsFor(s, $("use-backup").checked);
    if (!qd) return null;
    // ✗の生徒は印刷しない。ただし編集ONのときは、直す様子を見られるよう「印刷されません」の印を付けて画面にだけ出す
    const excluded = qd.level === "ng" && !qd.backup && !$("include-ng").checked;
    if (excluded && state.view !== "edit") return null;
    const h = state.kind === "student" ? studentSheet(s, qd, st) : state.kind === "teacher" ? teacherSheet(s, qd, st) : feedbackSheet(s, qd, st);
    return excluded ? h.replace('<section class="sheet', '<section data-excluded="1" class="sheet') : h;
  }
  const fitSheet = (sh) => (state.kind === "student" ? fitStudent(sh) : fitSmall(sh));
  function doRenderSheets() {
    const st = settings();
    const cls = $("class-filter").value;
    const html = [];
    let skipped = 0;
    sortedStudents().filter((s) => !cls || s.cls === cls).forEach((s) => {
      const h = sheetHtmlFor(s, st);
      if (h) html.push(h);
      if (!h || h.includes('data-excluded="1"')) skipped++;
    });
    const box = $("sheets");
    box.innerHTML = html.join("");
    box.querySelectorAll(".sheet").forEach(fitSheet);
    const over = box.querySelectorAll('.sheet[data-overflow="1"]').length;
    const printable = html.length - box.querySelectorAll(".sheet[data-excluded]").length;
    $("print-count").textContent = `印刷対象 ${printable}枚${skipped ? `（対象外 ${skipped}人：質問なし・✗・異常essay。下のチェックで含められます）` : ""}${over ? `　⚠ ${over}枚は1ページに収まりきっていません` : ""}`;
    $("print").disabled = printable === 0;
    applyScale();
  }
  /** 編集中に1人分だけ描き直す（全員分を描き直すと重いため）。対象外⇔対象が切り替わるときは全体を描き直す */
  function rerenderSheet(id) {
    const s = state.essays.get(id);
    const el = [...$("sheets").querySelectorAll(".sheet")].find((x) => x.dataset.id === id);
    const h = s && sheetHtmlFor(s);
    // 印刷対象かどうかが変わったら、枚数表示も変わるので全体を描き直す
    if (!el || !h || el.hasAttribute("data-excluded") !== h.includes('data-excluded="1"')) return doRenderSheets();
    const tmp = document.createElement("div");
    tmp.innerHTML = h;
    const ne = tmp.firstElementChild;
    el.replaceWith(ne);
    fitSheet(ne);
    markCurrentSheet();
  }
  /** 編集ON（左右2画面）のときは、用紙を左半分の幅に縮小して表示する */
  function applyScale() {
    const box = $("sheets");
    if (state.view === "edit") box.style.setProperty("--sheet-scale", String(Math.min(1, (box.clientWidth - 12) / (210 * MM))));
    else box.style.removeProperty("--sheet-scale");
    markCurrentSheet();
  }
  /**
   * 画面には選んだ1人分の用紙だけを出す（印刷では全員分が出る）。
   * 用紙はすべて描いて収まりを計算してから隠すので、印刷の体裁は変わらない。
   */
  function markCurrentSheet() {
    const sheets = [...$("sheets").querySelectorAll(".sheet")];
    let cur = sheets.find((x) => x.dataset.id === state.editId);
    // プレビューだけのときは、選んだ生徒が印刷対象外なら先頭の用紙を出す
    if (!cur && state.view !== "edit" && sheets.length) { cur = sheets[0]; state.editId = cur.dataset.id; }
    sheets.forEach((x) => x.classList.toggle("off-screen", x !== cur));
    const empty = $("sheet-empty");
    const s = state.essays.get(state.editId);
    empty.hidden = !!cur || !sheets.length && !s || state.view !== "edit";
    if (!empty.hidden) empty.textContent = s ? `${s.id} は印刷する用紙がありません（質問なし）。右の編集欄で質問を入力するか、Gemの出力を貼り付けてください。` : "";
    // ナビ（プレビューだけのとき）
    const i = sheets.indexOf(cur);
    $("pv-label").textContent = cur ? `${i + 1} / ${sheets.length}　${cur.dataset.id}　${(state.essays.get(cur.dataset.id) || {}).name || ""}` : "表示できる用紙がありません";
    $("pv-prev").disabled = i <= 0;
    $("pv-next").disabled = i < 0 || i >= sheets.length - 1;
  }
  /** プレビューの前へ・次へ（印刷される用紙の順） */
  function stepSheet(d) {
    const sheets = [...$("sheets").querySelectorAll(".sheet")];
    const i = sheets.findIndex((x) => x.dataset.id === state.editId);
    const next = sheets[i + d];
    if (!next) return;
    state.editId = next.dataset.id;
    markCurrentSheet();
    scrollPreviewTop();
  }
  /** 用紙の途中まで読み進めていたら、次の用紙は先頭から見せる */
  function scrollPreviewTop() {
    const top = $("workspace").getBoundingClientRect().top + window.scrollY - (document.querySelector(".app-header")?.offsetHeight || 0);
    if (window.scrollY > top) window.scrollTo({ top });
  }

  // ---------------- 編集画面 ----------------
  function editorStudents() {
    const cls = $("class-filter").value;
    return sortedStudents().filter((s) => !cls || s.cls === cls);
  }
  function currentEditStudent() {
    const list = editorStudents();
    return list.find((s) => s.id === state.editId) || list[0] || null;
  }
  function renderEditor() {
    const list = editorStudents();
    const sel = $("ed-student");
    const s = currentEditStudent();
    state.editId = s ? s.id : "";
    const qs = questionsMap();
    sel.innerHTML = list.map((x) => {
      const r = check(x, qs.get(x.id));
      const mark = { ok: "", warn: "（注意）", ng: "（✗要修正）", missing: "（質問なし）", flag: "（異常essay）" }[r.level];
      const ed = Object.keys(editsFor(x) || {}).length ? "【修正あり】" : "";
      return `<option value="${esc(x.id)}" ${x.id === state.editId ? "selected" : ""}>${esc(x.id)}　${esc(x.name)}${mark}${ed}</option>`;
    }).join("") || `<option value="">まだ読み込んでいません</option>`;
    if (!s) { $("ed-form").innerHTML = ""; $("ed-essay").textContent = ""; $("ed-check").textContent = ""; return; }
    const q = qs.get(s.id) || {};
    const base = baseQuestionsMap().get(s.id) || {};
    const f = editsFor(s) || {};
    const field = (key, label, where) => `<label class="ed-field ${key in f ? "edited" : ""}" data-key="${key}">
        <span class="ed-head">${esc(label)} <span class="ed-where">→ ${esc(where)}</span>${key in f ? '<span class="badge warn">修正済み</span><button type="button" class="ed-undo">元に戻す</button>' : ""}</span>
        <textarea class="input" data-key="${key}" rows="${Math.min(6, Math.max(2, Math.ceil((q[key] || "").length / 70)))}">${esc(q[key] || "")}</textarea>
        <div class="ed-probs" data-probs="${key}"></div>
        ${key in f && base[key] ? `<span class="ed-where">元の内容: ${esc(base[key])}</span>` : ""}
      </label>`;
    $("ed-form").innerHTML =
      `<div class="ed-group"><h3>essay全体</h3>${field("主張", "主張", EDIT_WHERE["主張"])}${field("理由", "理由", EDIT_WHERE["理由"])}</div>` +
      [1, 2, 3].map((i) => `<div class="ed-group"><h3>Q${i}　${Q_TYPES[i - 1].label}</h3>${ED_Q_FIELDS.map((k) => field(`Q${i}_${k}`, k, EDIT_WHERE[k])).join("")}</div>`).join("");
    updateEditorStatus(s);
  }
  /** 入力中は欄を作り直さず（カーソルが飛ばないように）、点検結果と essay の下線だけ更新する */
  function updateEditorStatus(s) {
    const q = questionsMap().get(s.id);
    const r = check(s, q);
    const label = { ok: ["ok", "点検OK"], warn: ["warn", "注意（印刷はできます）"], ng: ["ng", "✗ 要修正（このままでは印刷対象外）"], missing: ["", "質問なし"], flag: ["warn", "異常essay（予備問題で印刷）"] }[r.level];
    const fixable = r.problems.filter((p) => p.level !== "memo");
    $("ed-check").innerHTML = `<span class="badge ${label[0]}">${label[1]}</span>` +
      (r.problems.length ? `<ul>${r.problems.map((p) => `<li class="issue-${p.level}">${esc((p.q ? `Q${p.q}: ` : "") + p.msg.replace(/^Q\d: /, ""))}</li>`).join("")}</ul>` : "") +
      (fixable.length ? `<p class="small">赤い欄に修正案が出ます（「この案を反映」で反映）。案が出ないものは、下の手順でGemに作り直してもらえます。</p>` : "");
    $("ed-regen-box").hidden = !fixable.length;
    $("ed-essay").innerHTML = markQuotes(s.essay, [1, 2, 3].map((i) => (q || {})[`Q${i}_引用`] || ""));
    // 欄ごとの赤字・修正案（入力中のテキスト欄は作り直さない）
    state.suggestions = {};
    document.querySelectorAll("#ed-form .ed-field").forEach((box) => {
      const key = box.dataset.key;
      const ps = r.problems.filter((p) => p.key === key);
      box.classList.toggle("has-ng", ps.some((p) => p.level === "ng"));
      box.classList.toggle("has-warn", !ps.some((p) => p.level === "ng") && ps.some((p) => p.level === "warn"));
      const fix = ps.map((p) => suggestFix(s, q || {}, p)).find(Boolean);
      if (fix) state.suggestions[key] = fix.value;
      box.querySelector(".ed-probs").innerHTML =
        ps.map((p) => `<div class="p-${p.level}">${p.level === "ng" ? "✗ " : p.level === "warn" ? "△ " : "メモ: "}${esc(p.msg.replace(/^Q\d: /, ""))}</div>`).join("") +
        (fix ? `<div class="ed-suggest"><div class="ed-suggest-head">修正案</div><div lang="en">${esc(fix.value)}</div><div class="ed-where">${esc(fix.note)}</div>
          <button type="button" class="btn btn-primary btn-sm ed-apply" data-key="${key}">この案を反映</button></div>` : "");
    });
  }
  function setView(v) {
    state.view = v;
    const on = v === "edit";
    const sw = $("edit-switch");
    sw.setAttribute("aria-checked", String(on));
    sw.querySelector(".lbl").textContent = on ? "編集 ON" : "編集 OFF";
    $("editor").hidden = !on;
    $("preview-nav").hidden = on;
    $("workspace").classList.toggle("split", on);
    $("view-note").textContent = on
      ? `左のプレビューで用紙をクリックするか、右で生徒を選んで書き換えてください。変更はすぐ保存され、プレビュー・点検・印刷に反映されます（修正あり ${editedCount()}人）。`
      : "印刷される用紙を1枚ずつ表示します（「次へ」または → キーで切り替え）。直したい所は「編集」をONにすると、右側で生徒ごとに書き換えられます。";
    if (on) renderEditor();
    doRenderSheets();
  }
  function questionsTsv() {
    const qs = questionsMap();
    const rows = sortedStudents().filter((s) => qs.has(s.id)).map((s) => HEADER.map((h) => String(qs.get(s.id)[h] ?? (h === "ID" ? s.id : "")).replace(/[\t\r\n]+/g, " ")).join("\t"));
    return [HEADER.join("\t"), ...rows].join("\n");
  }

  // ---------------- 再編集用データの保存（.xlsx） ----------------
  const SETTING_LABELS = { "s-title": "課題名", "s-date": "実施日", "s-topic": "essayトピック", "s-cefr": "学年目標CEFR", "s-minutes": "解答時間（分）" };
  /**
   * essay（氏名つき）・修正込みの質問・課題情報を1つの .xlsx にまとめて保存する。
   * ブラウザの中で作ってPCに保存するだけなので、氏名などが外部に送られることはない。次回は手順2で読み込めば続きから再開できる。
   */
  function exportWorkbook() {
    const list = sortedStudents();
    if (!list.length) return toast("まだ essay を読み込んでいません", true);
    const qs = questionsMap();
    const essays = [["ID", "クラス", "番号", "氏名", "essay"], ...list.map((s) => [s.id, s.cls, s.num || "", s.name, s.essay])];
    const withQ = list.filter((s) => qs.has(s.id));
    const questions = [HEADER, ...withQ.map((s) => HEADER.map((h) => (h === "ID" ? s.id : String(qs.get(s.id)[h] ?? ""))))];
    const conf = [["キー", "値", "説明"], ...SETTINGS.map((k) => [k, $(k).value, SETTING_LABELS[k] || ""])];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(essays), "essay");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(questions), "質問");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(conf), "設定");
    const d = new Date();
    const stamp = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`;
    const title = (settings().title || "QuestionTime").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
    XLSX.writeFile(wb, `QT再編集用_${title}_${stamp}.xlsx`);
    toast(`保存しました（essay ${list.length}人・質問 ${withQ.length}人分・課題情報）。次回は手順2でこのファイルを読み込めば続きから編集できます。`);
  }

  async function loadSample() {
    try {
      const blob = await fetch("docs/sample/" + encodeURIComponent("サンプル_QuestionTime.xlsx")).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); });
      if (!$("s-topic").value) { $("s-topic").value = "Draft a proposal to improve our town or school life."; $("s-title").value = $("s-title").value || "サンプル"; }
      await loadFiles([new File([blob], "サンプル_QuestionTime.xlsx")]);
    } catch (e) {
      toast("サンプルを読み込めませんでした", true);
    }
  }

  // ---------------- 補助 ----------------
  function toast(msg, error) {
    const t = $("toast");
    t.textContent = msg;
    t.className = `toast no-print${error ? " error" : ""}`;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), error ? 6000 : 2500);
  }
  async function copy(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg || "コピーしました");
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast(msg || "コピーしました");
    }
  }

  // ---------------- イベント ----------------
  function init() {
    loadSettings();
    loadEdits();
    $("prompt-view").textContent = window.QT_SYSTEM_PROMPT || "";
    if (!window.QT_SYSTEM_PROMPT) toast("システムプロンプトを読み込めませんでした。ページを再読み込み（Cmd+Shift+R）してください。", true);
    $("copy-prompt").addEventListener("click", () => copy(window.QT_SYSTEM_PROMPT || "", "システムプロンプトをコピーしました。Gemの「指示」欄に貼り付けてください。"));
    $("toggle-prompt").addEventListener("click", () => { $("prompt-view").hidden = !$("prompt-view").hidden; });
    $("copy-kickoff").addEventListener("click", () => {
      const st = settings();
      if (!st.topic) return toast("手順1でessayトピックを入力してください", true);
      copy(`【課題情報】\nトピック: ${st.topic}\n学年目標CEFR: ${st.cefr}\nこのあと、この課題のessayを数人分ずつ「ID<TAB>essay本文」の形で送ります。システムプロンプトの形式（見出し行つきのTSV）で出力してください。準備ができたら「了解」とだけ答えてください。`, "課題開始メッセージをコピーしました");
    });
    SETTINGS.forEach((k) => $(k).addEventListener("input", () => { saveSettings(); renderSheets(); }));

    const drop = $("drop");
    $("file").addEventListener("change", (e) => { if (e.target.files.length) loadFiles([...e.target.files]); e.target.value = ""; });
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files.length) loadFiles([...e.dataTransfer.files]); });

    $("apply-tsv").addEventListener("click", () => {
      const rows = $("tsv").value.replace(/^```.*$/gm, "").split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split("\t"));
      const map = parseQuestionRows(rows);
      if (!map.size) return toast("見出し行（ID, 主張, … Q1_質問 …）が見つかりません。Gemの出力を見出しごと貼り付けてください。", true);
      map.forEach((v, k) => state.pastedQuestions.set(k, v));
      const cleared = [...map.keys()].map((k) => state.idAlias.get(k) || k).filter((k) => state.edits.delete(k));
      if (cleared.length) saveEdits();
      toast(`${map.size}人分を取り込みました${cleared.length ? `（${cleared.join("・")} の編集タブでの修正は、新しい出力に置き換えたため外しました）` : ""}`);
      $("tsv").value = "";
      refreshAll();
    });
    $("batch-size").addEventListener("input", renderBatches);
    $("batch-missing-only").addEventListener("change", renderBatches);
    $("class-filter").addEventListener("change", () => { renderCheck(); if (state.view === "edit") renderEditor(); renderSheets(); });
    [...$("status-filter").children].forEach((b) => b.addEventListener("click", () => {
      state.status = b.dataset.f;
      [...$("status-filter").children].forEach((x) => x.classList.toggle("on", x === b));
      renderCheck();
    }));
    [...$("kind").children].forEach((b) => b.addEventListener("click", () => {
      state.kind = b.dataset.k;
      [...$("kind").children].forEach((x) => x.classList.toggle("on", x === b));
      renderSheets();
    }));
    $("use-backup").addEventListener("change", renderSheets);
    $("include-ng").addEventListener("change", renderSheets);
    $("print").addEventListener("click", () => {
      // 編集画面のままだと用紙が描かれていないので、プレビューに切り替えてから印刷する
      doRenderSheets();
      window.print();
    });
    // 古いHTMLがキャッシュに残っていて編集タブがない場合は、編集機能だけ無効にして動かす
    if ($("editor")) initEditor();
    initRest();
  }

  function initEditor() {
    $("edit-switch").addEventListener("click", () => setView(state.view === "edit" ? "preview" : "edit"));
    $("pv-prev").addEventListener("click", () => stepSheet(-1));
    $("pv-next").addEventListener("click", () => stepSheet(1));
    // ← → キーでも前後へ（入力欄で文字を打っているときは除く）
    document.addEventListener("keydown", (e) => {
      if ((e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const d = e.key === "ArrowLeft" ? -1 : 1;
      if (state.view === "edit") $(d < 0 ? "ed-prev" : "ed-next").click(); else stepSheet(d);
    });
    $("ed-student").addEventListener("change", (e) => { state.editId = e.target.value; renderEditor(); markCurrentSheet(); });
    const step = (d) => {
      const list = editorStudents();
      const i = list.findIndex((s) => s.id === state.editId);
      if (list[i + d]) { state.editId = list[i + d].id; renderEditor(); $("editor").scrollTop = 0; markCurrentSheet(); scrollPreviewTop(); }
    };
    $("ed-prev").addEventListener("click", () => step(-1));
    $("ed-next").addEventListener("click", () => step(1));
    let edCheckTimer = null;
    $("ed-form").addEventListener("input", (e) => {
      const key = e.target.dataset.key;
      const s = currentEditStudent();
      if (!key || !s) return;
      setEdit(s, key, e.target.value);
      const box = e.target.closest(".ed-field");
      const edited = key in (editsFor(s) || {});
      if (box.classList.contains("edited") !== edited) {
        box.classList.toggle("edited", edited);
        const head = box.querySelector(".ed-head");
        head.querySelectorAll(".badge, .ed-undo").forEach((x) => x.remove());
        if (edited) head.insertAdjacentHTML("beforeend", '<span class="badge warn">修正済み</span><button type="button" class="ed-undo">元に戻す</button>');
      }
      updateEditorStatus(s);
      clearTimeout(edCheckTimer);
      edCheckTimer = setTimeout(() => { renderCheck(); rerenderSheet(s.id); }, 350);
    });
    $("ed-form").addEventListener("click", (e) => {
      if (e.target.classList.contains("ed-apply")) {
        e.preventDefault();
        const s = currentEditStudent();
        const key = e.target.dataset.key;
        if (!s || !(key in (state.suggestions || {}))) return;
        setEdit(s, key, state.suggestions[key]);
        renderEditor();
        renderCheck();
        rerenderSheet(s.id);
        toast(`${s.id} の ${key} に修正案を反映しました`);
        return;
      }
      if (!e.target.classList.contains("ed-undo")) return;
      e.preventDefault();
      const s = currentEditStudent();
      const key = e.target.closest(".ed-field").dataset.key;
      setEdit(s, key, (baseQuestionsMap().get(s.id) || {})[key] || "");
      renderEditor();
      renderCheck();
      rerenderSheet(s.id);
    });
    $("ed-regen").addEventListener("click", () => {
      const s = currentEditStudent();
      if (!s) return;
      copy(regenerateRequest(s, check(s, questionsMap().get(s.id)).problems), "作り直し依頼をコピーしました。ChatGPTで @Question Time を付けて貼り付けてください。");
    });
    $("ed-paste-apply").addEventListener("click", () => {
      const s = currentEditStudent();
      if (!s) return;
      const rows = $("ed-paste").value.replace(/^```.*$/gm, "").split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split("\t"));
      const map = parseQuestionRows(rows);
      const row = map.get(s.id) || (map.size === 1 ? [...map.values()][0] : null);
      if (!row) return toast(map.size ? `貼り付けた内容に ${s.id} の行がありません` : "見出し行（ID, 主張, … Q1_質問 …）つきで貼り付けてください", true);
      HEADER.filter((h) => h !== "ID").forEach((h) => setEdit(s, h, row[h] || ""));
      $("ed-paste").value = "";
      renderEditor();
      renderCheck();
      rerenderSheet(s.id);
      toast(`${s.id} にGemの出力を取り込みました（編集として保存。元に戻すこともできます）`);
    });
    // 上部の固定ヘッダーの高さ分だけ、ナビと編集欄を下げる（ヘッダーの裏に隠れないように）
    const setHeaderH = () => document.documentElement.style.setProperty("--header-h", `${document.querySelector(".app-header")?.offsetHeight || 0}px`);
    setHeaderH();
    window.addEventListener("resize", () => { setHeaderH(); if (state.view === "edit") applyScale(); });
    $("check-table").addEventListener("click", (e) => {
      const b = e.target.closest(".fix-btn");
      if (!b) return;
      state.editId = b.dataset.id;
      setView("edit");
      $("workspace").scrollIntoView({ block: "start" });
      const first = document.querySelector("#ed-form .has-ng, #ed-form .has-warn");
      if (first) $("editor").scrollTop = first.offsetTop - 80;
    });
    $("ed-reset-one").addEventListener("click", () => {
      const s = currentEditStudent();
      if (!s || !editsFor(s)) return toast("この生徒には修正がありません");
      if (!window.confirm(`${s.id} の修正をすべて元に戻します。よろしいですか？`)) return;
      state.edits.delete(s.id);
      saveEdits();
      renderEditor();
      renderCheck();
      rerenderSheet(s.id);
    });
    $("ed-reset-all").addEventListener("click", () => {
      if (!state.edits.size) return toast("修正はありません");
      if (!window.confirm(`すべての生徒の修正（${editedCount()}人分）を消します。元に戻せません。よろしいですか？`)) return;
      state.edits = new Map();
      saveEdits();
      renderEditor();
      renderCheck();
      doRenderSheets();
    });
    $("ed-copy-tsv").addEventListener("click", () => {
      if (!questionsMap().size) return toast("まだ質問がありません", true);
      copy(questionsTsv(), "修正を反映したTSVをコピーしました。スプレッドシートの「質問」シートのA1に貼り付けてください。");
    });
  }

  function initRest() {
    $("load-sample").addEventListener("click", loadSample);
    $("export-xlsx").addEventListener("click", exportWorkbook);
    refreshAll();
    // ?sample=1&kind=teacher でサンプルを自動表示（動作確認用）
    const params = new URLSearchParams(location.search);
    if (params.get("kind")) [...$("kind").children].find((b) => b.dataset.k === params.get("kind"))?.click();
    if (params.get("sample")) loadSample();
  }

  if (typeof XLSX === "undefined") {
    document.addEventListener("DOMContentLoaded", () => toast("xlsx 読み込みライブラリが見つかりません", true));
  }
  document.addEventListener("DOMContentLoaded", init);
})();
