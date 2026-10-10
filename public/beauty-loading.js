const tip = (id, category, title, body) => Object.freeze({ id, category, title, body });

export const BEAUTY_TIPS = Object.freeze([
  tip('hair-oil', '发型', '发尾也要精装修', '护发精油先在掌心抹开，再少量带过发中和发尾。发根今天不参加“加油”活动。'),
  tip('hair-comb', '发型', '顺毛需要点耐心', '梳头先从发尾慢慢解结，再往上梳。遇到打结别硬拉，头发也吃软不吃硬。'),
  tip('hair-detail', '发型', '精致从几缕开始', '先整理脸侧碎发，再调整发尾方向。有时候，精致感就藏在几缕听话的头发里。'),
  tip('brows-soft', '眉毛', '画眉不用盖章', '先补稀疏处，再顺着毛流轻画几笔。眉头少用力，存在感不用从这里拉满。'),
  tip('brows-pair', '眉毛', '两边眉毛是姐妹', '画完退远一点看整体。眉毛协调就好，不必为了追求复制粘贴，越补越浓。'),
  tip('brows-brush', '眉毛', '给眉毛梳个头', '眉笔画完，再用眉刷轻轻梳开。边界柔和一点，画过的痕迹就少一点。'),
  tip('eyes-shadow', '眼妆', '眼影也要分主次', '浅色铺底、深色少量加在眼尾，亮片留给想突出的地方。一盘眼影不用全员上岗。'),
  tip('eyes-line', '眼妆', '眼线先写短句', '先贴着睫毛根部画细线，眼尾一点点延长。手抖没关系，别一笔写成长篇小说。'),
  tip('eyes-lashes', '眼妆', '假睫毛先试个岗', '先比对眼长，再从假睫毛外侧少量修剪、试戴。尺寸合拍，才能自然上镜。'),
  tip('base-light', '底妆', '全脸不用加班', '粉底先薄铺，需要遮盖的位置再少量叠加。局部的小任务，不用让全脸一起加班。'),
  tip('base-shade', '底妆', '试色别只看手背', '把粉底少量试在下颌附近，再到自然光下看看。脸和脖子，最好能聊到一个色号上。'),
  tip('base-blush', '底妆', '腮红轻轻上线', '刷子蘸取后先抖掉余粉，再少量叠加。气色可以慢慢加，手重了还得申请撤回。'),
  tip('lips-volume', '唇妆', '口红也有音量键', '同一支口红，薄涂和叠涂能有不同感觉。先薄薄一层，今天的气场由你调音量。'),
  tip('lips-edge', '唇妆', '给唇边收个尾', '涂完用棉签整理一下边缘，再轻抿掉多余膏体。精致这件事，有时就差最后十秒。'),
  tip('lips-balance', '唇妆', '眼唇商量着来', '眼妆已经很闪，唇色可以柔和一点；想突出红唇，眼妆就留点白。镜头会更容易找到重点。'),
  tip('jewelry-balance', '配饰', '耳饰项链排个班', '耳饰醒目，就搭一条细项链；项链有存在感，耳钉就选小巧一点。今天谁闪，先商量好。'),
  tip('jewelry-metal', '配饰', '金属色先组个队', '不确定怎么搭时，先让耳饰和项链保持同色系。少纠结一个变量，出门就能快五分钟。'),
  tip('jewelry-reveal', '配饰', '戴好再拨一下头发', '戴完耳饰，把耳边头发轻轻拨开看看整体。认真挑的小亮点，值得拥有一个出镜位。'),
]);

/** Sample without modifying the shared copy pool or repeating a card within a run. */
export function selectBeautyTips(count = 5, random = Math.random) {
  if (!Number.isInteger(count) || count < 1 || count > BEAUTY_TIPS.length) throw new RangeError('卡片数量超出文案池范围');
  const pool = [...BEAUTY_TIPS];
  for (let index = pool.length - 1; index > 0; index--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('随机值需要在 0 至 1 之间');
    const swap = Math.floor(value * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, count);
}

export function getBeautyLoadingProgress(elapsed, duration = 15000) {
  if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('等待时长必须大于零');
  if (!Number.isFinite(elapsed)) throw new RangeError('等待时间必须是有限数字');
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  return Object.freeze({ progress, remaining: Math.ceil((1 - progress) * duration / 1000), complete: progress === 1 });
}

/** Timeline uses elapsed wall time, so manual gestures and background tabs cannot reset the deadline. */
export function createBeautyLoadingState({ duration = 15000, count = 5, now = 0, autoPlay = true } = {}) {
  getBeautyLoadingProgress(0, duration);
  if (!Number.isFinite(now) || !Number.isInteger(count) || count < 1) throw new RangeError('无效的轮播参数');
  const started = now;
  const interval = 3000;
  let index = 0;
  let paused = !autoPlay;
  let nextAt = now + interval;
  const snapshot = time => ({ index, paused, ...getBeautyLoadingProgress(time - started, duration) });
  return {
    snapshot,
    tick(time) {
      const value = snapshot(time);
      if (!value.complete && !paused && time >= nextAt) {
        const steps = Math.floor((time - nextAt) / interval) + 1;
        index = (index + steps) % count;
        nextAt += steps * interval;
      }
      return snapshot(time);
    },
    select(next, time) {
      if (!Number.isInteger(next)) throw new RangeError('无效的卡片序号');
      index = ((next % count) + count) % count;
      nextAt = time + interval;
      return snapshot(time);
    },
    pause(value, time) {
      paused = Boolean(value);
      nextAt = time + interval;
      return snapshot(time);
    },
  };
}

const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const icons = {
  '发型':'<path d="M14 8c-5 0-8 4-8 9 0 7 5 10 5 16m7-25c5 0 8 4 8 9 0 7-5 10-5 16M13 13c-2 5 2 8 0 13m5-13c2 5-2 8 0 13"/>',
  '眉毛':'<path d="M5 17c6-8 15-8 22-4M6 22c5-5 11-6 17-4M7 28l3-4m2 3 3-4m2 3 3-4"/>',
  '眼妆':'<path d="M3 21s5-8 13-8 13 8 13 8-5 8-13 8S3 21 3 21Z"/><circle cx="16" cy="21" r="4"/><path d="m7 10 2 4m7-7v6m9-3-2 4"/>',
  '底妆':'<rect x="5" y="11" width="22" height="22" rx="8"/><path d="M6 20h20M12 9V5h8v4"/><circle cx="16" cy="26" r="3"/>',
  '唇妆':'<path d="M10 20V10l9-5v15M8 20h14v13H8Z"/><path d="M10 13h9m-9 11h10"/>',
  '配饰':'<path d="M6 7c0 14 5 20 10 23 5-3 10-9 10-23"/><path d="m16 25 4 5-4 5-4-5Z"/><circle cx="6" cy="7" r="2"/><circle cx="26" cy="7" r="2"/>',
};
const icon = category => `<svg viewBox="0 0 32 40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[category]}</svg>`;
const arrow = direction => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${direction === 'left' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}"/></svg>`;
const sparkle = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="m20 4 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" stroke="currentColor" stroke-width="1.2"/><path d="m20 12 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="currentColor"/></svg>';

export function mountBeautyLoading(container, { photo = '', onComplete = () => {}, reducedMotion = false, duration = 15000 } = {}) {
  if (!container?.ownerDocument) throw new TypeError('缺少等待界面容器');
  const document = container.ownerDocument;
  const window = document.defaultView;
  const clock = () => window.performance.now();
  const state = createBeautyLoadingState({ duration, now: clock(), autoPlay: !reducedMotion });
  const cards = selectBeautyTips();
  const listeners = [];
  let alive = true;
  let frame = 0;
  let completionTimer = 0;
  let lastIndex = -1;
  let lastRemaining = -1;
  let gesture = null;
  let lastStage = '';
  container.classList.add('beauty-loading-v22');
  container.classList.toggle('is-reduced-motion', reducedMotion);
  container.innerHTML = `
    <header class="beauty-loading-header">
      <span class="beauty-loading-photo">${sparkle}<img alt="你上传的照片" hidden></span>
      <div><span class="beauty-loading-eyebrow">你的专属报告</span><h1>正在生成你的颜值报告</h1></div>
    </header>
    <div class="beauty-loading-intro"><span class="beauty-loading-spark">${sparkle}</span><h2>等一会儿，<br><em>变美先学一招</em></h2><p>把等待的时间，留给一点小灵感</p></div>
    <div class="beauty-loading-carousel" role="region" aria-roledescription="轮播" aria-label="变美小知识，可左右滑动切换" tabindex="0">
      ${cards.map((card, index) => `<article class="beauty-loading-card" role="group" aria-roledescription="卡片" aria-label="${index + 1} / ${cards.length}：${esc(card.title)}" data-card="${index}">
        <div class="beauty-loading-card-meta"><span>${esc(card.category)}灵感</span><small>${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}</small></div>
        <div class="beauty-loading-tip-icon">${icon(card.category)}</div>
        <h3>${esc(card.title)}</h3><p>${esc(card.body)}</p><span class="beauty-loading-card-foot">小技巧，大加分<span aria-hidden="true">✧</span></span>
      </article>`).join('')}
    </div>
    <div class="beauty-loading-controls">
      <button type="button" class="beauty-loading-arrow" data-loading="previous" aria-label="上一条技巧">${arrow('left')}</button>
      <div class="beauty-loading-dots" aria-label="选择技巧">${cards.map((card, index) => `<button type="button" data-loading="select" data-index="${index}" aria-label="第 ${index + 1} 条：${esc(card.title)}"><i></i></button>`).join('')}</div>
      <button type="button" class="beauty-loading-arrow" data-loading="next" aria-label="下一条技巧">${arrow('right')}</button>
    </div>
    <div class="beauty-loading-mode"><span>左右滑动，发现更多灵感</span><button type="button" data-loading="pause"${reducedMotion ? ' hidden' : ''}>暂停轮播</button></div>
    <footer class="beauty-loading-progress"><div><span data-loading-stage>正在整理照片</span><span>还需约 <b data-loading-seconds>15</b> 秒</span></div><div class="beauty-loading-track" role="progressbar" aria-label="报告生成进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div></footer>
    <button class="beauty-loading-cancel" type="button" data-action="cancel-scan">取消生成</button>
    <span class="beauty-loading-announcement" role="status" aria-live="polite" aria-atomic="true"></span>`;
  const query = selector => container.querySelector(selector);
  const carousel = query('.beauty-loading-carousel');
  const cardEls = Array.from(container.querySelectorAll('[data-card]'));
  const dots = Array.from(container.querySelectorAll('[data-loading="select"]'));
  const pauseButton = query('[data-loading="pause"]');
  const progressBar = query('[role="progressbar"]');
  const progressFill = query('.beauty-loading-track i');
  const seconds = query('[data-loading-seconds]');
  const stage = query('[data-loading-stage]');
  const announcement = query('.beauty-loading-announcement');
  const listen = (node, event, fn, options) => { node.addEventListener(event, fn, options); listeners.push(() => node.removeEventListener(event, fn, options)); };

  function setPhoto(source) {
    if (!alive) return;
    const image = query('.beauty-loading-photo img');
    image.hidden = !source;
    if (source) image.src = source;
    else image.removeAttribute('src');
  }
  function draw(value, announce = false) {
    if (!alive) return;
    if (value.index !== lastIndex) {
      lastIndex = value.index;
      for (let index = 0; index < cards.length; index++) {
        const offset = (index - value.index + cards.length) % cards.length;
        cardEls[index].dataset.position = offset === 0 ? 'active' : offset === 1 ? 'next' : offset === cards.length - 1 ? 'previous' : 'away';
        cardEls[index].setAttribute('aria-hidden', String(offset !== 0));
        dots[index].setAttribute('aria-current', offset === 0 ? 'true' : 'false');
      }
    }
    if (announce) announcement.textContent = `${value.index + 1} / ${cards.length}，${cards[value.index].title}。${cards[value.index].body}`;
    progressFill.style.transform = `scaleX(${value.progress})`;
    if (value.remaining !== lastRemaining) {
      lastRemaining = value.remaining;
      seconds.textContent = String(value.remaining);
      progressBar.setAttribute('aria-valuenow', String(Math.round(value.progress * 100)));
    }
    const nextStage = value.progress < .25 ? '正在整理照片' : value.progress < .8 ? '正在生成专属报告' : '你的报告即将呈现';
    if (nextStage !== lastStage) { stage.textContent = nextStage; lastStage = nextStage; }
    pauseButton.textContent = value.paused ? '继续轮播' : '暂停轮播';
    pauseButton.setAttribute('aria-pressed', String(value.paused));
  }
  function destroy() {
    if (!alive) return;
    alive = false;
    window.cancelAnimationFrame(frame);
    window.clearTimeout(completionTimer);
    listeners.splice(0).forEach(remove => remove());
    if (gesture?.id != null && carousel.hasPointerCapture?.(gesture.id)) carousel.releasePointerCapture(gesture.id);
    gesture = null;
  }
  function finish() {
    if (!alive) return;
    draw(state.snapshot(clock()));
    destroy();
    onComplete();
  }
  function tick() {
    if (!alive) return;
    const value = state.tick(clock());
    draw(value);
    if (value.complete) { finish(); return; }
    frame = window.requestAnimationFrame(tick);
  }
  function choose(index) { draw(state.select(index, clock()), true); }
  function next(direction) { choose(state.snapshot(clock()).index + direction); }
  function startGesture(x, y, id) { gesture = { x, y, id, at: clock() }; }
  function endGesture(x, y) {
    if (!gesture) return;
    const dx = x - gesture.x;
    const dy = y - gesture.y;
    const valid = Math.abs(dx) >= 35 && Math.abs(dx) > Math.abs(dy) * 1.4 && clock() - gesture.at < 1600;
    gesture = null;
    if (valid) next(dx < 0 ? 1 : -1);
  }
  listen(container, 'click', event => {
    const button = event.target.closest?.('[data-loading]');
    if (!button || !container.contains(button)) return;
    if (button.dataset.loading === 'previous') next(-1);
    if (button.dataset.loading === 'next') next(1);
    if (button.dataset.loading === 'select') choose(Number(button.dataset.index));
    if (button.dataset.loading === 'pause' && !reducedMotion) draw(state.pause(!state.snapshot(clock()).paused, clock()));
  });
  listen(carousel, 'keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') next(-1);
    if (event.key === 'ArrowRight') next(1);
    if (event.key === 'Home') choose(0);
    if (event.key === 'End') choose(cards.length - 1);
  });
  if (window.PointerEvent) {
    listen(carousel, 'pointerdown', event => {
      if (event.isPrimary === false || event.button > 0) return;
      startGesture(event.clientX, event.clientY, event.pointerId);
      carousel.setPointerCapture?.(event.pointerId);
    });
    listen(carousel, 'pointerup', event => {
      if (gesture?.id !== event.pointerId) return;
      endGesture(event.clientX, event.clientY);
      if (carousel.hasPointerCapture?.(event.pointerId)) carousel.releasePointerCapture(event.pointerId);
    });
    listen(carousel, 'pointercancel', () => { gesture = null; });
    listen(carousel, 'lostpointercapture', event => { if (gesture?.id === event.pointerId) gesture = null; });
  } else {
    listen(carousel, 'touchstart', event => {
      if (event.touches.length !== 1) { gesture = null; return; }
      const touch = event.touches[0];
      startGesture(touch.clientX, touch.clientY, touch.identifier);
    }, { passive: true });
    listen(carousel, 'touchend', event => {
      const touch = Array.from(event.changedTouches).find(item => item.identifier === gesture?.id);
      if (touch) endGesture(touch.clientX, touch.clientY);
    }, { passive: true });
    listen(carousel, 'touchcancel', () => { gesture = null; }, { passive: true });
  }
  listen(document, 'visibilitychange', () => {
    if (!document.hidden && alive) {
      const value = state.tick(clock());
      draw(value);
      if (value.complete) finish();
    }
  });
  setPhoto(photo);
  draw(state.snapshot(clock()));
  completionTimer = window.setTimeout(finish, duration);
  frame = window.requestAnimationFrame(tick);
  return { destroy, setPhoto };
}
