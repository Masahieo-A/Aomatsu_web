/**
 * ==========================================
 * 設定・定数エリア
 * ==========================================
 */
const SPREADSHEET_ID = '1O2MidGKM4GOxU-IjJvynCEonFO4ud6mokQIYt7w9qss'; // 先生のスプレッドシートID
const SHEET_NAME_CLOZE = 'ClozeTest';
const SHEET_NAME_ORDER = 'SentenceRearrangement';
const SHEET_NAME_LOG = 'ErrorLog';
const APP_PASSWORD = 'tomikou';

// ★ Messaging API設定（ここを書き換えてください！）
const CHANNEL_ACCESS_TOKEN = 'ovR//D6sQp0Qw61k6POFSH3m4Kq4y0jiXFiiAC91K4hX0J0XKkBJGinCdJ+yNXdL+XIsDanEEpWMov/RS2awQ2s7J85M1omyk3yJcgWN5aHdXPa/fY5+I9N7xpcWaqgFNopHN72OpMRd/aUMzXE9VgdB04t89/1O/w1cDnyilFU='; 
const USER_ID = 'Ua0d593ff0701ee227be35c41dcbeb090'; 

// 列のインデックス定義
const COL_CLOZE = { ID: 0, LESSON: 1, PART: 2, TITLE: 3, ORDER: 4, BODY: 5, TRANS: 6 };
const COL_ORDER = { ID: 0, LESSON: 1, PART: 2, TITLE: 3, SEQ: 4, SENTENCE: 5, TRANS: 6 };

/**
 * Webアプリへのアクセス時に実行される関数
 */
function doGet(e) {
  try {

    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Eng Learn Pro')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    handleError(error);
    return HtmlService.createHtmlOutput("<h2 style='color:red; text-align:center;'>システムエラーが発生しました</h2>");
  }
}

/**
 * フロントエンドからパスワード検証のために呼ばれる関数
 */
function checkPassword(inputPassword) {
  try {
    return inputPassword === APP_PASSWORD;
  } catch (error) {
    handleError(error);
    throw new Error("認証エラー");
  }
}

/**
 * 全データ（メニュー用）と初期設定を取得
 */
function getMenuData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const clozeSheet = ss.getSheetByName(SHEET_NAME_CLOZE);
    const clozeValues = clozeSheet.getDataRange().getValues();
    clozeValues.shift(); 
    
    const orderSheet = ss.getSheetByName(SHEET_NAME_ORDER);
    const orderValues = orderSheet.getDataRange().getValues();
    orderValues.shift(); 

    const menu = {};
    
    clozeValues.forEach(row => {
      const lesson = row[COL_CLOZE.LESSON];
      const part = row[COL_CLOZE.PART];
      if(lesson && part) {
        const key = `${lesson}___${part}`;
        if(!menu[key]) menu[key] = { lesson: lesson, part: part, hasCloze: true, hasOrder: false };
        else menu[key].hasCloze = true;
      }
    });

    orderValues.forEach(row => {
      const lesson = row[COL_ORDER.LESSON];
      const part = row[COL_ORDER.PART];
      if(lesson && part) {
        const key = `${lesson}___${part}`;
        if(!menu[key]) menu[key] = { lesson: lesson, part: part, hasCloze: false, hasOrder: true };
        else menu[key].hasOrder = true;
      }
    });

    return Object.values(menu).sort((a, b) => {
      if (a.lesson != b.lesson) return a.lesson - b.lesson;
      return a.part - b.part;
    });

  } catch (error) {
    handleError(error);
    throw new Error("メニューデータ取得失敗");
  }
}

/**
 * 指定されたLesson/Partのデータを取得
 */
function getLessonData(lesson, part, type) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (type === 'cloze') {
      const sheet = ss.getSheetByName(SHEET_NAME_CLOZE);
      const data = sheet.getDataRange().getValues();
      data.shift(); 
      return data.filter(row => 
        String(row[COL_CLOZE.LESSON]) === String(lesson) && String(row[COL_CLOZE.PART]) === String(part)
      ).map(row => ({
        id: row[COL_CLOZE.ID], title: row[COL_CLOZE.TITLE], body: row[COL_CLOZE.BODY], translation: row[COL_CLOZE.TRANS]
      }));
    } else if (type === 'order') {
      const sheet = ss.getSheetByName(SHEET_NAME_ORDER);
      const data = sheet.getDataRange().getValues();
      data.shift();
      const filtered = data.filter(row => 
        String(row[COL_ORDER.LESSON]) === String(lesson) && String(row[COL_ORDER.PART]) === String(part)
      ).map(row => ({
        id: row[COL_ORDER.ID], seq: row[COL_ORDER.SEQ], sentence: row[COL_ORDER.SENTENCE], translation: row[COL_ORDER.TRANS]
      }));
      filtered.sort((a, b) => a.seq - b.seq);
      return filtered;
    }
  } catch (error) {
    handleError(error);
    throw new Error("問題データ取得失敗");
  }
}

/**
 * ==========================================
 * エラーハンドリング・通知機能 (Messaging API版)
 * ==========================================
 */
function handleError(error) {
  console.error(error); 
  logErrorToSheet(error); 
  sendLineMessage(error); 
}

function logErrorToSheet(error) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME_LOG);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME_LOG);
      sheet.appendRow(["Timestamp", "Message", "Stack Trace"]);
    }
    const time = Utilities.formatDate(new Date(), "JST", "yyyy/MM/dd HH:mm:ss");
    sheet.appendRow([time, error.message, error.stack]);
  } catch (e) {
    console.error("ログ記録失敗: " + e.message);
  }
}

// ★ここが新しいMessaging API用の送信関数です
function sendLineMessage(error) {
  if (!CHANNEL_ACCESS_TOKEN || !USER_ID) {
    console.error("LINE設定が不足しています");
    return;
  }

  try {
    const time = Utilities.formatDate(new Date(), "JST", "MM/dd HH:mm");
    const text = `⚠️ アプリでエラー発生\n\n【時刻】${time}\n【内容】${error.message}`;

    const payload = {
      "to": USER_ID,
      "messages": [{ "type": "text", "text": text }]
    };

    const options = {
      "method": "post",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
      },
      "payload": JSON.stringify(payload)
    };

    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options);
    
  } catch (e) {
    console.error("LINE送信失敗: " + e.message);
  }
}