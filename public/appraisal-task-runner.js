/* Local interaction prototype: all uploads play the same reference case without network access. */
(function (root) {
  'use strict';

  function run({ signal, onEvent = () => {} } = {}) {
    if (signal?.aborted) return;
    const emit = event => { if (!signal?.aborted) onEvent(event); };
    return runLocalSequence(emit, signal);
  }

  function runLocalSequence(emit, signal) {
    const stages = [
      [0, 'identify', '校验上传图片', '清晰度与可见部位', '检查画面清晰度，标记遮挡或反光的部位。'],
      [4000, 'angles', '匹配商品品牌及系列', '圣罗兰皮革气垫', '根据包装标识和外壳样式匹配商品系列。'],
      [9000, 'puff', '确认鉴定点位', '粉扑、放置层、底部、正面', '从图中定位粉扑正面、粉扑放置层、气垫底部和气垫正面。'],
      [15000, 'packaging', '比对包装标识', '字体、位置与外壳工艺', '逐项比对包装字样、标识位置和外壳结构。'],
      [22000, 'base', '核对底部批号与色号', '批号 78Z33X · 色号 20', '核对底部标签的批号、色号与产地标注。'],
      [29000, 'review', '复核反光部位', '气垫正面', '正面反光遮住部分工艺细节，记录为补拍点位。'],
      [35000, 'conclusion', '汇总鉴定结论', '点位结果与补拍建议', '汇总各点位的符合度，并整理正面补拍建议。']
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
