// ============================================================
// main.gs — メニュー定義・パイプライン制御
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📋 発表会サイト管理')
    .addItem('① 提出物を取得・整理',    'runFetchSubmissions')
    .addItem('② PDFに変換',             'runConvertToPdf')
    .addItem('③ サイトに反映',           'runPublishToSite')
    .addSeparator()
    .addItem('⚡ すべて一括実行',         'runAll')
    .addSeparator()
    .addItem('♻️ PDFを再変換（URL列をクリア）', 'runReconvertPdfs')
    .addSeparator()
    .addItem('🔑 GitHub トークンを設定',  'setGithubToken')
    .addItem('📄 レポートテンプレートを作成', 'createReportTemplate')
    .addItem('🔧 初期セットアップ（シート生成）', 'setupSheets')
    .addToUi();
}

// ──────────────────────────────────────────
// ① Classroom から提出物を取得してシートに記録
//    silent=true のとき（一括実行中）は途中のダイアログを出さない
// ──────────────────────────────────────────
function runFetchSubmissions(silent) {
  var ui = SpreadsheetApp.getUi();
  try {
    var settings    = getSettings();
    var studentMap  = getStudentMapping();
    var groups      = getGroupList();

    var reportSubs  = fetchSubmissions(settings[SETTING_KEYS.CLASSROOM_COURSE_ID],
                                       settings[SETTING_KEYS.REPORT_ASSIGNMENT_ID]);
    var slidesSubs  = fetchSubmissions(settings[SETTING_KEYS.CLASSROOM_COURSE_ID],
                                       settings[SETTING_KEYS.SLIDES_ASSIGNMENT_ID]);

    writeFileIds(groups, studentMap, reportSubs, slidesSubs);
    if (silent !== true) {
      ui.alert('✅ 提出物の取得完了', '提出ファイルIDをシートに書き込みました。\n次に「② PDFに変換」を実行してください。', ui.ButtonSet.OK);
    }
  } catch (e) {
    if (silent !== true) ui.alert('❌ エラー', e.message, ui.ButtonSet.OK);
    throw e;
  }
}

// ──────────────────────────────────────────
// ② 取得済みファイルをPDFに変換
// ──────────────────────────────────────────
function runConvertToPdf(silent) {
  var ui = SpreadsheetApp.getUi();
  try {
    var settings = getSettings();
    var groups   = getGroupList();
    convertAndStorePdfUrls(groups, settings[SETTING_KEYS.OUTPUT_FOLDER_ID]);
    if (silent !== true) {
      ui.alert('✅ PDF変換完了', 'PDFのURLをシートに書き込みました。\n次に「③ サイトに反映」を実行してください。', ui.ButtonSet.OK);
    }
  } catch (e) {
    if (silent !== true) ui.alert('❌ エラー', e.message, ui.ButtonSet.OK);
    throw e;
  }
}

// ──────────────────────────────────────────
// ③ シートのデータを JSON 化して GitHub にプッシュ
// ──────────────────────────────────────────
function runPublishToSite(silent) {
  var ui = SpreadsheetApp.getUi();
  try {
    var settings = getSettings();
    var json     = generateScheduleJson(settings);
    pushToGithub(settings, json);
    if (silent !== true) {
      ui.alert('✅ サイト反映完了', 'schedule.json を GitHub にプッシュしました。\nVercel が自動デプロイします（数分かかります）。', ui.ButtonSet.OK);
    }
  } catch (e) {
    if (silent !== true) ui.alert('❌ エラー', e.message, ui.ButtonSet.OK);
    throw e;
  }
}

// ──────────────────────────────────────────
// ⚡ 一括実行（途中のダイアログなし・最後に1回だけ結果を表示）
// ──────────────────────────────────────────
function runAll() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.alert('⚡ 一括実行', '①②③をまとめて実行します。よろしいですか？\n（グループ数によって数分かかります）', ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;

  try {
    runFetchSubmissions(true);
    runConvertToPdf(true);
    runPublishToSite(true);
    ui.alert('✅ すべての処理が完了しました', 'サイトへの反映が完了しました。\nVercel のデプロイ後（数分後）にサイトを開いて確認してください。', ui.ButtonSet.OK);
  } catch (e) {
    Logger.log('一括実行エラー: ' + e.message);
    ui.alert('❌ エラーが発生しました', e.message + '\n\n原因を解消してから、①②③を個別に実行してください（完了済みのステップはやり直し不要です）。', ui.ButtonSet.OK);
  }
}

// ──────────────────────────────────────────
// ♻️ 再提出対応：PDF URL 列をクリアして再変換
// ──────────────────────────────────────────
function runReconvertPdfs() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt(
    '♻️ PDFを再変換',
    '再変換したい group_id を入力してください（例: 101）。\n空欄のまま OK を押すと、全グループの PDF URL をクリアして作り直します。',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var targetId = String(res.getResponseText() || '').trim();

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.GROUP_LIST);
    if (!sheet) throw new Error('「グループ一覧」シートが見つかりません。');
    var values = sheet.getDataRange().getValues();
    var cleared = 0;
    for (var i = 1; i < values.length; i++) {
      var gid = String(values[i][COL.GROUP_ID] || '').trim();
      if (!gid) continue;
      if (targetId && gid !== targetId) continue;
      sheet.getRange(i + 1, COL.REPORT_PDF_DRIVE_URL + 1, 1, 4).clearContent();
      cleared++;
    }
    SpreadsheetApp.flush();
    if (cleared === 0) {
      ui.alert('対象なし', 'group_id「' + targetId + '」の行が見つかりませんでした。', ui.ButtonSet.OK);
      return;
    }
    runConvertToPdf(true);
    ui.alert('✅ 再変換完了', cleared + ' グループの PDF を作り直しました。\n続けて「③ サイトに反映」を実行してください。', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ エラー', e.message, ui.ButtonSet.OK);
    throw e;
  }
}

// ──────────────────────────────────────────
// 🔑 GitHub トークンをスクリプト プロパティに保存
//    （シートに貼らないため、シート閲覧者にトークンが見えない）
// ──────────────────────────────────────────
function setGithubToken() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt(
    '🔑 GitHub トークンを設定',
    'GitHub の Fine-grained personal access token を貼り付けてください。\n（対象リポジトリのみ・Contents: Read and write 権限で発行したもの）\n\n※ トークンはスクリプト内に安全に保存され、シートには表示されません。',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var token = String(res.getResponseText() || '').trim();
  if (!token) {
    ui.alert('❌ 未入力', 'トークンが入力されませんでした。', ui.ButtonSet.OK);
    return;
  }
  PropertiesService.getScriptProperties().setProperty(SCRIPT_PROP_KEYS.GITHUB_TOKEN, token);
  ui.alert('✅ 保存しました', 'GitHub トークンを保存しました。\n「③ サイトに反映」が実行できるようになります。', ui.ButtonSet.OK);
}

// ──────────────────────────────────────────
// 🔧 初回セットアップ：必要なシートを自動生成
// ──────────────────────────────────────────
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  createSheetIfNotExists(ss, SHEET_NAMES.SETTINGS, [
    ['キー', '値', '説明'],
    [SETTING_KEYS.GITHUB_OWNER,         '', 'GitHubユーザー名または組織名'],
    [SETTING_KEYS.GITHUB_REPO,          '', 'リポジトリ名（例: sogo-tankyu-report）'],
    [SETTING_KEYS.GITHUB_BRANCH,        'main', ''],
    [SETTING_KEYS.GITHUB_FILE_PATH,     'data/schedule.json', ''],
    [SETTING_KEYS.CLASSROOM_COURSE_ID,  '', 'ClassroomのコースID（URLの末尾）'],
    [SETTING_KEYS.REPORT_ASSIGNMENT_ID, '', 'レポート課題のID'],
    [SETTING_KEYS.SLIDES_ASSIGNMENT_ID, '', 'スライド課題のID'],
    [SETTING_KEYS.OUTPUT_FOLDER_ID,     '', 'PDF保存先のDriveフォルダID'],
    [SETTING_KEYS.EVENT_TITLE,          '富田高校　総合探究成果報告会', 'サイトに表示するタイトル'],
    [SETTING_KEYS.EVENT_DATE,           '', '発表会の日付（例: 2026年3月13日）'],
    [SETTING_KEYS.EVENT_NOTICE,         '', 'サイト上部に表示するお知らせ（空欄なら非表示）'],
    [SETTING_KEYS.ALLOWED_DOMAIN,       '', '閲覧を許可するGoogleアカウントのドメイン（例: school.ed.jp。空欄なら誰でも閲覧可）'],
    [SETTING_KEYS.GOOGLE_CLIENT_ID,     '', 'Google OAuth クライアントID（閲覧制限を使う場合のみ）'],
  ]);

  createSheetIfNotExists(ss, SHEET_NAMES.GROUP_LIST, [
    ['group_id','group_name','timeslot_label','room_name','theme_title','theme_detail',
     'report_file_id(自動)','slides_file_id(自動)',
     'report_pdf_drive_url(自動)','report_pdf_embed_url(自動)',
     'slides_pdf_drive_url(自動)','slides_pdf_embed_url(自動)'],
  ]);

  createSheetIfNotExists(ss, SHEET_NAMES.STUDENT_MAP, [
    ['メールアドレス（学校アカウント）', 'group_id', '氏名（メモ用・任意）'],
  ]);

  ui.alert('✅ セットアップ完了',
    '「設定」「グループ一覧」「生徒対応」シートを作成しました。\n各シートに必要な情報を入力してください。\n\nGitHub トークンはメニューの「🔑 GitHub トークンを設定」から登録してください（シートには貼らないでください）。',
    ui.ButtonSet.OK);
}

function createSheetIfNotExists(ss, name, headers) {
  if (ss.getSheetByName(name)) return;
  var sheet = ss.insertSheet(name);
  if (headers && headers.length > 0) {
    sheet.getRange(1, 1, headers.length, headers[0].length).setValues(headers);
    sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold').setBackground('#2a5c3f').setFontColor('#ffffff');
  }
}
