// ============================================================
// drive.gs — Google Drive のファイル管理・PDF変換
// ============================================================

/**
 * 提出ファイルをPDFに変換してDriveフォルダに保存する
 * @param {Array} groups     - getGroupList() の戻り値
 * @param {string} folderId  - 保存先フォルダID
 */
function convertAndStorePdfUrls(groups, folderId) {
  if (!folderId) throw new Error('Output Folder ID が「設定」シートに入力されていません。');

  var destFolder = DriveApp.getFolderById(folderId);
  var sheet      = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.GROUP_LIST);
  var dataRows   = sheet.getDataRange().getValues();

  // ヘッダー行をスキップ（1行目）
  for (var i = 1; i < dataRows.length; i++) {
    var row = dataRows[i];
    var groupId       = String(row[COL.GROUP_ID] || '').trim();
    var reportFileId  = String(row[COL.REPORT_FILE_ID] || '').trim();
    var slidesFileId  = String(row[COL.SLIDES_FILE_ID] || '').trim();

    if (!groupId) continue;

    // レポートPDF
    if (reportFileId && !row[COL.REPORT_PDF_DRIVE_URL]) {
      try {
        var reportPdf = exportToPdf(reportFileId, groupId + '_report', destFolder);
        var reportDriveUrl = getDriveUrl(reportPdf.getId());
        var reportEmbedUrl = getEmbedUrl(reportPdf.getId());
        sheet.getRange(i + 1, COL.REPORT_PDF_DRIVE_URL + 1).setValue(reportDriveUrl);
        sheet.getRange(i + 1, COL.REPORT_PDF_EMBED_URL + 1).setValue(reportEmbedUrl);
      } catch (e) {
        Logger.log('レポートPDF変換エラー [' + groupId + ']: ' + e.message);
      }
    }

    // スライドPDF
    if (slidesFileId && !row[COL.SLIDES_PDF_DRIVE_URL]) {
      try {
        var slidesPdf = exportToPdf(slidesFileId, groupId + '_slides', destFolder);
        var slidesDriveUrl = getDriveUrl(slidesPdf.getId());
        var slidesEmbedUrl = getEmbedUrl(slidesPdf.getId());
        sheet.getRange(i + 1, COL.SLIDES_PDF_DRIVE_URL + 1).setValue(slidesDriveUrl);
        sheet.getRange(i + 1, COL.SLIDES_PDF_EMBED_URL + 1).setValue(slidesEmbedUrl);
      } catch (e) {
        Logger.log('スライドPDF変換エラー [' + groupId + ']: ' + e.message);
      }
    }
  }

  SpreadsheetApp.flush();
}

/**
 * Google Slides/Docs ファイルをPDFにエクスポートしてフォルダに保存
 * @returns {DriveApp.File} 作成したPDFファイル
 */
function exportToPdf(fileId, fileName, destFolder) {
  var file     = DriveApp.getFileById(fileId);
  var mimeType = file.getMimeType();

  var exportMime = 'application/pdf';
  var exportUrl;

  if (mimeType === MimeType.GOOGLE_SLIDES) {
    exportUrl = 'https://docs.google.com/presentation/d/' + fileId + '/export/pdf';
  } else if (mimeType === MimeType.GOOGLE_DOCS) {
    exportUrl = 'https://docs.google.com/document/d/' + fileId + '/export?format=pdf';
  } else if (mimeType === 'application/pdf') {
    // すでにPDF
    var copy = file.makeCopy(fileName + '.pdf', destFolder);
    setPublicInOrg(copy);
    return copy;
  } else {
    throw new Error('対応していないファイル形式: ' + mimeType);
  }

  var response = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('PDF変換に失敗しました (HTTP ' + response.getResponseCode() + ')');
  }

  var blob    = response.getBlob().setName(fileName + '.pdf');
  var pdfFile = destFolder.createFile(blob);
  setPublicInOrg(pdfFile);
  return pdfFile;
}

/**
 * ファイルを「組織内のリンクを知っている全員が閲覧可能」に設定
 */
function setPublicInOrg(file) {
  try {
    file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // 権限設定に失敗しても処理を続ける
    Logger.log('共有設定エラー: ' + e.message);
  }
}

/**
 * Drive の直接開くURL（新規タブ用）
 */
function getDriveUrl(fileId) {
  return 'https://drive.google.com/file/d/' + fileId + '/view';
}

/**
 * Google Drive PDF の埋め込み用URL
 */
function getEmbedUrl(fileId) {
  return 'https://drive.google.com/file/d/' + fileId + '/preview';
}

/**
 * 提出物ファイルIDをシートに書き込む
 * studentMap: { 'メールアドレス（小文字）': 'group_id', ... }
 */
function writeFileIds(groups, studentMap, reportSubs, slidesSubs) {
  var sheet    = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.GROUP_LIST);
  var dataRows = sheet.getDataRange().getValues();

  // group_id → 行インデックスのマップ
  var rowIndex = {};
  for (var i = 1; i < dataRows.length; i++) {
    var gid = String(dataRows[i][COL.GROUP_ID] || '').trim();
    if (gid) rowIndex[gid] = i + 1; // 1始まりの行番号
  }

  function writeToGroup(subs, fileCol) {
    subs.forEach(function (sub) {
      var email = String(sub.studentEmail || '').trim().toLowerCase();
      var groupId = email ? studentMap[email] : '';
      if (!groupId) {
        Logger.log('生徒対応なし: ' + sub.studentName + ' <' + (email || 'メール不明') + '>');
        return;
      }
      var row = rowIndex[groupId];
      if (!row) {
        Logger.log('グループIDがシートにない: ' + groupId);
        return;
      }
      sheet.getRange(row, fileCol + 1).setValue(sub.fileId);
    });
  }

  writeToGroup(reportSubs, COL.REPORT_FILE_ID);
  writeToGroup(slidesSubs, COL.SLIDES_FILE_ID);
  SpreadsheetApp.flush();
}
