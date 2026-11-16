(function (root) {
  'use strict';

  const DURATION_MS = 40000;
  // Screenshot fixtures for the interaction replica, never a real tool trace.
  const STEPS = Object.freeze([
    { at: 0, title: 'sandbox {"lifecycle":"turn","mode":"new","pr…', detail: '演示记录：建立鉴定会话，准备本次图片。' },
    { at: 3000, title: '思考了 3 秒', detail: '演示记录：整理上传图片，确认可见的商品信息。' },
    { at: 6000, title: '阅读了 skill 的第 1-127 行', detail: '演示记录：查看美妆品类的图片要求。' },
    { at: 9000, title: '阅读了 skill 的第 1-127 行', detail: '演示记录：查看商品点位与图像清晰度要求。' },
    { at: 12000, title: '读取 {"path":"skills/jianx-ai-appraisal-b…', detail: '演示记录：准备粉扑、内托、底部和正面的点位信息。' },
    { at: 16000, title: '思考了 4 秒', detail: '演示记录：整理不同点位的可见信息。' },
    { at: 20000, title: '阅读了 skill', detail: '演示记录：查看点位结果的展示格式。' },
    { at: 24000, title: '思考了 4 秒', detail: '演示记录：汇总点位分数与照片拍摄条件。' },
    { at: 28000, title: '阅读了 skill', detail: '演示记录：准备结论和补拍建议。' },
    { at: 32000, title: '思考了 1 秒', detail: '演示记录：检查结果表格和商品信息。' },
    { at: 35000, title: '阅读了 skill', detail: '演示记录：准备展示截图中的示范报告。' },
    { at: 38000, title: '思考了 2 秒', detail: '演示记录：完成报告排版。' }
  ]);

  function sampleReportHTML() {
    return `<p class="appraisal-demo-note">示例结果，非本次图片的真实鉴定</p>
      <h2>AI 鉴定结果：真（正品置信度 65 分）</h2>
      <p><strong>识别信息：</strong>美妆 · 圣罗兰 YSL · 皮革气垫（LE CUSHION ENCRE DE PEAU，色号 20，批号 78Z33X，韩国制） | 鉴鉴单号 GCCCMT74DB</p>
      <h3>各点位明细</h3>
      <table><caption class="appraisal-sr-only">截图示例的商品点位鉴定结果</caption><thead><tr><th scope="col">点位</th><th scope="col">结论</th><th scope="col">符合度</th></tr></thead><tbody>
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
        dialog.querySelector('.appraisal-photo-navigation span').textContent = photos[index].sample ? '截图示例照片' : `照片 ${index + 1}`;
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
    function activeSummary(elapsed) {
      if (elapsed < 12000) return '正在查看商品照片中的包装、标识与可见点位。';
      if (elapsed < 24000) return '正在整理粉扑、内托、底部标签与气垫正面的示例信息。';
      if (elapsed < 35000) return '正在汇总点位结果，整理反光、清晰度等拍摄条件说明。';
      return '正在生成点位明细表和结论，随后展示补拍建议。';
    }
    function makeProcess(turn) {
      const process = doc.createElement('details');
      process.className = 'appraisal-process';
      process.open = true;
      const summary = doc.createElement('summary');
      summary.className = 'appraisal-process-summary';
      const elapsed = doc.createElement('span');
      elapsed.className = 'appraisal-elapsed';
      elapsed.textContent = '处理过程';
      const demo = doc.createElement('span');
      demo.className = 'appraisal-process-demo';
      demo.textContent = '演示';
      summary.append(elapsed, demo);
      process.append(summary);
      const timeline = doc.createElement('div');
      timeline.className = 'appraisal-timeline';
      turn.steps = STEPS.map(step => {
        const row = doc.createElement('details');
        row.className = 'appraisal-step';
        row.hidden = true;
        const head = doc.createElement('summary');
        const label = doc.createElement('span');
        label.textContent = step.title;
        head.append(label);
        const detail = doc.createElement('p');
        detail.textContent = step.detail;
        row.append(head, detail);
        timeline.append(row);
        return row;
      });
      const thinking = doc.createElement('details');
      thinking.className = 'appraisal-thinking';
      thinking.open = true;
      thinking.innerHTML = '<summary><span>正在思考</span><i class="appraisal-thinking-dots" aria-hidden="true"><i></i><i></i><i></i></i></summary><p></p>';
      timeline.append(thinking);
      process.append(timeline);
      Object.assign(turn, { process, elapsed, thinking });
      return process;
    }
    function tick() {
      if (!active || !busy) return;
      const turn = active;
      const elapsed = Math.min(Date.now() - turn.startedAt, DURATION_MS);
      const keepFollowing = followTail;
      turn.elapsed.textContent = `已用 ${Math.floor(elapsed / 1000)} 秒`;
      turn.steps.forEach((step, index) => { step.hidden = elapsed < STEPS[index].at; });
      turn.thinking.querySelector('p').textContent = activeSummary(elapsed);
      if (elapsed >= DURATION_MS) {
        stopClock();
        turn.thinking.hidden = true;
        turn.elapsed.textContent = 'Worked for 40s';
        turn.process.classList.add('is-complete');
        const result = doc.createElement('article');
        result.className = 'appraisal-result';
        result.setAttribute('aria-label', '示例鉴定结论');
        result.tabIndex = -1;
        result.innerHTML = sampleReportHTML();
        turn.node.append(result);
        setBusy(false);
        active = null;
        announce.textContent = '处理演示完成，示例鉴定结论已生成。';
        if (keepFollowing) messages.scrollTop = Math.max(0, result.offsetTop - messages.offsetTop - 14);
        return;
      }
      // Keep the uploaded image visible initially, then only follow new rows when
      // the reader is already at the end. Never pull a reader out of older text.
      if (keepFollowing && elapsed > 3000) messages.scrollTop = messages.scrollHeight;
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
        announce.textContent = '已接收照片，开始 40 秒交互演示。图片仅在本机预览。';
        tick();
        timer = root.setInterval(tick, 500);
      }
      return true;
    }
    function close() {
      closeViewer();
      stopClock();
      if (active) {
        active.thinking.hidden = true;
        active.elapsed.textContent = '已停止';
        active.process.classList.add('is-stopped');
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

  root.AppraisalConversation = Object.freeze({ create, DURATION_MS, STEPS, sampleReportHTML });
})(window);
