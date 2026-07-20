// ============================================================
// classroom.gs — Google Classroom API との連携
// ============================================================

/**
 * 指定課題の提出物一覧を取得する
 * @param {string} courseId   - ClassroomのコースID
 * @param {string} courseWorkId - 課題のID
 * @returns {Array<{studentEmail:string, studentName:string, fileId:string, mimeType:string}>}
 */
function fetchSubmissions(courseId, courseWorkId) {
  if (!courseId || !courseWorkId) {
    throw new Error('Classroom Course ID または Assignment ID が「設定」シートに入力されていません。');
  }

  var submissions = [];
  var pageToken = null;
  var profileCache = {}; // userId → {name, email}（同じ生徒への重複アクセスを避ける）

  do {
    var url = 'https://classroom.googleapis.com/v1/courses/' + courseId +
              '/courseWork/' + courseWorkId + '/studentSubmissions?pageSize=100' +
              (pageToken ? '&pageToken=' + pageToken : '');

    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('Classroom API エラー: ' + response.getContentText());
    }

    var data = JSON.parse(response.getContentText());
    pageToken = data.nextPageToken || null;

    (data.studentSubmissions || []).forEach(function (sub) {
      if (sub.state !== 'TURNED_IN' && sub.state !== 'RETURNED') return;

      var profile = getStudentProfile(sub.userId, profileCache);
      (sub.assignmentSubmission && sub.assignmentSubmission.attachments || []).forEach(function (att) {
        if (att.driveFile) {
          submissions.push({
            studentEmail: profile.email,
            studentName:  profile.name,
            userId:       sub.userId,
            fileId:       att.driveFile.id,
            mimeType:     att.driveFile.mimeType || '',
          });
        }
      });
    });
  } while (pageToken);

  return submissions;
}

/**
 * ユーザーIDからプロフィール（氏名・メールアドレス）を取得する
 * @param {string} userId
 * @param {Object} cache - userId → profile のキャッシュ
 * @returns {{name:string, email:string}}
 */
function getStudentProfile(userId, cache) {
  if (cache && cache[userId]) return cache[userId];

  var profile = { name: userId, email: '' };
  try {
    var url = 'https://classroom.googleapis.com/v1/userProfiles/' + userId;
    var res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() === 200) {
      var data = JSON.parse(res.getContentText());
      if (data.name && data.name.fullName) profile.name = data.name.fullName;
      if (data.emailAddress) profile.email = String(data.emailAddress).trim().toLowerCase();
    }
  } catch (_) {}

  if (cache) cache[userId] = profile;
  return profile;
}
