// ============================================================
// group.js — グループ詳細ページ（group.html）
//   common.js を先に読み込むこと
// ============================================================
(function () {
  var escapeHtml = SiteCommon.escapeHtml;
  var isSafeUrl = SiteCommon.isSafeUrl;

  function getGroupId() {
    var params = new URLSearchParams(location.search);
    return params.get('group_id') || '';
  }

  function renderGroupDetail(data) {
    var groupId = getGroupId();
    var group = (data.groups || []).find(function (g) { return g.group_id === groupId; });
    var container = document.getElementById('groupDetail');
    if (!container) return;
    if (!group) {
      container.innerHTML = '<p class="error-message">指定されたグループが見つかりません。</p>';
      return;
    }

    // 不正なURL（http・想定外ドメイン・javascript: 等）は表示しない
    var pdfEmbed = isSafeUrl(group.pdf_embed_url) ? group.pdf_embed_url : '';
    var pdfDrive = isSafeUrl(group.pdf_drive_url) ? group.pdf_drive_url : '';
    var slidesEmbed = isSafeUrl(group.slides_pdf_embed_url) ? group.slides_pdf_embed_url : '';
    var slidesDrive = isSafeUrl(group.slides_pdf_drive_url) ? group.slides_pdf_drive_url : '';

    var html = '';
    html += '<header class="detail-header">';
    html += '<h1>' + escapeHtml(group.group_name || group.group_id) + '</h1>';
    html += '<ul class="meta-list">';
    html += '<li>発表時間: ' + escapeHtml(group.timeslot_label || '') + '</li>';
    html += '<li>教室: ' + escapeHtml(group.room_name || '') + '</li>';
    html += '</ul>';
    html += '</header>';

    if (group.theme_title) {
      html += '<div class="section-block">';
      html += '<h3>探究テーマ</h3>';
      html += '<p>' + escapeHtml(group.theme_title) + '</p>';
      html += '</div>';
    }

    if (group.theme_detail) {
      html += '<div class="section-block">';
      html += '<h3>発表概要</h3>';
      html += '<p>' + escapeHtml(group.theme_detail) + '</p>';
      html += '</div>';
    }

    if (pdfEmbed || pdfDrive) {
      html += '<div class="section-block">';
      html += '<h3>資料</h3>';
      if (group.pdf_title) html += '<p><strong>' + escapeHtml(group.pdf_title) + '</strong></p>';
      if (pdfEmbed) {
        html += '<div class="pdf-embed-wrap">';
        html += '<iframe src="' + escapeHtml(pdfEmbed) + '" title="PDF"></iframe>';
        html += '</div>';
      }
      if (pdfDrive) {
        html += '<ul class="link-list">';
        html += '<li><a href="' + escapeHtml(pdfDrive) + '" target="_blank" rel="noopener" class="external">新規タブで開く</a></li>';
        html += '</ul>';
      }
      html += '</div>';
    }

    if (slidesEmbed || slidesDrive) {
      html += '<div class="section-block">';
      html += '<h3>発表スライド</h3>';
      if (group.slides_title) html += '<p><strong>' + escapeHtml(group.slides_title) + '</strong></p>';
      if (slidesEmbed) {
        html += '<div class="pdf-embed-wrap">';
        html += '<iframe src="' + escapeHtml(slidesEmbed) + '" title="発表スライド PDF"></iframe>';
        html += '</div>';
      }
      if (slidesDrive) {
        html += '<ul class="link-list">';
        html += '<li><a href="' + escapeHtml(slidesDrive) + '" target="_blank" rel="noopener" class="external">新規タブで開く</a></li>';
        html += '</ul>';
      }
      html += '</div>';
    }

    if (!group.theme_detail && !pdfEmbed && !pdfDrive && !slidesEmbed && !slidesDrive) {
      html += '<div class="section-block"><p class="text-muted">このグループの資料はまだ登録されていません。</p></div>';
    }

    container.innerHTML = html;
    var eventTitle = data.eventTitle || '富田高校　総合探究成果報告会';
    document.title = (group.group_name || group.group_id) + ' - ' + eventTitle;
    var navTitle = document.querySelector('.site-nav-title');
    if (navTitle && data.eventTitle) navTitle.textContent = data.eventTitle;
  }

  if (document.getElementById('groupDetail')) {
    SiteCommon.loadSchedule()
      .then(SiteCommon.authGate)
      .then(renderGroupDetail)
      .catch(function (err) {
        var container = document.getElementById('groupDetail');
        if (container) {
          container.innerHTML = '<p class="error-message">' + escapeHtml(err.message) + '</p>';
        }
      });
  }
})();
