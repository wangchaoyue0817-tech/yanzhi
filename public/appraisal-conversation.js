(function (root) {
  'use strict';

  function create({ app, panel, messages, onBusyChange = () => {}, onHome = () => {}, runTask }) {
    const doc = app.ownerDocument;
    const model = root.JianxAppraisalProgress;
    const ownedUrls = new Set();
    const turns = new Set();
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
      turns.forEach(turn => { turn.retry.disabled = value; });
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
    markIcons.error = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 6v8m0 4h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    const chevronHTML = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const stageLabels = { active: '进行中', done: '已完成', error: '未完成', stopped: '已停止' };
    function element(tag, className, text) {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function stageLabel(stage) {
      stage.button.setAttribute('aria-label', `${stage.name.textContent}，${stage.label.textContent}${stage.button.disabled ? '' : stage.technical.hidden ? '，查看技术记录' : '，收起技术记录'}`);
    }
    function setStageExpanded(turn, stage, expanded) {
      if (expanded && stage.button.disabled) return;
      if (!expanded && stage.technical.contains(doc.activeElement)) stage.button.focus({ preventScroll: true });
      stage.button.setAttribute('aria-expanded', String(expanded));
      stage.row.classList.toggle('is-detail-open', expanded);
      stage.technical.hidden = !expanded;
      stage.code.textContent = expanded ? stage.records.join('\n') : '';
      stageLabel(stage);
    }
    function setProcessExpanded(turn, expanded) {
      if (!expanded && turn.body.contains(doc.activeElement)) turn.toggle.focus({ preventScroll: true });
      turn.process.classList.toggle('is-open', expanded);
      turn.toggle.setAttribute('aria-expanded', String(expanded));
      turn.body.setAttribute('aria-hidden', String(!expanded));
      turn.body.inert = !expanded;
      if (!expanded) turn.stages.forEach(stage => setStageExpanded(turn, stage, false));
    }
    function createStage(turn, step) {
      const row = element('li', 'appraisal-stage');
      row.dataset.stepId = step.id;
      const button = element('button', 'appraisal-stage-toggle');
      button.type = 'button';
      const key = `${turn.key}-${turn.stages.size}`;
      button.id = `appraisal-stage-toggle-${key}`;
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', `appraisal-stage-detail-${key}`);
      const dot = element('span', 'appraisal-stage-mark');
      dot.setAttribute('aria-hidden', 'true');
      const copy = element('div', 'appraisal-stage-copy');
      const name = element('strong');
      const description = element('p');
      copy.append(name, description);
      const label = element('span', 'appraisal-stage-state');
      const meta = element('span', 'appraisal-stage-meta');
      const arrow = element('span', 'appraisal-stage-chevron');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = chevronHTML;
      meta.append(label, arrow);
      button.append(dot, copy, meta);
      const technical = element('div', 'appraisal-stage-technical');
      technical.id = `appraisal-stage-detail-${key}`;
      technical.hidden = true;
      technical.setAttribute('role', 'region');
      technical.setAttribute('aria-labelledby', button.id);
      const pre = element('pre');
      pre.tabIndex = 0;
      const code = element('code');
      pre.append(code);
      technical.append(pre);
      row.append(button, technical);
      const stage = { row, button, name, description, label, arrow, technical, pre, code, records: [] };
      button.onclick = () => setStageExpanded(turn, stage, technical.hidden);
      turn.stages.set(step.id, stage);
      turn.list.append(row);
      return stage;
    }
    function updateProcess(turn) {
      const view = model.view(turn.state, Date.now());
      turn.process.dataset.state = view.status;
      turn.process.classList.toggle('is-complete', view.status === 'complete');
      turn.process.classList.toggle('is-stopped', view.status === 'stopped');
      turn.title.textContent = view.title;
      turn.detail.textContent = view.detail;
      turn.elapsed.textContent = view.elapsedLabel;
      if (turn.status !== view.status) turn.mark.innerHTML = markIcons[view.status];
      const determinate = view.progress !== null;
      turn.progress.dataset.determinate = String(determinate);
      turn.progress.style.setProperty('--progress', determinate ? `${view.progress}%` : '0%');
      turn.progressValue.hidden = !determinate;
      turn.progressValue.textContent = determinate ? `${Math.round(view.progress)}%` : '';
      if (determinate) turn.progress.setAttribute('aria-valuenow', String(view.progress));
      else turn.progress.removeAttribute('aria-valuenow');
      turn.progress.setAttribute('aria-valuetext', view.title);
      const historyIds = new Set(view.historyIds);
      // Never hide a record while the user is reading its detail or holding focus.
      turn.stages.forEach((stage, id) => {
        if (historyIds.has(id) && (!stage.technical.hidden || stage.row.contains(doc.activeElement))) turn.historyExpanded = true;
      });
      for (const step of view.steps) {
        const stage = turn.stages.get(step.id) || createStage(turn, step);
        stage.row.dataset.state = step.status;
        stage.row.hidden = historyIds.has(step.id) && !turn.historyExpanded;
        stage.name.textContent = step.title;
        stage.description.textContent = step.detail;
        stage.label.textContent = stageLabels[step.status];
        stage.records = step.technical;
        stage.button.disabled = step.technical.length === 0;
        stage.arrow.hidden = stage.button.disabled;
        stage.pre.setAttribute('aria-label', `${step.title}技术记录`);
        if (!stage.technical.hidden) stage.code.textContent = stage.records.join('\n');
        stageLabel(stage);
      }
      turn.history.hidden = view.historyIds.length === 0;
      turn.history.textContent = turn.historyExpanded ? '收起历史记录' : `查看前面 ${view.historyIds.length} 条记录`;
      turn.history.setAttribute('aria-expanded', String(turn.historyExpanded));
      turn.error.hidden = view.status !== 'error';
      turn.retry.hidden = !turn.state.retryable;
      turn.retry.disabled = busy;
      turn.errorText.textContent = view.status === 'error' ? '本次处理未完成' : '';
      if (turn.currentId !== view.currentId || turn.status !== view.status) announce.textContent = `${view.title}。`;
      turn.currentId = view.currentId;
      turn.status = view.status;
    }
    function makeProcess(turn) {
      const process = element('section', 'appraisal-process');
      const toggle = element('button', 'appraisal-process-summary');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', `appraisal-process-body-${turn.key}`);
      const mark = element('span', 'appraisal-process-mark');
      mark.setAttribute('aria-hidden', 'true');
      const heading = element('span', 'appraisal-process-heading');
      const line = element('span', 'appraisal-status-line');
      const title = element('strong', 'appraisal-status-title');
      line.append(title);
      const detail = element('span', 'appraisal-status-detail');
      heading.append(line, detail);
      const elapsed = element('span', 'appraisal-elapsed');
      const progressValue = element('span', 'appraisal-progress-value');
      progressValue.hidden = true;
      const chevron = element('span', 'appraisal-process-chevron');
      chevron.innerHTML = chevronHTML;
      toggle.append(mark, heading, elapsed, progressValue, chevron);
      const progress = element('div', 'appraisal-activity-track');
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', '鉴定进度');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
      const light = element('i');
      light.setAttribute('aria-hidden', 'true');
      progress.append(light);
      const body = element('div', 'appraisal-process-body');
      body.id = `appraisal-process-body-${turn.key}`;
      const inner = element('div', 'appraisal-process-inner');
      const list = element('ol', 'appraisal-stages');
      list.id = `appraisal-stages-${turn.key}`;
      list.setAttribute('aria-label', '鉴定处理记录');
      const history = element('button', 'appraisal-history-toggle');
      history.type = 'button';
      history.setAttribute('aria-controls', list.id);
      history.hidden = true;
      inner.append(list, history);
      body.append(inner);
      const error = element('div', 'appraisal-process-error');
      error.hidden = true;
      const errorText = element('p');
      const retry = element('button', 'appraisal-retry', '重新尝试');
      retry.type = 'button';
      error.append(errorText, retry);
      process.append(toggle, progress, body, error);
      Object.assign(turn, { process, toggle, body, mark, title, detail, elapsed, list, history, progress, progressValue, error, errorText, retry, stages: new Map(), historyExpanded: false, status: null, currentId: null });
      toggle.onclick = () => setProcessExpanded(turn, toggle.getAttribute('aria-expanded') !== 'true');
      history.onclick = () => {
        turn.historyExpanded = !turn.historyExpanded;
        if (!turn.historyExpanded) {
          const ids = new Set(model.view(turn.state).historyIds);
          turn.stages.forEach((stage, id) => {
            if (ids.has(id)) {
              if (stage.row.contains(doc.activeElement)) history.focus({ preventScroll: true });
              setStageExpanded(turn, stage, false);
            }
          });
        }
        updateProcess(turn);
      };
      retry.onclick = () => {
        if (busy) return;
        turn.abort?.abort();
        const old = turn.process;
        turn.key = ++sequence;
        turn.state = model.createState();
        const replacement = makeProcess(turn);
        old.replaceWith(replacement);
        turn.toggle.focus({ preventScroll: true });
        begin(turn);
      };
      updateProcess(turn);
      setProcessExpanded(turn, true);
      return process;
    }
    function appendResult(turn, data) {
      const result = element('article', 'appraisal-result');
      result.setAttribute('aria-label', '鉴定结论');
      result.tabIndex = -1;
      if (typeof data === 'string') result.append(element('p', '', data));
      else {
        if (typeof data.title === 'string') result.append(element('h2', '', data.title));
        (Array.isArray(data.paragraphs) ? data.paragraphs : []).forEach(text => {
          if (typeof text === 'string') result.append(element('p', '', text));
        });
        if (Array.isArray(data.rows) && data.rows.length) {
          const table = element('table');
          const caption = element('caption', 'appraisal-sr-only', '商品点位鉴定结果');
          const head = element('thead');
          const tr = element('tr');
          ['点位', '结论', '符合度'].forEach(text => {
            const th = element('th', '', text);
            th.setAttribute('scope', 'col');
            tr.append(th);
          });
          head.append(tr);
          const tbody = element('tbody');
          data.rows.forEach(row => {
            if (!Array.isArray(row)) return;
            const tr = element('tr');
            row.slice(0, 3).forEach((text, i) => {
              const cell = element(i ? 'td' : 'th', '', String(text));
              if (!i) cell.setAttribute('scope', 'row');
              tr.append(cell);
            });
            tbody.append(tr);
          });
          table.append(caption, head, tbody);
          result.append(table);
        }
      }
      turn.node.append(result);
    }
    function tick() {
      if (active && busy) updateProcess(active);
    }
    function begin(turn) {
      active = turn;
      const abort = new root.AbortController();
      turn.abort = abort;
      setBusy(true);
      announce.textContent = '已接收照片，正在处理任务。';
      stopClock();
      timer = root.setInterval(tick, 500);
      const onEvent = event => {
        if (active !== turn || turn.abort !== abort || abort.signal.aborted) return;
        if (!model.applyEvent(turn.state, event)) return;
        const keepFollowing = followTail;
        updateProcess(turn);
        if (turn.state.status !== 'running') {
          stopClock();
          active = null;
          setBusy(false);
          turn.stages.forEach(stage => setStageExpanded(turn, stage, false));
          if (turn.state.status === 'complete') {
            setProcessExpanded(turn, false);
            appendResult(turn, turn.state.result);
            announce.textContent = '分析完成，鉴定结论已生成。';
          }
          abort.abort();
        }
        if (keepFollowing) messages.scrollTop = turn.state.status === 'complete'
          ? Math.max(0, turn.process.offsetTop - messages.offsetTop - 14)
          : Math.max(0, messages.scrollHeight - messages.clientHeight);
      };
      try {
        if (typeof runTask !== 'function') {
          onEvent({ type: 'error', message: '暂时无法连接鉴定服务，请稍后重试' });
          return;
        }
        const output = runTask({ ...turn.payload, signal: abort.signal, onEvent });
        // Providers may stream after returning; only an explicit result ends the task.
        if (output && typeof output.then === 'function') output.then(result => {
          if (result !== undefined) onEvent({ type: 'complete', result });
        }).catch(() => onEvent({ type: 'error', message: '暂时无法完成处理，请重试' }));
        else if (output !== undefined) onEvent({ type: 'complete', result: output });
      } catch (_) {
        onEvent({ type: 'error', message: '暂时无法完成处理，请重试' });
      }
    }
    function send({ text = '', photos = [], skill = '' } = {}) {
      if (busy || (!text.trim() && !photos.length)) return false;
      sequence += 1;
      panel.hidden = false;
      app.classList.add('is-appraisal');
      const turn = { node: element('section', 'appraisal-turn'), key: sequence, state: model.createState(), payload: { text, photos: [...photos], skill } };
      const time = element('p', 'appraisal-time');
      time.textContent = `今天 ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}`;
      turn.node.append(time);
      photos.forEach(photo => { if (photo.url.startsWith('blob:')) ownedUrls.add(photo.url); });
      if (photos.length) turn.node.append(makeMedia(photos));
      if (text.trim()) turn.node.append(element('p', 'appraisal-user-text', text.trim()));
      if (photos.length) turn.node.append(makeProcess(turn));
      else turn.node.append(element('p', 'appraisal-text-reply', '请上传商品照片，我会在这里展示处理过程与鉴定结论。'));
      if (photos.length) turns.add(turn);
      messages.append(turn.node);
      messages.scrollTop = Math.max(0, turn.node.offsetTop - messages.offsetTop);
      followTail = true;
      if (photos.length) begin(turn);
      return true;
    }
    function close() {
      closeViewer();
      stopClock();
      if (active) {
        const turn = active;
        active = null;
        turn.abort.abort();
        model.applyEvent(turn.state, { type: 'stop' });
        updateProcess(turn);
        setProcessExpanded(turn, false);
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
      turns.clear();
      messages.replaceChildren();
      announce.textContent = '';
    }
    root.addEventListener('pagehide', reset);
    return { send, close, reset, get busy() { return busy; } };
  }
  root.AppraisalConversation = Object.freeze({ create });
})(window);
