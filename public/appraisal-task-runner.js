/* The service supplies progress events; only the isolated screenshot fixture uses a clock. */
(function (root) {
  'use strict';

  const connectionError = '暂时无法连接鉴定服务，请稍后重试';

  function run({ photos = [], text = '', skill = '', signal, onEvent = () => {} } = {}) {
    if (signal?.aborted) return;
    const emit = event => { if (!signal?.aborted) onEvent(event); };
    const fail = () => emit({ type: 'error', message: connectionError, retryable: true });
    const service = root.JianxAppraisalService;

    if (typeof service?.run === 'function') {
      try {
        const work = service.run({ photos, text, skill, signal, onEvent: emit });
        return work && typeof work.then === 'function' ? Promise.resolve(work).catch(fail) : work;
      } catch (_) {
        fail();
        return;
      }
    }

    const fixtureEnabled = new URLSearchParams(root.location?.search || '').get('appraisal') === 'demo';
    if (!fixtureEnabled || !Array.isArray(photos) || !photos.length || !photos.every(photo => photo?.sample === true)) {
      fail();
      return;
    }

    return runScreenshotFixture(emit, signal);
  }

  function runScreenshotFixture(emit, signal) {
    const stages = [
      [0, 'identify', '识别商品信息', '正在确认商品类别与包装特征', '归类美妆商品，提取可见包装文字。'],
      [4000, 'angles', '梳理拍摄角度', '正在整理各张照片对应的商品部位', '对应粉扑正面、放置层、底部与气垫正面。'],
      [9000, 'puff', '检查粉扑细节', '正在查看纹理、标识与边缘工艺', '检查粉扑正面及放置层的可见细节。'],
      [15000, 'packaging', '比对包装标识', '正在核对字样与包装细节', '核对包装正面的文字、标识位置与结构。'],
      [22000, 'base', '复核底部信息', '正在检查底部文字与标签', '读取色号 20、批号 78Z33X 及产地标注。'],
      [29000, 'review', '核对异常细节', '正在复核受反光影响的部位', '气垫正面存在眩光，影响可见工艺细节。'],
      [35000, 'conclusion', '汇总鉴定结论', '正在整理各点位结果与拍摄建议', '汇总四个点位的结论及符合度。']
    ];

    return new Promise(resolve => {
      const timers = new Set();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        timers.forEach(timer => root.clearTimeout(timer));
        timers.clear();
        signal?.removeEventListener('abort', finish);
        resolve();
      };
      const schedule = (delay, callback) => {
        const timer = root.setTimeout(() => {
          timers.delete(timer);
          if (!settled && !signal?.aborted) callback();
        }, delay);
        timers.add(timer);
      };
      const step = ([, id, title, detail, technical]) => emit({ type: 'step', id, title, detail, status: 'active', technical: [technical] });

      signal?.addEventListener('abort', finish, { once: true });
      if (signal?.aborted) { finish(); return; }
      step(stages[0]);
      if (settled || signal?.aborted) { finish(); return; }
      stages.slice(1).forEach(stage => schedule(stage[0], () => step(stage)));
      schedule(40000, () => {
        emit({ type: 'complete', result: {
          title: 'AI 鉴定结果：真（正品置信度 65 分）',
          paragraphs: [
            '识别信息：美妆 · 圣罗兰 YSL · 皮革气垫（LE CUSHION ENCRE DE PEAU，色号 20，批号 78Z33X，韩国制） | 鉴定单号 GCCCMT74DB',
            '综合各点位加权后得分 65%，整体结论倾向真。',
            '气垫正面存在反光和眩光，影响细节判断。建议在自然光或柔和侧光下，避开直射光，单独补拍清晰正面。'
          ],
          rows: [
            ['粉扑正面', '真', '81%'],
            ['粉扑放置层', '真', '81%'],
            ['气垫底部', '真', '81%'],
            ['气垫正面', '假/偏低', '26%']
          ]
        } });
        finish();
      });
    });
  }

  root.JianxAppraisalTask = Object.freeze({ run });
})(typeof window === 'undefined' ? globalThis : window);
