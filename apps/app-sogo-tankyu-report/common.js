// ============================================================
// common.js — 全ページ共通の処理
//   - schedule.json の読み込み
//   - HTMLエスケープ / URL検証
//   - Google ログインによる閲覧ゲート（学校ドメイン限定）
// ============================================================
(function () {
  var DATA_URL = 'data/schedule.json';
  var AUTH_STORAGE_KEY = 'sogo_site_auth_domain';

  function getBasePath() {
    var path = location.pathname;
    if (path.endsWith('/') || path.endsWith('/index.html')) {
      return path.replace(/\/index\.html$/, '').replace(/\/?$/, '') || '';
    }
    return path.replace(/\/[^/]+$/, '') || '';
  }

  function loadSchedule() {
    var base = getBasePath();
    var url = (base ? base + '/' : '') + DATA_URL;
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('スケジュールの読み込みに失敗しました。');
      return res.json();
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // iframe / リンクに使ってよいURLか検証する。
  // 同一オリジンのパス、または Google Drive / Docs の https URL のみ許可。
  function isSafeUrl(u) {
    if (!u) return false;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') return true;
    try {
      var parsed = new URL(u);
      return parsed.protocol === 'https:' &&
        (parsed.hostname === 'drive.google.com' || parsed.hostname === 'docs.google.com');
    } catch (_) {
      return false;
    }
  }

  // ──────────────────────────────────────────
  // 閲覧ゲート（Google Identity Services）
  //   schedule.json の auth.client_id / auth.allowed_domain が
  //   設定されている場合のみ有効。未設定なら素通し。
  //   ※ 静的サイトのため、これは「閲覧のしやすさを制御する」ゲートです。
  //     ファイル本体の保護は Drive の共有設定（組織内のみ）が担います。
  // ──────────────────────────────────────────

  function decodeJwtPayload(credential) {
    var part = credential.split('.')[1];
    var base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    var json = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  }

  function buildOverlay(domain) {
    var overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.innerHTML =
      '<div class="auth-card">' +
      '  <p class="auth-badge">学内限定</p>' +
      '  <h2 class="auth-title">学校の Google アカウントでログイン</h2>' +
      '  <p class="auth-desc">このサイトは <strong>@' + escapeHtml(domain) + '</strong> のアカウントを持つ方のみ閲覧できます。</p>' +
      '  <div class="auth-button" id="authGsiButton"></div>' +
      '  <p class="auth-error" id="authError" hidden></p>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function loadGsiScript() {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('ログイン機能の読み込みに失敗しました。')); };
      document.head.appendChild(s);
    });
  }

  function authGate(data) {
    var auth = data && data.auth;
    var clientId = auth && String(auth.client_id || '').trim();
    var domain = auth && String(auth.allowed_domain || '').trim().toLowerCase();

    // 未設定なら認証なしで表示（デモ・ローカル確認用）
    if (!clientId || !domain) return Promise.resolve(data);

    // ログイン済み（同一セッション内）
    try {
      if (sessionStorage.getItem(AUTH_STORAGE_KEY) === domain) return Promise.resolve(data);
    } catch (_) {}

    return new Promise(function (resolve) {
      var overlay = buildOverlay(domain);
      var errorEl = overlay.querySelector('#authError');

      function showError(msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
      }

      loadGsiScript().then(function () {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: function (response) {
            var payload;
            try {
              payload = decodeJwtPayload(response.credential);
            } catch (_) {
              showError('ログイン情報を確認できませんでした。もう一度お試しください。');
              return;
            }
            var email = String(payload.email || '').toLowerCase();
            var hd = String(payload.hd || '').toLowerCase();
            var ok = payload.email_verified !== false &&
              (hd === domain || email.slice(-(domain.length + 1)) === '@' + domain);
            if (ok) {
              try { sessionStorage.setItem(AUTH_STORAGE_KEY, domain); } catch (_) {}
              overlay.remove();
              resolve(data);
            } else {
              showError('このアカウントでは閲覧できません。@' + domain + ' のアカウントでログインしてください。');
            }
          },
        });
        window.google.accounts.id.renderButton(
          overlay.querySelector('#authGsiButton'),
          { theme: 'outline', size: 'large', text: 'signin_with', locale: 'ja' }
        );
      }).catch(function (err) {
        showError(err.message);
      });
    });
  }

  window.SiteCommon = {
    getBasePath: getBasePath,
    loadSchedule: loadSchedule,
    escapeHtml: escapeHtml,
    isSafeUrl: isSafeUrl,
    authGate: authGate,
  };
})();
