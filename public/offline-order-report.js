(function () {
  'use strict';

  // All reports in this frontend are demonstrations, including user-created orders.
  window.renderOfflineReport = function renderOfflineReport(order) {
    const { photo, icon, escape } = window.OfflineOrderViews;
    const value = order || {};
    const id = escape(value.id || '');
    const category = escape(value.categoryName || value.name || '未选择品类');
    const certificate = escape(value.certificate || '—');
    const serial = escape(value.sampleSerial || '—');
    const numericScore = Number(value.score);
    const score = Number.isFinite(numericScore) ? Math.max(0, Math.min(100, numericScore)) : 96;
    const assessor = escape(String(value.assessor || '图灵评鉴鉴定师').replace(/[（(](?:模拟|演示)[）)]/g, '').trim());
    const date = new Date(value.passedAt || '');
    const dateText = Number.isNaN(date.getTime()) ? '待记录' : new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: 'Asia/Shanghai'
    }).format(date).replaceAll('/', '.');

    return `<article class="or-report" aria-label="线下实物鉴别示例报告">
      <div class="or-edition"><span>图灵评鉴 · 实物鉴别</span><span class="or-demo-label">演示数据</span></div>
      <section class="or-certificate" aria-labelledby="orConclusion">
        <header class="or-verdict">
          <span class="or-verdict-emblem" aria-hidden="true">${icon('seal-check')}</span>
          <h2 id="orConclusion">符合正品工艺</h2>
          <p>经多名鉴定师联合得出结果：<br>外观细节符合正品工艺。</p>
        </header>
        <figure class="or-photo">
          ${photo(value, 'or-product-image')}
          <figcaption><span></span>${value.photo ? '送鉴商品外观图' : '示例商品外观图'}</figcaption>
        </figure>
        <dl class="or-details">
          <div><dt>品类</dt><dd>${category}</dd></div>
          <div><dt>鉴定编号</dt><dd class="or-number">${certificate}</dd></div>
          <div><dt>样品序列号</dt><dd class="or-number">${serial}</dd></div>
        </dl>
      </section>
      <section class="or-score-card" aria-labelledby="orScoreTitle">
        <div class="or-section-heading"><h3 id="orScoreTitle">整体符合度</h3><span class="or-score-label">模拟评分</span></div>
        <div class="or-score-summary"><div class="or-score-value">${score}<span>/ 100</span></div><span class="or-score-description">AI 辅助分析</span></div>
        <div class="or-score-track" role="meter" aria-label="模拟整体符合度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}" aria-valuetext="模拟评分 ${score} 分，共 100 分"><span style="width:${score}%"></span></div>
        <p>AI 辅助评分仅用于演示，不代表实际鉴定结果。</p>
      </section>
      <section class="or-assessor-card" aria-labelledby="orAssessorTitle">
        <h3 id="orAssessorTitle">辅助鉴定</h3>
        <div class="or-assessor-row"><span class="or-assessor-emblem" aria-hidden="true">${icon('shield-check')}</span><div><strong>${assessor}<span>（模拟）</span></strong><time${Number.isNaN(date.getTime()) ? '' : ` datetime="${escape(date.toISOString())}"`}>${escape(dateText)}</time></div><span class="or-assessor-status">已完成</span></div>
      </section>
      <p class="or-report-note">本页为示例鉴别报告，仅用于体验服务流程。</p>
      <footer class="or-footer"><button type="button" class="or-action or-action-secondary" data-of-action="view-progress" data-id="${id}">查看进度</button><button type="button" class="or-action or-action-primary" data-of-action="share-report" data-id="${id}">分享报告${icon('arrow-right')}</button></footer>
    </article>`;
  };
})();
