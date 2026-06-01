/* ============================================================
   青松 English Learning Tools — 共通スクリプト
   ============================================================ */

'use strict';

// --- カテゴリフィルタ ---
(function initFilter() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards   = document.querySelectorAll('.app-card:not(.coming-soon)');
  const empty   = document.getElementById('empty-state');

  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.filter;

      // アクティブ状態の切り替え
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // カードの表示/非表示
      let visible = 0;
      cards.forEach(card => {
        const match = category === 'all' || card.dataset.category.split(' ').includes(category);
        card.classList.toggle('hidden', !match);
        if (match) visible++;
      });

      // 件数を表示
      const counter = document.getElementById('result-count');
      if (counter) counter.textContent = visible;

      // 空状態
      if (empty) empty.classList.toggle('visible', visible === 0);
    });
  });
})();

// --- カード数をヒーローに反映 ---
(function updateCount() {
  const counter = document.getElementById('app-count');
  if (!counter) return;
  const total = document.querySelectorAll('.app-card:not(.coming-soon)').length;
  counter.textContent = total;
})();
