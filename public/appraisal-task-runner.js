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
      [0, 'validate-file', '运行校验、查看文件：single-image.md', false, 'const validation = {"file":"single-image.md","checks":["syntax","requiredFields"],"passed":true};'],
      [1200, 'read-skill', '已读取 SKILL.md', true, 'const document = {"file":"SKILL.md","sections":["input","workflow","output"]};'],
      [2400, 'inspect-directory', '查看鉴定技能目录结构', true, 'const directory = {"files":["SKILL.md","single-image.md","point-match.md","wording.md"]};'],
      [3600, 'read-point-match', '已读取 point-match.md', true, 'const document = {"file":"point-match.md","fields":["point","image","confidence"]};'],
      [4800, 'read-wording', '已读取 wording.md', true, 'const document = {"file":"wording.md","sections":["conclusion","evidence","limitations"]};'],
      [6000, 'confirm-images', '确认图片文件存在', true, 'const images = [{"name":"photo_01.jpg","exists":true},{"name":"photo_02.jpg","exists":true}];'],
      [7800, 'cpb-multi', '对 CPB 隔离霜 5 图运行多图鉴定', true, 'const appraisal = {"brand":"CPB","category":"隔离霜","imageCount":5,"mode":"multi"};'],
      [9800, 'rerun-series', '用命中的系列 ID 重跑多图鉴定', true, 'const appraisal = {"seriesId":"series_local_01","imageCount":5,"mode":"multi"};'],
      [11000, 'rerun-brand', '带品牌重跑多图鉴定', false, 'const appraisal = {"brand":"CPB","imageCount":5,"matchBy":"brand"};'],
      [12800, 'check-card-category', '查询卡牌类目是否支持', true, 'const category = {"name":"卡牌","supported":true,"modes":["single","multi"]};'],
      [14000, 'batch-args', '查看批量鉴定脚本参数', true, 'const argumentsList = ["category","brand","images","pointKeys"];'],
      [15800, 'card-batch', '对宝可梦卡牌正反面批量鉴定', true, 'const batch = {"brand":"宝可梦","images":["card_front.jpg","card_back.jpg"]};'],
      [17400, 'catalog-args', '查看目录查询脚本用法', true, 'const argumentsList = ["category","brand","series"];'],
      [18600, 'card-series', '查询宝可梦品牌下的系列', false, 'const catalog = {"brand":"宝可梦","series":[{"id":"series_local_02","name":"25周年"}]};'],
      [20400, 'card-brand-multi', '按品牌对宝可梦卡牌做多图鉴定', true, 'const appraisal = {"brand":"宝可梦","imageCount":2,"matchBy":"brand"};'],
      [22000, 'read-batch', '已读取 appraise_batch.py', true, 'const document = {"file":"appraise_batch.py","entry":"batch","inputs":["images","pointKeys"]};'],
      [23200, 'read-catalog', '查看目录数据文件', true, 'const catalog = {"category":"卡牌","brand":"宝可梦","pointCount":2};'],
      [24400, 'inspect-point-keys', '检查宝可梦品牌级鉴定点键', false, 'const points = {"brand":"宝可梦","keys":["front_print","back_print"]};'],
      [25800, 'inspect-cli', '检查点位键与 mcp_call 命令行入口', true, 'const entry = {"name":"mcp_call","pointKeys":["front_print","back_print"],"argumentsValid":true};'],
      [27000, 'read-single', '已读取 single-image.md', true, 'const document = {"file":"single-image.md","sections":["upload","pointMatch","result"]};'],
      [28400, 'upload-args', '查看单张与多张上传脚本参数', true, 'const argumentsList = {"single":["image"],"multi":["images","pointKeys"]};'],
      [29800, 'validate-auth', '运行校验、查看文件：auth-and-tools.md', true, 'const validation = {"file":"auth-and-tools.md","checks":["requiredFields"],"passed":true};'],
      [31000, 'read-auth', '已读取 auth-and-tools.md', false, 'const document = {"file":"auth-and-tools.md","sections":["credentials","uploads"]};'],
      [32600, 'credentials', '为卡牌正反面签发上传凭证', true, 'const uploadMetadata = {"files":["card_front.jpg","card_back.jpg"],"credentialRef":"local_record_01"};'],
      [34400, 'upload-images', '上传卡牌正反面图片', true, 'const uploadMetadata = {"files":[{"name":"card_front.jpg","bytes":204800},{"name":"card_back.jpg","bytes":198400}]};'],
      [36200, 'point-appraise', '卡牌正反面逐点单鉴', true, 'const points = [{"key":"front_print","image":"card_front.jpg"},{"key":"back_print","image":"card_back.jpg"}];'],
      [38000, 'aggregate', '卡牌正反面整鉴出结论', true, 'const summary = {"imageCount":2,"pointCount":2,"completed":true};']
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
      const step = ([, id, title, groupStart, technical]) => emit({ type: 'step', id, title, detail: '', status: 'active', reference: true, groupStart, technical: [technical] });

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
