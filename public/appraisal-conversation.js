(function (root) {
  'use strict';

  const DURATION_MS = 40000;
  // Screenshot fixtures for the interaction replica, never a real tool trace.
  const STEPS = Object.freeze([
    { at: 0, title: 'sandbox {"lifecycle":"turn","mode":"new","pr…', detail: '建立鉴定会话，准备本次图片。' },
    { at: 3000, title: '思考了 3 秒', detail: '整理上传图片，确认可见的商品信息。' },
    { at: 6000, title: '阅读了 skill 的第 1-127 行', detail: '查看美妆品类的图片要求。' },
    { at: 9000, title: '阅读了 skill 的第 1-127 行', detail: '查看商品点位与图像清晰度要求。' },
    { at: 12000, title: '读取 {"path":"skills/jianx-ai-appraisal-b…', detail: '准备粉扑、内托、底部和正面的点位信息。' },
    { at: 16000, title: '思考了 4 秒', detail: '整理不同点位的可见信息。' },
    { at: 20000, title: '阅读了 skill', detail: '查看点位结果的展示格式。' },
    { at: 24000, title: '思考了 4 秒', detail: '汇总点位分数与照片拍摄条件。' },
    { at: 28000, title: '阅读了 skill', detail: '准备结论和补拍建议。' },
    { at: 32000, title: '思考了 1 秒', detail: '检查结果表格和商品信息。' },
    { at: 35000, title: '阅读了 skill', detail: '整理鉴定结论。' },
    { at: 38000, title: '思考了 2 秒', detail: '完成报告排版。' }
  ]);

  const PHASES = Object.freeze([
    { at: 0, name: '检查照片', title: '正在检查照片', detail: '确认照片清晰度与可见细节' },
    { at: 8000, name: '整理鉴定点位', title: '正在整理鉴定点位', detail: '整理包装、标识及细节位置' },
    { at: 18000, name: '分析细节', title: '正在分析细节', detail: '对照各处细节，综合照片信息' },
    { at: 30000, name: '整理结论', title: '正在整理结论', detail: '汇总点位结果与补拍建议' }
  ]);
  function processState(elapsed, status = 'running') {
    const time = Math.max(0, Math.min(Number(elapsed) || 0, DURATION_MS));
    const resolved = status === 'running' && time >= DURATION_MS ? 'complete' : status;
    const index = PHASES.reduce((selected, phase, i) => time >= phase.at ? i : selected, 0);
    const phases = PHASES.map((phase, i) => {
      const state = resolved === 'complete' || i < index ? 'done' : i > index ? 'pending' : resolved === 'stopped' ? 'stopped' : 'active';
      return { state, label: { done: '已完成', active: '进行中', pending: '待处理', stopped: '已停止' }[state] };
    });
    return {
      title: resolved === 'complete' ? '分析完成' : resolved === 'stopped' ? '分析已停止' : PHASES[index].title,
      detail: resolved === 'complete' ? '鉴定结论已生成' : resolved === 'stopped' ? '可重新上传照片发起鉴定' : PHASES[index].detail,
      elapsedLabel: `${Math.floor(time / 1000)} 秒`, index, phases, status: resolved
    };
  }

  function sampleReportHTML() {
    return `<h2>AI 鉴定结果：真（正品置信度 65 分）</h2>
      <p><strong>识别信息：</strong>美妆 · 圣罗兰 YSL · 皮革气垫（LE CUSHION ENCRE DE PEAU，色号 20，批号 78Z33X，韩国制） | 鉴鉴单号 GCCCMT74DB</p>
      <h3>各点位明细</h3>
      <table><caption class="appraisal-sr-only">商品点位鉴定结果</caption><thead><tr><th scope="col">点位</th><th scope="col">结论</th><th scope="col">符合度</th></tr></thead><tbody>
        <tr><th scope="row">粉扑正面</th><td>真</td><td>81%</td></tr>
        <tr><th scope="row">粉扑放置层</th><td>真</td><td>81%</td></tr>
        <tr><th scope="row">气垫底部</th><td>真</td><td>81%</td></tr>
        <tr><th scope="row">气垫正面</th><td>假/偏低</td><td>26%</td></tr>
      </tbody></table>
      <p>综合各点位加权后得分 65%，整体结论倾向真。</p>
      <p><strong>关于「气垫正面」这一项分数明显偏低：</strong>你拍的正面几张里，金色镜盖面反光、眩光很重，还有指纹和灰尘痕迹，AI 很难提取到有效的工艺特征，所以这一项分值被拉了下来，属于<strong>拍摄条件影响判断</strong>，不等于产品为假。如果想让分数更可靠，建议这样补拍一处：</p>
      <ul><li>白天自然光或柔和侧光下，避开顶灯直射，把气垫外面金色盖子（含 YSL 皮纹绗缝面）平放着单独拍一张清晰正面；对焦在 logo 金属件和皮纹缝线上，不要隔着手持反光面拍摄。</li></ul>
      <p>其余像粉扑、内托、底部刻字、背面标签这几处拍得很清楚，符合度均在 81%，是这次判定为真的主要支撑。</p>`;
  }

  function create({ app, panel, messages, onBusyChange = () => {}, onHome = () => {} }) {
    const doc = app.ownerDocument;
    const ownedUrls = new Set();
    let active = null;
    let timer = null;
    let busy = false;
    let sequence = 0;
    let viewer = null;
    let viewerTrigger = null;
    let followTail = true;

    messages.setAttribute('aria-live', 'off');
    messages.setAttribute('aria-label', '鉴定对话');
    messages.addEventListener('scroll', () => {
      followTail = messages.scrollHeight - messages.clientHeight - messages.scrollTop < 64;
    }, { passive: true });

    const announce = doc.createElement('span');
    announce.className = 'appraisal-sr-only';
    announce.setAttribute('role', 'status');
    panel.append(announce);

    function setBusy(value) {
      busy = value;
      onBusyChange(value);
    }
    function stopClock() {
      if (timer !== null) root.clearInterval(timer);
      timer = null;
    }
    function imageElement(photo, alt) {
      const frame = doc.createElement('span');
      frame.className = 'appraisal-photo' + (photo.sample ? ' appraisal-sample-image' : '');
      const img = doc.createElement('img');
      img.src = photo.url;
      img.alt = alt;
      img.draggable = false;
      frame.append(img);
      return frame;
    }
    function closeViewer() {
      if (!viewer) return;
      const old = viewer;
      viewer = null;
      if (old.open) old.close();
      old.remove();
      if (viewerTrigger?.isConnected) viewerTrigger.focus({ preventScroll: true });
      viewerTrigger = null;
    }
    function openViewer(photos, start, trigger) {
      closeViewer();
      viewerTrigger = trigger;
      let index = start;
      const dialog = doc.createElement('dialog');
      dialog.className = 'appraisal-photo-dialog';
      dialog.setAttribute('aria-label', '查看上传照片大图');
      dialog.innerHTML = '<div class="appraisal-photo-dialog-top"><span class="appraisal-photo-position"></span><button type="button" aria-label="关闭照片大图">×</button></div><div class="appraisal-photo-stage"></div><div class="appraisal-photo-navigation"><button type="button" data-direction="-1" aria-label="上一张照片">‹</button><span></span><button type="button" data-direction="1" aria-label="下一张照片">›</button></div>';
      const paint = () => {
        dialog.querySelector('.appraisal-photo-stage').replaceChildren(imageElement(photos[index], `上传照片 ${index + 1}`));
        dialog.querySelector('.appraisal-photo-position').textContent = `${index + 1} / ${photos.length}`;
        dialog.querySelector('.appraisal-photo-navigation span').textContent = `照片 ${index + 1}`;
        dialog.querySelector('.appraisal-photo-navigation').hidden = photos.length === 1;
      };
      const change = direction => { index = (index + direction + photos.length) % photos.length; paint(); };
      dialog.querySelector('[aria-label="关闭照片大图"]').onclick = closeViewer;
      dialog.querySelectorAll('[data-direction]').forEach(button => button.onclick = () => change(Number(button.dataset.direction)));
      dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeViewer(); }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); change(event.key === 'ArrowLeft' ? -1 : 1); }
      }, true);
      dialog.addEventListener('cancel', event => { event.preventDefault(); closeViewer(); });
      dialog.addEventListener('click', event => { if (event.target === dialog) closeViewer(); });
      doc.body.append(dialog);
      viewer = dialog;
      paint();
      dialog.showModal();
      dialog.querySelector('button').focus();
    }
    function makeMedia(photos) {
      const media = doc.createElement('div');
      media.className = 'appraisal-media';
      const stack = doc.createElement('button');
      stack.type = 'button';
      stack.className = 'appraisal-photo-stack' + (photos.length === 1 ? ' is-single' : '');
      stack.setAttribute('aria-label', `查看上传照片，${photos.length} 张`);
      [...photos.slice(0, 3)].reverse().forEach((photo, reverseIndex, rendered) => {
        const layer = imageElement(photo, reverseIndex === rendered.length - 1 ? '本次上传的商品照片' : '');
        layer.style.setProperty('--layer', String(rendered.length - reverseIndex - 1));
        if (reverseIndex !== rendered.length - 1) layer.setAttribute('aria-hidden', 'true');
        stack.append(layer);
      });
      const count = doc.createElement('span');
      count.className = 'appraisal-photo-count';
      count.textContent = `1/${photos.length}`;
      stack.append(count);
      stack.onclick = () => openViewer(photos, 0, stack);
      const grid = doc.createElement('div');
      grid.className = 'appraisal-photo-grid';
      grid.hidden = true;
      grid.id = `appraisal-photos-${sequence}`;
      photos.forEach((photo, index) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `查看第 ${index + 1} 张照片`);
        button.append(imageElement(photo, `上传照片 ${index + 1}`));
        button.onclick = () => openViewer(photos, index, button);
        grid.append(button);
      });
      if (photos.length > 1) {
        const expand = doc.createElement('button');
        expand.type = 'button';
        expand.className = 'appraisal-expand-photos';
        expand.textContent = `展开 ${photos.length}`;
        expand.setAttribute('aria-controls', grid.id);
        expand.setAttribute('aria-expanded', 'false');
        expand.onclick = () => {
          grid.hidden = !grid.hidden;
          stack.hidden = !grid.hidden;
          media.classList.toggle('is-expanded', !grid.hidden);
          expand.textContent = grid.hidden ? `展开 ${photos.length}` : '收起照片';
          expand.setAttribute('aria-expanded', String(!grid.hidden));
        };
        media.append(expand);
      }
      media.append(stack, grid);
      return media;
    }
    const markIcons = {
      running: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
      complete: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 12 4 4 8-9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      stopped: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 7v10M15 7v10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
    };
    function updateTechnical(turn) {
      turn.stages.forEach((stage, index) => {
        if (stage.technical.hidden) return;
        const end = PHASES[index + 1]?.at ?? DURATION_MS;
        const text = STEPS.filter(step => step.at >= PHASES[index].at && step.at < end && step.at <= turn.elapsedMs)
          .map(step => `[${Math.floor(step.at / 1000)}s] ${step.title}`).join('\n');
        const content = text || '正在整理本阶段记录…';
        if (stage.code.textContent !== content) stage.code.textContent = content;
      });
    }
    function setStageExpanded(turn, stage, expanded) {
      if (expanded && stage.button.disabled) return;
      if (!expanded && stage.technical.contains(doc.activeElement)) stage.button.focus({ preventScroll: true });
      stage.button.setAttribute('aria-expanded', String(expanded));
      stage.row.classList.toggle('is-detail-open', expanded);
      stage.technical.hidden = !expanded;
      stage.button.setAttribute('aria-label', `${stage.name}，${stage.label.textContent}，${stage.button.disabled ? '尚未开始' : expanded ? '收起技术记录' : '查看技术记录'}`);
      if (expanded) updateTechnical(turn);
      else stage.code.textContent = '';
    }
    function setProcessExpanded(turn, expanded) {
      if (!expanded && turn.body.contains(doc.activeElement)) turn.toggle.focus({ preventScroll: true });
      turn.process.classList.toggle('is-open', expanded);
      turn.toggle.setAttribute('aria-expanded', String(expanded));
      turn.body.setAttribute('aria-hidden', String(!expanded));
      turn.body.inert = !expanded;
      if (!expanded) turn.stages.forEach(stage => setStageExpanded(turn, stage, false));
    }
    function updateProcess(turn, elapsed, status = 'running') {
      const view = processState(elapsed, status);
      turn.elapsedMs = Math.max(0, Math.min(elapsed, DURATION_MS));
      turn.process.dataset.state = view.status;
      turn.process.classList.toggle('is-complete', view.status === 'complete');
      turn.process.classList.toggle('is-stopped', view.status === 'stopped');
      turn.title.textContent = view.title;
      turn.detail.textContent = view.detail;
      turn.elapsed.textContent = view.elapsedLabel;
      if (turn.status !== view.status) turn.mark.innerHTML = markIcons[view.status];
      view.phases.forEach((phase, i) => {
        const stage = turn.stages[i];
        stage.row.dataset.state = phase.state;
        stage.label.textContent = phase.label;
        stage.button.disabled = phase.state === 'pending';
        stage.button.setAttribute('aria-label', `${stage.name}，${phase.label}，${stage.button.disabled ? '尚未开始' : stage.technical.hidden ? '查看技术记录' : '收起技术记录'}`);
        turn.segments[i].dataset.state = phase.state;
      });
      turn.progress.setAttribute('aria-valuenow', String(view.phases.filter(phase => phase.state === 'done').length));
      turn.progress.setAttribute('aria-valuetext', view.status === 'complete' ? '4 个阶段已完成' : `${view.index + 1}/4，${view.title}`);
      if (turn.phaseIndex !== view.index && view.status === 'running') announce.textContent = `${view.title}，${view.detail}。`;
      turn.phaseIndex = view.index;
      turn.status = view.status;
      updateTechnical(turn);
    }
    function makeProcess(turn) {
      const process = doc.createElement('section');
      process.className = 'appraisal-process';
      const toggle = doc.createElement('button');
      toggle.type = 'button';
      toggle.className = 'appraisal-process-summary';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', `appraisal-process-body-${sequence}`);
      const mark = doc.createElement('span');
      mark.className = 'appraisal-process-mark';
      mark.setAttribute('aria-hidden', 'true');
      const heading = doc.createElement('span');
      heading.className = 'appraisal-process-heading';
      const line = doc.createElement('span');
      line.className = 'appraisal-status-line';
      const title = doc.createElement('strong');
      title.className = 'appraisal-status-title';
      line.append(title);
      const detail = doc.createElement('span');
      detail.className = 'appraisal-status-detail';
      heading.append(line, detail);
      const elapsed = doc.createElement('span');
      elapsed.className = 'appraisal-elapsed';
      const chevron = doc.createElement('span');
      chevron.className = 'appraisal-process-chevron';
      chevron.innerHTML = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      toggle.append(mark, heading, elapsed, chevron);
      const progress = doc.createElement('div');
      progress.className = 'appraisal-phase-progress';
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', '鉴定阶段进度');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '4');
      const segments = PHASES.map(() => {
        const segment = doc.createElement('span');
        segment.setAttribute('aria-hidden', 'true');
        progress.append(segment);
        return segment;
      });
      const body = doc.createElement('div');
      body.className = 'appraisal-process-body';
      body.id = `appraisal-process-body-${sequence}`;
      body.setAttribute('aria-hidden', 'true');
      body.inert = true;
      const inner = doc.createElement('div');
      inner.className = 'appraisal-process-inner';
      const stagesList = doc.createElement('ol');
      stagesList.className = 'appraisal-stages';
      stagesList.setAttribute('aria-label', '鉴定处理阶段');
      const stages = PHASES.map((phase, index) => {
        const row = doc.createElement('li');
        row.className = 'appraisal-stage';
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'appraisal-stage-toggle';
        button.id = `appraisal-stage-toggle-${sequence}-${index}`;
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', `appraisal-stage-detail-${sequence}-${index}`);
        const dot = doc.createElement('span');
        dot.className = 'appraisal-stage-mark';
        dot.setAttribute('aria-hidden', 'true');
        const copy = doc.createElement('div');
        copy.className = 'appraisal-stage-copy';
        const name = doc.createElement('strong');
        name.textContent = phase.name;
        const description = doc.createElement('p');
        description.textContent = phase.detail;
        copy.append(name, description);
        const label = doc.createElement('span');
        label.className = 'appraisal-stage-state';
        const meta = doc.createElement('span');
        meta.className = 'appraisal-stage-meta';
        const arrow = doc.createElement('span');
        arrow.className = 'appraisal-stage-chevron';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.innerHTML = chevron.innerHTML;
        meta.append(label, arrow);
        button.append(dot, copy, meta);
        const technical = doc.createElement('div');
        technical.className = 'appraisal-stage-technical';
        technical.id = `appraisal-stage-detail-${sequence}-${index}`;
        technical.hidden = true;
        technical.setAttribute('role', 'region');
        technical.setAttribute('aria-labelledby', button.id);
        const pre = doc.createElement('pre');
        pre.tabIndex = 0;
        pre.setAttribute('aria-label', `${phase.name}技术记录`);
        const code = doc.createElement('code');
        pre.append(code);
        technical.append(pre);
        row.append(button, technical);
        stagesList.append(row);
        const stage = { row, button, label, technical, code, name: phase.name };
        button.onclick = () => setStageExpanded(turn, stage, technical.hidden);
        return stage;
      });
      inner.append(stagesList);
      body.append(inner);
      process.append(toggle, progress, body);
      Object.assign(turn, { process, toggle, body, mark, title, detail, elapsed, stages, progress, segments });
      toggle.onclick = () => setProcessExpanded(turn, toggle.getAttribute('aria-expanded') !== 'true');
      updateProcess(turn, 0);
      setProcessExpanded(turn, true);
      return process;
    }
    function tick() {
      if (!active || !busy) return;
      const turn = active;
      const elapsed = Math.min(Date.now() - turn.startedAt, DURATION_MS);
      const keepFollowing = followTail;
      updateProcess(turn, elapsed);
      if (elapsed >= DURATION_MS) {
        stopClock();
        setProcessExpanded(turn, false);
        const result = doc.createElement('article');
        result.className = 'appraisal-result';
        result.setAttribute('aria-label', '鉴定结论');
        result.tabIndex = -1;
        result.innerHTML = sampleReportHTML();
        turn.node.append(result);
        setBusy(false);
        active = null;
        announce.textContent = '分析完成，鉴定结论已生成。';
        if (keepFollowing) messages.scrollTop = Math.max(0, turn.process.offsetTop - messages.offsetTop - 14);
      }
    }
    function send({ text = '', photos = [], skill = '' } = {}) {
      if (busy || (!text.trim() && !photos.length)) return false;
      sequence += 1;
      panel.hidden = false;
      app.classList.add('is-appraisal');
      const turn = { node: doc.createElement('section'), startedAt: Date.now() };
      turn.node.className = 'appraisal-turn';
      const time = doc.createElement('p');
      time.className = 'appraisal-time';
      time.textContent = `今天 ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}`;
      turn.node.append(time);
      photos.forEach(photo => { if (photo.url.startsWith('blob:')) ownedUrls.add(photo.url); });
      if (photos.length) turn.node.append(makeMedia(photos));
      if (text.trim()) {
        const bubble = doc.createElement('p');
        bubble.className = 'appraisal-user-text';
        bubble.textContent = text.trim();
        turn.node.append(bubble);
      }
      if (photos.length) turn.node.append(makeProcess(turn));
      else {
        const reply = doc.createElement('p');
        reply.className = 'appraisal-text-reply';
        reply.textContent = '请上传商品照片，我会在这里展示处理过程与鉴定结论。';
        turn.node.append(reply);
      }
      messages.append(turn.node);
      messages.scrollTop = Math.max(0, turn.node.offsetTop - messages.offsetTop);
      followTail = true;
      if (photos.length) {
        active = turn;
        setBusy(true);
        announce.textContent = '已接收照片，正在检查照片。';
        tick();
        timer = root.setInterval(tick, 500);
      }
      return true;
    }
    function close() {
      closeViewer();
      stopClock();
      if (active) {
        updateProcess(active, Date.now() - active.startedAt, 'stopped');
        setProcessExpanded(active, false);
        active = null;
      }
      if (busy) setBusy(false);
      panel.hidden = true;
      app.classList.remove('is-appraisal');
      onHome();
    }
    function reset() {
      close();
      ownedUrls.forEach(url => URL.revokeObjectURL(url));
      ownedUrls.clear();
      messages.replaceChildren();
      announce.textContent = '';
    }
    root.addEventListener('pagehide', reset);
    return { send, close, reset, get busy() { return busy; } };
  }

  root.AppraisalConversation = Object.freeze({ create, DURATION_MS, STEPS, PHASES, processState, sampleReportHTML });
})(window);
