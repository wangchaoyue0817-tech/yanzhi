import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { TIERS, PRODUCTS, createReport } from '../public/beauty-model.js';

const controller = readFileSync(new URL('../public/beauty-analysis.js', import.meta.url), 'utf8');
const areaIds = ['hair', 'brows', 'eyes', 'skin', 'lips', 'style'];
const photoPair = () => ({ before: 'before-photo', after: 'after-photo', parts: Object.fromEntries(areaIds.map(id => [id, { before: `${id}-before`, after: `${id}-after` }])) });
const attrs = source => Object.fromEntries([...source.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(match => [match[1], match[2] ?? match[3] ?? match[4] ?? '']));
const tags = source => [...source.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*?)>/gi)].map(match => ({ tag: match[1], ...attrs(match[2]) }));

function readerHarness({ reducedMotion = false, withHistory = true } = {}) {
  const nodes = new Map(), documentHandlers = new Map(), windowHandlers = new Map(), timers = new Map(), frames = new Map();
  const effects = { celebrations: [], stopped: 0, history: [], posterRequests: [] };
  let document, timerSequence = 0, frameSequence = 0, now = 1000;
  const node = id => {
    if (!nodes.has(id)) {
      const attributes = {}, classes = new Set(), handlers = new Map();
      let markup = '';
      const el = {
        id, dataset: {}, hidden: true, inert: false, scrollTop: 0, value: '', style: {}, textContent: '', isConnected: true, tabIndex: 0, handlers, renderCount: 0,
        classList: {
          add(...values) { values.forEach(value => classes.add(value)); },
          remove(...values) { values.forEach(value => classes.delete(value)); },
          contains(value) { return classes.has(value); },
          toggle(value, force) { const add = force ?? !classes.has(value); if (add) classes.add(value); else classes.delete(value); return add; },
        },
        addEventListener(type, fn) { handlers.set(type, fn); },
        setAttribute(name, value) { attributes[name] = String(value); },
        getAttribute(name) { return attributes[name]; },
        hasAttribute(name) { return Object.hasOwn(attributes, name); },
        querySelector(selector) { return node(`${id}:${selector}`); },
        querySelectorAll(selector) {
          if (id === 'beautyReport' && selector === '[data-count]') return tags(markup).filter(tag => Object.hasOwn(tag, 'data-count')).map((tag, index) => {
            const counter = node(`counter-${index}`); counter.dataset.count = tag['data-count']; return counter;
          });
          return [];
        },
        getBoundingClientRect() { return { top: 0, left: 0, right: 390, width: 390, height: 844 }; },
        focus(options) { document.activeElement = this; this.focusOptions = options; },
        scrollTo(options) { this.scrollTop = options.top; },
        closest() { return null; }, getClientRects() { return [{}]; },
      };
      Object.defineProperty(el, 'innerHTML', {
        get() { return markup; },
        set(value) {
          markup = value; el.renderCount++;
          for (const tag of tags(value).filter(tag => tag.id)) {
            const child = node(tag.id);
            child.hidden = Object.hasOwn(tag, 'hidden');
            child.tabIndex = Number(tag.tabindex ?? 0);
            for (const [key, val] of Object.entries(tag)) {
              child.setAttribute(key, val);
              if (key.startsWith('data-')) child.dataset[key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = val;
            }
          }
        },
      });
      nodes.set(id, el);
    }
    return nodes.get(id);
  };
  document = { getElementById: node, querySelector: selector => node(selector), addEventListener(type, fn) { documentHandlers.set(type, fn); }, activeElement: null };
  const history = {
    entries: [{ homepage: 'preserved' }], index: 0, pendingBack: false,
    get state() { return this.entries[this.index]; },
    pushState(state) { this.entries = this.entries.slice(0, this.index + 1); this.entries.push(state); this.index++; effects.history.push('push'); },
    replaceState(state) { this.entries[this.index] = state; effects.history.push('replace'); },
    back() { this.pendingBack = true; effects.history.push('back'); },
    completeBack() { if (!this.pendingBack) return; this.pendingBack = false; this.index = Math.max(0, this.index - 1); this.dispatch(); },
    forward() { this.index = Math.min(this.entries.length - 1, this.index + 1); this.dispatch(); },
    dispatch() { windowHandlers.get('popstate')?.({ state: this.state, stopImmediatePropagation() { effects.history.push('stop-propagation'); } }); },
  };
  const api = runInNewContext(controller.replace(/^import .*;$/gm, '') + `
    ({ show:showReport, openReader, closeReader, selectChapter, selectArea, reset:resetEntry,
       openSheet, closeSheet, poster:posterSheet, detail:detailSheet,
       state(){ return { reader, currentReport, photos, readerToken, readerBackPending, frameCount:frames.size }; } });
  `, {
    document, TIERS, PRODUCTS, createReport, window: { addEventListener(type, fn) { windowHandlers.set(type, fn); } },
    ...(withHistory ? { history } : {}), location: { search: '' }, URLSearchParams,
    matchMedia: () => ({ matches: reducedMotion, addEventListener() {} }),
    Date: { now: () => now }, URL: { createObjectURL: () => 'blob:poster', revokeObjectURL() {} },
    setTimeout(fn, delay) { const id = ++timerSequence; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++frameSequence; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    startBeautyCelebration(options) { effects.celebrations.push(options); let stopped = false; return () => { if (!stopped) { effects.stopped++; stopped = true; } }; },
    renderBeautyPoster(options) { effects.posterRequests.push(options); return Promise.resolve({ blob: { type: 'image/png' } }); },
  });
  node('beautyPage').hidden = false;
  const dispatch = (type, event) => node('beautyPage').handlers.get(type)?.(event);
  const click = dataset => dispatch('click', { target: { closest: () => ({ dataset, hasAttribute: () => false }) } });
  const key = (key, target, extra = {}) => {
    const event = { key, target, prevented: false, preventDefault() { this.prevented = true; }, ...extra };
    documentHandlers.get('keydown')(event); return event;
  };
  const pointerTarget = ({ control = false, outside = false } = {}) => ({ closest: selector => selector === '#beautyDetail' ? (outside ? null : node('beautyDetail')) : control ? node('some-button') : null });
  const swipe = ({ fromX = 260, toX = 110, fromY = 320, toY = 322, duration = 100, scrollDelta = 0, id = 1, endId = id, cancel = false, control = false, outside = false, primary = true, pointerType = 'touch', button = 0 } = {}) => {
    const target = pointerTarget({ control, outside });
    dispatch('pointerdown', { target, pointerId: id, clientX: fromX, clientY: fromY, isPrimary: primary, pointerType, button });
    now += duration;
    node('beautyScroll').scrollTop += scrollDelta;
    if (cancel) dispatch('pointercancel', {});
    dispatch('pointerup', { target, pointerId: endId, clientX: toX, clientY: toY });
  };
  const runDelay = delay => { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); } };
  return { api, node, effects, document, documentHandlers, windowHandlers, history, timers, frames, click, key, swipe, dispatch, pointerTarget, runDelay };
}

function show(harness, score = 90) {
  const report = createReport(score), photos = photoPair();
  harness.api.show(report, photos);
  return { report, photos };
}

function assertOnlyArea(harness, active) {
  for (const id of areaIds) {
    const tab = harness.node(`beautyAreaTab-${id}`);
    assert.equal(harness.node(`beautyArea-${id}`).hidden, id !== active, `${id}: only one area is visible`);
    assert.equal(tab.getAttribute('aria-selected'), String(id === active));
    assert.equal(tab.tabIndex, id === active ? 0 : -1);
  }
}

test('all five tiers have one short cover, one preview, two chapters and one prioritized area', () => {
  for (const [tierIndex, tier] of TIERS.entries()) {
    const h = readerHarness({ reducedMotion: true });
    const { report } = show(h, tier.sampleScore);
    const html = h.node('beautyReport').innerHTML;
    const cover = html.slice(0, html.indexOf('<div id="beautyDetail"'));
    const priority = ['brows', 'eyes', 'hair', 'hair', 'style'][tierIndex];
    assert.equal(h.node('beautyCover').hidden, false);
    assert.equal(h.node('beautyDetail').hidden, true);
    assert.doesNotMatch(cover, /beauty-inline-steps|beauty-area-pair|beauty-radar|beauty-product-compact/);
    assert.equal((cover.match(/data-action="open-report"/g) ?? []).length, 1);
    assert.equal((cover.match(/data-action="poster"/g) ?? []).length, 1);
    assert.match(cover, new RegExp(`预计 ${report.afterScore} 分`));
    assert.ok(cover.includes(report.score >= 85 ? '看看你的封面状态' : '看看更出彩的我'));
    const renderedIds = tags(html).filter(tag => tag.id).map(tag => tag.id);
    assert.equal(new Set(renderedIds).size, renderedIds.length, 'chapter and area panels have unique DOM IDs');
    assert.equal(tags(html).filter(tag => tag['data-report-tab']).length, 2);
    assert.equal(tags(html).filter(tag => tag['data-area-tab']).length, 6);
    assert.equal((html.match(/建议先看/g) ?? []).length, 1);
    assert.equal(h.api.state().reader.area, priority);
    assertOnlyArea(h, priority);
    assert.equal(h.node('beautyOverview').hidden, false);
    assert.equal(h.node('beautyAdvice').hidden, true);
  }
});

test('opening, returning and reopening preserves DOM, report facts, photos, cover and chapter positions', () => {
  const h = readerHarness({ withHistory: false });
  const original = show(h), state = h.api.state(), renderCount = h.node('beautyReport').renderCount, frames = h.frames.size;
  h.node('beautyScroll').scrollTop = 27;
  h.click({ action: 'open-report' });
  assert.equal(h.api.state().reader.open, true);
  assert.equal(h.node('beautyCover').hidden, true);
  assert.equal(h.node('beautyDetail').hidden, false);
  assert.ok(h.node('beautyPage').classList.contains('is-reading'));
  assert.equal(h.document.activeElement.id, 'beautyTab-overview');
  assert.equal(h.node('beautyScroll').scrollTop, 0);
  h.node('beautyScroll').scrollTop = 251;
  h.click({ reportTab: 'advice' });
  assert.equal(h.node('beautyScroll').scrollTop, 0);
  assert.equal(h.node('beautyOverview').hidden, true);
  assert.equal(h.node('beautyAdvice').hidden, false);
  assert.equal(h.node('beautyTab-advice').getAttribute('aria-selected'), 'true');
  assert.equal(h.node('beautyTab-overview').tabIndex, -1);
  assert.equal(h.node('beautyReaderProgress').textContent, '02 / 02 · 左右滑动切换章节');
  h.node('beautyScroll').scrollTop = 110;
  h.click({ areaTab: 'lips' });
  assertOnlyArea(h, 'lips');
  h.node('beautyScroll').scrollTop = 175;
  h.click({ action: 'report-back' });
  assert.equal(h.node('beautyScroll').scrollTop, 27);
  assert.equal(h.document.activeElement.id, 'beautyOpenReport');
  assert.equal(h.node('beautyCover').hidden, false);
  assert.equal(h.node('beautyDetail').hidden, true);
  h.click({ action: 'open-report' });
  assert.equal(h.node('beautyScroll').scrollTop, 175);
  assert.equal(h.api.state().reader.tab, 'advice');
  assertOnlyArea(h, 'lips');
  h.click({ areaTab: 'hair' });
  assert.equal(h.node('beautyScroll').scrollTop, 110);
  h.click({ reportTab: 'overview' });
  assert.equal(h.node('beautyScroll').scrollTop, 251);
  assert.equal(h.node('beautyReport').renderCount, renderCount, 'navigation never reconstructs the report');
  assert.ok(h.frames.size <= frames, 'navigation schedules no new score count');
  assert.equal(h.api.state().currentReport, original.report);
  assert.equal(h.api.state().photos, original.photos);
  assert.equal(h.api.state().readerToken, state.readerToken);
});

test('reader controls validate IDs and do not enter or mutate a missing/closed report', () => {
  const h = readerHarness({ withHistory: false });
  h.api.openReader();
  assert.equal(h.api.state().reader.open, false);
  show(h);
  h.api.selectChapter('advice'); h.api.selectArea('lips');
  assert.equal(h.api.state().reader.tab, 'overview');
  assert.equal(h.api.state().reader.area, 'hair');
  h.api.openReader(); h.api.selectArea('lips');
  assert.equal(h.api.state().reader.area, 'hair', 'area changes require the advice chapter');
  h.api.selectChapter('missing');
  assert.equal(h.api.state().reader.tab, 'overview');
  h.api.selectChapter('advice'); h.api.selectArea('<script>');
  assertOnlyArea(h, 'hair');
  h.node('beautyScroll').scrollTop = 88;
  h.api.selectChapter('overview');
  h.click({ action: 'read-advice' });
  assert.equal(h.api.state().reader.tab, 'advice');
  assert.equal(h.node('beautyScroll').scrollTop, 0, 'the explicit next-chapter CTA starts at its top');
});

test('the next-chapter CTA opens its named priority area even after the reader explored another part', () => {
  for (const [score, priority, other] of [[52, 'brows', 'lips'], [90, 'hair', 'eyes'], [97, 'style', 'skin']]) {
    const h = readerHarness({ withHistory: false }); show(h, score); h.api.openReader();
    h.api.selectChapter('advice');
    h.node('beautyScroll').scrollTop = 150;
    h.api.selectArea(other); h.node('beautyScroll').scrollTop = 215;
    h.api.selectChapter('overview');
    h.click({ action: 'read-advice' });
    assert.equal(h.api.state().reader.tab, 'advice');
    assertOnlyArea(h, priority);
    assert.equal(h.node('beautyScroll').scrollTop, 0, 'the promised guidance starts at the top, including previously visited priority areas');
    assert.equal(h.api.state().reader.positions['advice:' + other], 215, 'the separately explored area retains its position');
  }
});

test('browser back/forward uses one reader history entry and keeps the selected area and scroll position', () => {
  const h = readerHarness(); show(h);
  h.node('beautyScroll').scrollTop = 12;
  h.api.openReader(); h.api.openReader();
  assert.equal(h.effects.history.filter(value => value === 'push').length, 1);
  assert.equal(h.history.state.homepage, 'preserved');
  assert.equal(h.history.state.beautyReader, h.api.state().readerToken);
  h.api.selectChapter('advice'); h.api.selectArea('eyes'); h.node('beautyScroll').scrollTop = 190;
  h.api.closeReader(); h.api.closeReader();
  assert.equal(h.effects.history.filter(value => value === 'back').length, 1, 'rapid repeated back clicks do not leave the site');
  assert.equal(h.api.state().readerBackPending, true);
  h.history.completeBack();
  assert.equal(h.api.state().readerBackPending, false);
  assert.equal(h.api.state().reader.open, false);
  assert.equal(h.node('beautyScroll').scrollTop, 12);
  assert.equal(h.history.state.homepage, 'preserved');
  h.history.forward();
  assert.equal(h.api.state().reader.open, true);
  assert.equal(h.api.state().reader.area, 'eyes');
  assert.equal(h.node('beautyScroll').scrollTop, 190);
  assert.equal(h.effects.history.filter(value => value === 'push').length, 1, 'forward navigation does not push another entry');
});

test('scene replacement invalidates stale reader history without losing other history state', () => {
  const h = readerHarness(); show(h);
  h.api.openReader(); const oldToken = h.api.state().readerToken;
  h.api.selectChapter('advice'); h.api.selectArea('lips');
  show(h, 52);
  assert.notEqual(h.api.state().readerToken, oldToken);
  assert.equal(h.api.state().reader.open, false);
  assert.equal(h.api.state().reader.tab, 'overview');
  assert.equal(h.api.state().reader.area, 'brows');
  assert.equal(h.history.state.beautyReader, undefined);
  assert.equal(h.history.state.homepage, 'preserved');
  assert.equal(h.node('beautyPage').classList.contains('is-reading'), false);
  h.windowHandlers.get('popstate')({ state: { beautyReader: oldToken } });
  assert.equal(h.api.state().reader.open, false, 'a previous report cannot reopen its stale reader');
});

test('product sheet close and Escape preserve the current area, scroll position, and report DOM', () => {
  const h = readerHarness({ withHistory: false }); show(h);
  h.api.openReader(); h.api.selectChapter('advice'); h.api.selectArea('lips');
  h.node('beautyScroll').scrollTop = 202;
  const markup = h.node('beautyReport').innerHTML;
  const productButton = h.node('lip-product-button'); h.document.activeElement = productButton;
  h.click({ productDetail: PRODUCTS[0].id });
  assert.equal(h.node('beautyOverlay').hidden, false);
  assert.equal(h.node('beautyScroll').inert, true);
  const key = h.key('Escape');
  assert.equal(key.prevented, true);
  assert.equal(h.node('beautyOverlay').hidden, true);
  assert.equal(h.node('beautyScroll').inert, false);
  assert.equal(h.api.state().reader.open, true);
  assertOnlyArea(h, 'lips');
  assert.equal(h.node('beautyScroll').scrollTop, 202);
  assert.equal(h.node('beautyReport').innerHTML, markup);
  assert.equal(h.document.activeElement, productButton);
  h.key('Escape');
  assert.equal(h.api.state().reader.open, false, 'Escape returns from the reader only after the sheet is dismissed');
});

test('browser back dismisses a product or poster sheet before leaving the reader', () => {
  for (const kind of ['product', 'poster']) {
    const h = readerHarness(); show(h); h.node('beautyScroll').scrollTop = 24;
    h.api.openReader(); h.api.selectChapter('advice'); h.api.selectArea('lips');
    h.node('beautyScroll').scrollTop = 202;
    const token = h.api.state().readerToken;
    const renders = h.node('beautyReport').renderCount;
    const opener = h.node(kind + '-opener'); h.document.activeElement = opener;
    h.api.openSheet(kind, '<p>Sheet contents</p>', kind);
    h.history.back(); h.history.completeBack();
    assert.equal(h.node('beautyOverlay').hidden, true, kind + ': first browser back closes only the sheet');
    assert.equal(h.node('beautyScroll').inert, false);
    assert.equal(h.document.activeElement, opener, 'browser back restores focus to the visible sheet opener');
    assert.equal(h.api.state().reader.open, true);
    assert.equal(h.api.state().reader.tab, 'advice');
    assertOnlyArea(h, 'lips');
    assert.equal(h.node('beautyScroll').scrollTop, 202);
    assert.equal(h.node('beautyReport').renderCount, renders);
    assert.equal(h.history.state.beautyReader, token, 'reader history is restored after consuming the sheet back');
    assert.equal(h.history.state.homepage, 'preserved');
    assert.equal(h.api.state().readerBackPending, false);
    h.history.back(); h.history.completeBack();
    assert.equal(h.api.state().reader.open, false, 'the next browser back returns to the cover');
    assert.equal(h.node('beautyCover').hidden, false);
    assert.equal(h.node('beautyDetail').hidden, true);
    assert.equal(h.node('beautyScroll').scrollTop, 24);
    h.history.forward();
    assert.equal(h.api.state().reader.open, true);
    assertOnlyArea(h, 'lips');
    assert.equal(h.node('beautyScroll').scrollTop, 202);
    assert.equal(h.node('beautyOverlay').hidden, true, 'forward returns to the report without reopening the old sheet');
  }
});

test('chapter and area keyboard tabs use a single roving focus and ignore arrows outside their tablists', () => {
  const h = readerHarness({ withHistory: false }); show(h); h.api.openReader();
  assert.equal(h.key('ArrowRight', h.node('beautyTab-overview')).prevented, true);
  assert.equal(h.api.state().reader.tab, 'advice');
  assert.equal(h.document.activeElement.id, 'beautyTab-advice');
  h.key('Home', h.node('beautyAreaTab-hair')); assertOnlyArea(h, 'hair');
  h.key('End', h.node('beautyAreaTab-hair')); assertOnlyArea(h, 'style');
  h.key('ArrowRight', h.node('beautyAreaTab-style')); assertOnlyArea(h, 'hair');
  h.key('ArrowLeft', h.node('beautyAreaTab-hair')); assertOnlyArea(h, 'style');
  assert.equal(h.document.activeElement.id, 'beautyAreaTab-style');
  const ordinary = h.key('ArrowLeft', { dataset: {} });
  assert.equal(ordinary.prevented, false);
  assert.equal(h.api.state().reader.tab, 'advice');
  h.key('Home', h.node('beautyTab-advice'));
  assert.equal(h.api.state().reader.tab, 'overview');
  h.key('End', h.node('beautyTab-overview'));
  assert.equal(h.api.state().reader.tab, 'advice');
  h.api.openSheet('Product', '<p>Details</p>', 'product');
  const blocked = h.key('ArrowLeft', h.node('beautyTab-advice'));
  assert.equal(blocked.prevented, false);
  assert.equal(h.api.state().reader.tab, 'advice', 'background tabs cannot change behind the modal');
});

test('horizontal swipes change only chapters and keep keyboard focus and selected advice area intact', () => {
  const h = readerHarness({ withHistory: false }); show(h); h.api.openReader();
  const focus = h.document.activeElement;
  h.swipe();
  assert.equal(h.api.state().reader.tab, 'advice');
  assert.equal(h.document.activeElement, focus, 'pointer navigation does not steal keyboard focus');
  h.api.selectArea('lips'); h.node('beautyScroll').scrollTop = 80;
  h.swipe({ fromX: 100, toX: 260 });
  assert.equal(h.api.state().reader.tab, 'overview');
  h.swipe();
  assert.equal(h.api.state().reader.tab, 'advice');
  assertOnlyArea(h, 'lips');
  assert.equal(h.node('beautyScroll').scrollTop, 80);
  h.swipe();
  assert.equal(h.api.state().reader.tab, 'advice', 'the final chapter does not cycle to another part');
});

test('swipe recognition rejects vertical scrolling, edge gestures, controls, cancellation and invalid pointers', () => {
  const cases = [
    { toX: 200 }, { toY: 460 }, { duration: 901 }, { scrollDelta: 21 }, { fromX: 23 }, { fromX: 369 },
    { control: true }, { outside: true }, { cancel: true }, { primary: false }, { pointerType: 'mouse', button: 2 }, { endId: 2 },
  ];
  for (const options of cases) {
    const h = readerHarness({ withHistory: false }); show(h); h.api.openReader();
    h.swipe(options);
    assert.equal(h.api.state().reader.tab, 'overview', JSON.stringify(options));
    h.dispatch('pointerup', { pointerId: 1, clientX: 60, clientY: 320 });
    assert.equal(h.api.state().reader.tab, 'overview', 'the completed/rejected gesture cannot be reused');
  }
  const h = readerHarness({ withHistory: false }); show(h);
  h.swipe(); assert.equal(h.api.state().reader.open, false, 'cover never handles detail gestures');
  h.api.openReader(); h.api.openSheet('Product', '<p>Details</p>', 'product');
  h.swipe(); assert.equal(h.api.state().reader.tab, 'overview', 'a modal blocks the background swipe');
});

test('entering the reader stops active celebration and suppresses a delayed reveal even after returning', () => {
  for (const timing of ['before-reveal', 'after-reveal', 'quick-return']) {
    const h = readerHarness({ withHistory: false }); show(h, 97);
    if (timing === 'after-reveal') h.runDelay(1200);
    h.api.openReader();
    if (timing === 'quick-return') h.api.closeReader();
    h.runDelay(1200);
    assert.equal(h.effects.celebrations.length, timing === 'after-reveal' ? 1 : 0, timing);
    assert.equal(h.effects.stopped, timing === 'after-reveal' ? 1 : 0, timing);
  }
});

test('sharing from the cover or any reader area exports the complete original report and all six image pairs', async () => {
  for (const scope of ['cover', 'overview', 'advice']) {
    const h = readerHarness({ withHistory: false });
    const { report, photos } = show(h, 80);
    if (scope !== 'cover') h.api.openReader();
    if (scope === 'advice') { h.api.selectChapter('advice'); h.api.selectArea('eyes'); }
    await h.click({ action: 'poster' });
    assert.equal(h.effects.posterRequests.length, 1);
    const request = h.effects.posterRequests[0];
    assert.equal(request.report, report); assert.equal(request.parts, photos.parts);
    assert.equal(Object.keys(request.parts).length, 6);
    assert.equal(request.beforeSrc, photos.before); assert.equal(request.afterSrc, photos.after);
    assert.equal(h.api.state().reader.open, scope !== 'cover');
    h.api.closeSheet();
    assert.equal(h.api.state().reader.tab, scope === 'advice' ? 'advice' : 'overview');
  }
});
