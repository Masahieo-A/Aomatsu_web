// ============================================================
// github.gs — GitHub API 経由で schedule.json を更新
// ============================================================

/**
 * schedule.json を GitHub リポジトリに直接プッシュする
 * @param {Object} settings - getSettings() の戻り値
 * @param {string} content  - JSON文字列
 */
function pushToGithub(settings, content) {
  // トークンはスクリプト プロパティから読む（旧運用のシート保存はフォールバック）
  var token    = PropertiesService.getScriptProperties().getProperty(SCRIPT_PROP_KEYS.GITHUB_TOKEN) ||
                 settings[SETTING_KEYS.GITHUB_TOKEN] || '';
  var owner    = settings[SETTING_KEYS.GITHUB_OWNER];
  var repo     = settings[SETTING_KEYS.GITHUB_REPO];
  var branch   = settings[SETTING_KEYS.GITHUB_BRANCH]    || 'main';
  var filePath = settings[SETTING_KEYS.GITHUB_FILE_PATH]  || 'data/schedule.json';

  if (!token) {
    throw new Error('GitHub トークンが未設定です。メニューの「🔑 GitHub トークンを設定」から登録してください。');
  }
  if (!owner || !repo) {
    throw new Error('GitHub の設定（Owner / Repo）が「設定」シートに入力されていません。');
  }

  var apiBase = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + filePath;
  var headers = {
    Authorization: 'token ' + token,
    Accept:        'application/vnd.github.v3+json',
    'User-Agent':  'SogoHappyoAppsScript/1.0',
  };

  // 現在のファイルの SHA を取得（更新に必要）
  var currentSha = null;
  var getRes = UrlFetchApp.fetch(apiBase + '?ref=' + branch, {
    headers: headers,
    muteHttpExceptions: true,
  });
  if (getRes.getResponseCode() === 200) {
    currentSha = JSON.parse(getRes.getContentText()).sha;
  } else if (getRes.getResponseCode() !== 404) {
    throw new Error('GitHub API エラー（GET）: ' + getRes.getContentText());
  }

  // Base64 エンコード
  var encoded = Utilities.base64Encode(Utilities.newBlob(content, 'text/plain', 'schedule.json').getBytes());

  var now = new Date();
  var message = 'スケジュール更新 ' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');

  var payload = {
    message: message,
    content: encoded,
    branch:  branch,
  };
  if (currentSha) payload.sha = currentSha;

  var putRes = UrlFetchApp.fetch(apiBase, {
    method:  'PUT',
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var code = putRes.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub API エラー（PUT）: ' + putRes.getContentText());
  }

  Logger.log('GitHub プッシュ成功: ' + message);
}
