// ============================================================
// template.gs — 探究レポート用 Google Slides テンプレート生成
// ============================================================
// ⚠️ 項目は後ほど確定後に REPORT_SECTIONS を変更してください
// ============================================================

// ── ページ設定（A4縦：pt単位）──────────────────────────────
var PAGE_W = 540;   // 190mm ≒ 540pt（Slides の上限に合わせた近似値）
var PAGE_H = 760;   // 268mm ≒ 760pt

// ── 固定デザイン ────────────────────────────────────────────
var DESIGN = {
  headerBg:       '#1a3d52',
  headerText:     '#ffffff',
  labelColor:     '#1a3d52',
  borderColor:    '#1a3d52',
  bodyFont:       'Noto Sans JP',
  fallbackFont:   'Arial',
  footerText:     '富田高校　総合探究成果報告会',
};

// ── レポートの入力項目定義（後で変更する箇所）──────────────
// 【1ページ目】
var PAGE1_SECTIONS = [
  { label: '探究テーマ',        lines: 2 },
  { label: '研究の背景・目的',  lines: 5 },
  { label: '研究方法',          lines: 5 },
];

// 【2ページ目】
var PAGE2_SECTIONS = [
  { label: '結果・データ',      lines: 7, note: '（グラフ・画像を貼り付けてください）' },
  { label: '考察',              lines: 5 },
  { label: 'まとめ・今後の課題',lines: 4 },
  { label: '参考文献',          lines: 2 },
];

// ────────────────────────────────────────────────────────────

function createReportTemplate() {
  var ui = SpreadsheetApp.getUi();

  // プレゼンテーション作成
  var pres = SlidesApp.create('【テンプレート】探究レポート');
  var presId = pres.getId();

  // ページサイズをA4近似に変更（Slides REST API）
  setPageSize_(presId, PAGE_W, PAGE_H);

  // 既存の空白スライドを取得（1枚目）
  var slides = pres.getSlides();
  var slide1 = slides[0];
  slide1.getPageElements().forEach(function (el) { el.remove(); }); // デフォルト要素を削除

  // 2枚目を追加
  pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  var slide2 = pres.getSlides()[1];
  slide2.getPageElements().forEach(function (el) { el.remove(); });

  // 各ページを描画
  buildPage1_(slide1);
  buildPage2_(slide2);

  // 保存
  pres.saveAndClose();

  var url = 'https://docs.google.com/presentation/d/' + presId + '/edit';
  ui.alert(
    '✅ テンプレート作成完了',
    'レポートテンプレートを作成しました。\n\n' +
    'このファイルを Classroom の課題に添付し、\n' +
    '「生徒全員にコピーを配布」に設定して課題を出してください。\n\n' +
    'URL: ' + url,
    ui.ButtonSet.OK
  );
}

// ── ページ1：グループ情報 ＋ 前半セクション ────────────────
function buildPage1_(slide) {
  var y = 0;

  // ヘッダー帯
  y = addHeader_(slide, '富田高校　総合探究成果報告会', y);
  y += 4;

  // グループ情報ブロック（固定ラベル＋入力欄）
  y = addMetaRow_(slide, 'グループID', y);
  y = addMetaRow_(slide, 'グループ名', y);
  y = addMetaRow_(slide, 'メンバー',   y);
  y += 6;

  // コンテンツセクション
  PAGE1_SECTIONS.forEach(function (sec) {
    y = addSection_(slide, sec.label, sec.lines, y, sec.note || '');
    y += 4;
  });

  // フッター
  addFooter_(slide, '1 / 2');
}

// ── ページ2：後半セクション ─────────────────────────────────
function buildPage2_(slide) {
  var y = 0;

  // ヘッダー帯（細め）
  y = addHeader_(slide, '富田高校　総合探究成果報告会', y);
  y += 4;

  PAGE2_SECTIONS.forEach(function (sec) {
    y = addSection_(slide, sec.label, sec.lines, y, sec.note || '');
    y += 4;
  });

  addFooter_(slide, '2 / 2');
}

// ── パーツ描画ヘルパー ───────────────────────────────────────

function addHeader_(slide, text, y) {
  var h = 36;
  var box = slide.insertTextBox(text,
    toEmu_(0), toEmu_(y), toEmu_(PAGE_W), toEmu_(h));
  var style = box.getText().getTextStyle();
  style.setFontSize(13).setBold(true).setForegroundColor(DESIGN.headerText);
  box.getFill().setSolidFill(DESIGN.headerBg);
  box.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  return y + h;
}

function addMetaRow_(slide, label, y) {
  var h  = 22;
  var lw = 100; // ラベル幅

  // ラベル
  var lbox = slide.insertTextBox(label + '　:',
    toEmu_(8), toEmu_(y), toEmu_(lw), toEmu_(h));
  lbox.getText().getTextStyle().setFontSize(9).setBold(true).setForegroundColor(DESIGN.labelColor);
  lbox.getFill().setSolidFill('#f0f4f7');

  // 入力欄
  var ibox = slide.insertTextBox('（ここに入力してください）',
    toEmu_(lw + 12), toEmu_(y), toEmu_(PAGE_W - lw - 20), toEmu_(h));
  ibox.getText().getTextStyle().setFontSize(9).setForegroundColor('#888888').setItalic(true);
  ibox.getFill().setSolidFill('#ffffff');
  addBorder_(ibox);

  return y + h + 2;
}

function addSection_(slide, label, lines, y, note) {
  var labelH   = 20;
  var lineH    = 16;
  var inputH   = lines * lineH + 8;

  // セクションラベル
  var labelText = label + (note ? '　' + note : '');
  var lbox = slide.insertTextBox(labelText,
    toEmu_(4), toEmu_(y), toEmu_(PAGE_W - 8), toEmu_(labelH));
  var lstyle = lbox.getText().getTextStyle();
  lstyle.setFontSize(9).setBold(true).setForegroundColor(DESIGN.labelColor);
  lbox.getFill().setSolidFill('#e8f1f6');

  y += labelH + 2;

  // 入力欄
  var ibox = slide.insertTextBox('',
    toEmu_(4), toEmu_(y), toEmu_(PAGE_W - 8), toEmu_(inputH));
  ibox.getText().getTextStyle().setFontSize(9).setForegroundColor(DESIGN.labelColor);
  ibox.getFill().setSolidFill('#ffffff');
  addBorder_(ibox);

  return y + inputH;
}

function addFooter_(slide, pageText) {
  var h = 16;
  var y = PAGE_H - h - 2;

  var box = slide.insertTextBox(DESIGN.footerText + '　　' + pageText,
    toEmu_(4), toEmu_(y), toEmu_(PAGE_W - 8), toEmu_(h));
  box.getText().getTextStyle().setFontSize(7).setForegroundColor('#888888');
  box.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
}

function addBorder_(box) {
  box.getBorder().getLineFill().setSolidFill(DESIGN.borderColor);
  box.getBorder().setWeight(0.5);
}

// pt → EMU（Google Slides の内部単位: 1pt = 12700 EMU）
function toEmu_(pt) {
  return pt * 12700;
}

// ── Slides REST API でページサイズを変更 ─────────────────────
function setPageSize_(presId, widthPt, heightPt) {
  var url     = 'https://slides.googleapis.com/v1/presentations/' + presId + ':batchUpdate';
  var payload = {
    requests: [{
      updatePresentationProperties: {
        presentationProperties: {
          pageSize: {
            width:  { magnitude: widthPt,  unit: 'PT' },
            height: { magnitude: heightPt, unit: 'PT' },
          },
        },
        fields: 'pageSize',
      },
    }],
  };
  var res = UrlFetchApp.fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  'Bearer ' + ScriptApp.getOAuthToken(),
      'Content-Type': 'application/json',
    },
    payload:            JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    Logger.log('ページサイズ設定エラー（続行）: ' + res.getContentText());
  }
}
