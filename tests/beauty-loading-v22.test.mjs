import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { BEAUTY_TIPS, selectBeautyTips, getBeautyLoadingProgress, createBeautyLoadingState, mountBeautyLoading } from '../public/beauty-loading.js';

test('copy pool contains eighteen distinct, immutable useful tips across all six areas', () => {
  assert.equal(BEAUTY_TIPS.length, 18);
  assert.equal(new Set(BEAUTY_TIPS.map(tip => tip.id)).size, 18);
  assert.equal(new Set(BEAUTY_TIPS.map(tip => tip.title)).size, 18);
  assert.deepEqual([...new Set(BEAUTY_TIPS.map(tip => tip.category))], ['发型', '眉毛', '眼妆', '底妆', '唇妆', '配饰']);
  for (const tip of BEAUTY_TIPS) {
    assert.ok(tip.title.length <= 12);
    assert.ok(tip.body.length >= 25 && tip.body.length <= 70);
    assert.ok(Object.isFrozen(tip));
  }
  assert.ok(Object.isFrozen(BEAUTY_TIPS));
  assert.match(BEAUTY_TIPS.find(tip => tip.id === 'eyes-lashes').body, /假睫毛/);
  assert.doesNotMatch(BEAUTY_TIPS.find(tip => tip.id === 'eyes-lashes').body, /睫毛膏/);
});

test('each run samples five nonrepeating cards without changing the pool', () => {
  const ids = BEAUTY_TIPS.map(tip => tip.id);
  for (const random of [() => 0, () => .5, () => .999999]) {
    const selected = selectBeautyTips(5, random);
    assert.equal(selected.length, 5);
    assert.equal(new Set(selected.map(tip => tip.id)).size, 5);
    assert.ok(selected.every(tip => BEAUTY_TIPS.includes(tip)));
  }
  assert.deepEqual(BEAUTY_TIPS.map(tip => tip.id), ids);
  assert.throws(() => selectBeautyTips(19), RangeError);
  assert.throws(() => selectBeautyTips(0), RangeError);
  assert.throws(() => selectBeautyTips(5, () => 1), RangeError);
});

test('fifteen-second progress has an exact deadline, bounded fraction and whole remaining seconds', () => {
  assert.deepEqual(getBeautyLoadingProgress(-1), { progress: 0, remaining: 15, complete: false });
  assert.deepEqual(getBeautyLoadingProgress(7500), { progress: .5, remaining: 8, complete: false });
  assert.equal(getBeautyLoadingProgress(14999).complete, false);
  assert.deepEqual(getBeautyLoadingProgress(15000), { progress: 1, remaining: 0, complete: true });
  assert.deepEqual(getBeautyLoadingProgress(20000), { progress: 1, remaining: 0, complete: true });
  for (const duration of [0, -1, Infinity, NaN]) assert.throws(() => getBeautyLoadingProgress(0, duration), RangeError);
});

test('automatic rotation advances every three seconds and catches up when the tab returns', () => {
  const state = createBeautyLoadingState({ now: 500 });
  assert.equal(state.tick(3499).index, 0);
  assert.equal(state.tick(3500).index, 1);
  assert.equal(state.tick(10500).index, 3);
  assert.equal(state.tick(12499).index, 3);
  assert.equal(state.tick(12500).index, 4);
  assert.equal(state.tick(15500).complete, true);
});

test('manual switching postpones card rotation without extending the generation deadline', () => {
  const state = createBeautyLoadingState();
  assert.equal(state.select(4, 2500).index, 4);
  assert.equal(state.tick(5000).index, 4);
  assert.equal(state.tick(5500).index, 0);
  assert.equal(state.select(-1, 9000).index, 4);
  assert.equal(state.select(5, 14000).index, 0);
  assert.equal(state.tick(15000).complete, true);
});

test('pause and reduced motion keep the timer running and permit manual navigation', () => {
  const state = createBeautyLoadingState({ autoPlay: false });
  assert.equal(state.tick(6000).index, 0);
  assert.equal(state.select(1, 8000).index, 1);
  assert.equal(state.tick(14000).index, 1);
  assert.equal(state.tick(15000).complete, true);
  const resumed = createBeautyLoadingState();
  resumed.pause(true, 2000);
  assert.equal(resumed.tick(8000).index, 0);
  resumed.pause(false, 9000);
  assert.equal(resumed.tick(11999).index, 0);
  assert.equal(resumed.tick(12000).index, 1);
  assert.equal(resumed.tick(15000).complete, true);
});

class Node {
  constructor() {
    this.listeners = new Map(); this.attrs = new Map(); this.dataset = {}; this.style = {}; this.hidden = false;
    this.classes = new Set(); this.classList = { add: value => this.classes.add(value), toggle: (value, on) => on ? this.classes.add(value) : this.classes.delete(value) };
  }
  addEventListener(name, callback) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(callback); }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
  emit(name, event = {}) { for (const callback of [...(this.listeners.get(name) || [])]) callback(event); }
  setAttribute(name, value) { this.attrs.set(name, value); }
  removeAttribute(name) { this.attrs.delete(name); }
  contains() { return true; }
  closest() { return this; }
  setPointerCapture(id) { this.pointer = id; }
  hasPointerCapture(id) { return this.pointer === id; }
  releasePointerCapture(id) { this.pointer = null; this.emit('lostpointercapture', { pointerId: id }); }
}

function harness(options = {}) {
  let time = 0, serial = 0;
  const frames = new Map(), timers = new Map(), document = new Node(), container = new Node();
  const nodes = new Map();
  const cards = Array.from({ length: 5 }, () => new Node());
  const dots = Array.from({ length: 5 }, () => new Node());
  document.hidden = false;
  document.defaultView = {
    performance: { now: () => time }, PointerEvent: class {},
    requestAnimationFrame: callback => { frames.set(++serial, callback); return serial; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (callback, delay) => { timers.set(++serial, { callback, at: time + delay }); return serial; },
    clearTimeout: id => timers.delete(id),
  };
  container.ownerDocument = document;
  container.querySelector = selector => { if (!nodes.has(selector)) nodes.set(selector, new Node()); return nodes.get(selector); };
  container.querySelectorAll = selector => selector === '[data-card]' ? cards : dots;
  let completed = 0;
  const loading = mountBeautyLoading(container, { onComplete: () => completed++, ...options });
  function advance(next, runTimers = true) {
    time = next;
    if (runTimers) for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.callback(); }
    const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time));
  }
  function click(action, index) {
    const button = new Node(); button.dataset = { loading: action, index };
    container.emit('click', { target: button });
  }
  return { loading, document, container, cards, dots, nodes, frames, timers, advance, click, completed: () => completed };
}

test('mount accepts a deferred photo, announces manual cards, and completes only once at fifteen seconds', () => {
  const h = harness();
  const image = h.nodes.get('.beauty-loading-photo img');
  assert.equal(image.hidden, true);
  h.loading.setPhoto('blob:photo');
  assert.equal(image.src, 'blob:photo'); assert.equal(image.hidden, false);
  h.advance(3000); assert.equal(h.cards[1].dataset.position, 'active');
  h.click('next'); assert.equal(h.cards[2].dataset.position, 'active');
  assert.match(h.nodes.get('.beauty-loading-announcement').textContent, /3 \/ 5/);
  h.advance(14999); assert.equal(h.completed(), 0);
  h.advance(15000); assert.equal(h.completed(), 1);
  h.advance(19000); assert.equal(h.completed(), 1);
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
});

test('destroy removes all events and scheduled work and never calls completion', () => {
  const h = harness();
  h.advance(1200);
  h.loading.destroy(); h.loading.destroy();
  h.advance(20000);
  h.document.emit('visibilitychange');
  assert.equal(h.completed(), 0);
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
  for (const node of [h.container, h.document, ...h.nodes.values()]) for (const listeners of node.listeners.values()) assert.equal(listeners.size, 0);
});

test('swipe and keyboard inputs work without relying on automatic rotation', () => {
  const h = harness({ reducedMotion: true });
  const carousel = h.nodes.get('.beauty-loading-carousel');
  h.advance(4000); assert.equal(h.cards[0].dataset.position, 'active');
  carousel.emit('pointerdown', { isPrimary: true, button: 0, clientX: 220, clientY: 100, pointerId: 7 });
  carousel.emit('pointerup', { clientX: 130, clientY: 110, pointerId: 7 });
  assert.equal(h.cards[1].dataset.position, 'active');
  let prevented = false;
  carousel.emit('keydown', { key: 'End', preventDefault: () => { prevented = true; } });
  assert.ok(prevented); assert.equal(h.cards[4].dataset.position, 'active');
  carousel.emit('pointerdown', { isPrimary: true, button: 0, clientX: 200, clientY: 100, pointerId: 8 });
  carousel.emit('pointerup', { clientX: 190, clientY: 220, pointerId: 8 });
  assert.equal(h.cards[4].dataset.position, 'active');
  h.advance(15000); assert.equal(h.completed(), 1);
});

test('foreground recovery honors elapsed deadline even when background timers were throttled', () => {
  const h = harness();
  h.document.hidden = true;
  h.frames.clear();
  h.advance(16000, false);
  assert.equal(h.completed(), 0);
  h.document.hidden = false;
  h.document.emit('visibilitychange');
  assert.equal(h.completed(), 1);
  assert.equal(h.timers.size, 0);
});

test('scoped presentation retains readable body size, swipe support, cancel action and motion fallback', async () => {
  const css = await readFile(new URL('../public/beauty-loading-v22.css', import.meta.url), 'utf8');
  const js = await readFile(new URL('../public/beauty-loading.js', import.meta.url), 'utf8');
  assert.match(css, /touch-action:pan-y/);
  assert.match(css, /beauty-loading-card p[^}]+font-size:13px/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(js, /data-action="cancel-scan"/);
  assert.match(js, /role="progressbar"/);
  assert.match(js, /aria-live="polite"/);
});
