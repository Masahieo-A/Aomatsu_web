// ============================================================
// sheets.gs — スプレッドシートの読み書き・JSON生成
// ============================================================

/**
 * 「設定」シートから設定値を読み込んでオブジェクトで返す
 * @returns {Object} キー→値のマップ
 */
function getSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SETTINGS);
  if (!sheet) throw new Error('「設定」シートが見つかりません。まず「初期セットアップ」を実行してください。');

  var values = sheet.getDataRange().getValues();
  var settings = {};
  values.forEach(function (row) {
    var key = String(row[0] || '').trim();
    var val = String(row[1] || '').trim();
    if (key) settings[key] = val;
  });
  return settings;
}

/**
 * 「グループ一覧」シートの全グループを配列で返す
 * @returns {Array<Object>}
 */
function getGroupList() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.GROUP_LIST);
  if (!sheet) throw new Error('「グループ一覧」シートが見つかりません。');

  var values = sheet.getDataRange().getValues();
  var groups = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var groupId = String(row[COL.GROUP_ID] || '').trim();
    if (!groupId) continue;
    groups.push({
      group_id:             groupId,
      group_name:           String(row[COL.GROUP_NAME]           || '').trim(),
      timeslot_label:       String(row[COL.TIMESLOT]             || '').trim(),
      room_name:            String(row[COL.ROOM]                 || '').trim(),
      theme_title:          String(row[COL.THEME_TITLE]          || '').trim(),
      theme_detail:         String(row[COL.THEME_DETAIL]         || '').trim(),
      report_file_id:       String(row[COL.REPORT_FILE_ID]       || '').trim(),
      slides_file_id:       String(row[COL.SLIDES_FILE_ID]       || '').trim(),
      pdf_drive_url:        String(row[COL.REPORT_PDF_DRIVE_URL] || '').trim(),
      pdf_embed_url:        String(row[COL.REPORT_PDF_EMBED_URL] || '').trim(),
      slides_pdf_drive_url: String(row[COL.SLIDES_PDF_DRIVE_URL] || '').trim(),
      slides_pdf_embed_url: String(row[COL.SLIDES_PDF_EMBED_URL] || '').trim(),
      rowIndex: i + 1,
    });
  }
  return groups;
}

/**
 * 「生徒対応」シートから { メールアドレス（小文字） → group_id } のマップを返す
 * ※ 同姓同名や氏名の表記ゆれの影響を受けないよう、メールアドレスで照合する
 */
function getStudentMapping() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.STUDENT_MAP);
  if (!sheet) throw new Error('「生徒対応」シートが見つかりません。');

  var values = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < values.length; i++) {
    var email   = String(values[i][0] || '').trim().toLowerCase();
    var groupId = String(values[i][1] || '').trim();
    if (email && groupId) map[email] = groupId;
  }
  return map;
}

/**
 * グループ一覧と設定から schedule.json の文字列を生成する
 */
function generateScheduleJson(settings) {
  var groups = getGroupList();

  var jsonObj = {
    eventTitle: settings[SETTING_KEYS.EVENT_TITLE] || '',
    eventDate:  settings[SETTING_KEYS.EVENT_DATE]  || '',
    notice:     settings[SETTING_KEYS.EVENT_NOTICE] || '',
    auth: {
      client_id:      settings[SETTING_KEYS.GOOGLE_CLIENT_ID] || '',
      allowed_domain: settings[SETTING_KEYS.ALLOWED_DOMAIN]   || '',
    },
    groups: groups.map(function (g) {
      var entry = {
        group_id:       g.group_id,
        group_name:     g.group_name,
        timeslot_label: g.timeslot_label,
        room_name:      g.room_name,
        theme_title:    g.theme_title,
        theme_detail:   g.theme_detail,
      };
      if (g.pdf_drive_url)        entry.pdf_drive_url        = g.pdf_drive_url;
      if (g.pdf_embed_url)        entry.pdf_embed_url        = g.pdf_embed_url;
      if (g.slides_pdf_drive_url) entry.slides_pdf_drive_url = g.slides_pdf_drive_url;
      if (g.slides_pdf_embed_url) entry.slides_pdf_embed_url = g.slides_pdf_embed_url;
      return entry;
    }),
  };

  return JSON.stringify(jsonObj, null, 2);
}
