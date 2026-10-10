import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TIERS, PRODUCTS, createReport } from '../public/beauty-model.js';
import { quoteOrder, getFoundationProducts } from '../public/beauty-commerce.js';

const controller = readFileSync(new URL('../public/beauty-analysis.js', import.meta.url), 'utf8');
const pair = label => ({ before: `${label}-before`, after: `${label}-after`, parts: {} });

function harness({ reducedMotion = false } = {}) {
  const nodes = new Map(), clockTimers = new Map(), requests = [], experiences = [], shown = [], toasts = [], events = [];
  let now = 0, serial = 0, document;
  const node = id => {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, {
        id, hidden: true, innerHTML: '', value: '', dataset: {}, handlers: {}, scrollTop: 0,
        style: { setProperty() {} }, isConnected: true,
        classList: { add: (...values) => values.forEach(value => classes.add(value)), remove: (...values) => values.forEach(value => classes.delete(value)), toggle: (value, state) => state ? classes.add(value) : classes.delete(value) },
        addEventListener(type, fn) { this.handlers[type] = fn; }, removeEventListener() {},
        querySelector: selector => node(`${id}:${selector}`), querySelectorAll: () => [],
        setAttribute() {}, focus() { document.activeElement = this; },
      });
    }
    return nodes.get(id);
  };
  document = { getElementById: node, querySelector: node, addEventListener() {}, activeElement: null };
  const prepare = score => {
    events.push(`prepare:${score}`);
    let resolve, reject;
    const ready = new Promise((res, rej) => { resolve = res; reject = rej; });
    requests.push({ score, resolve, reject });
    return ready;
  };
  const api = runInNewContext(controller.replace(/^import .*;$/gm, '') + `
    preparePhotos = prepare;
    showReport = (report, pair) => {
      currentReport = report; photos = pair;
      $('beautyScanning').hidden = true; $('beautyReport').hidden = false;
      recordShow(report, pair);
    };
    toast = message => recordToast(message);
    ({start, reset:resetEntry, close,
      setUpload(url){ uploadedUrl=url; },
      state(){ return {generation,currentReport,photos,loadingExperience}; }
    });
  `, {
    document, TIERS, PRODUCTS, createReport, quoteOrder, getFoundationProducts, prepare,
    recordShow: (report, photos) => { shown.push({ report, photos }); events.push(`show:${report.score}`); },
    recordToast: message => toasts.push(message),
    location: { search: '' }, URLSearchParams, URL: { revokeObjectURL() {} },
    window: {}, matchMedia: () => ({ matches: reducedMotion, addEventListener() {} }),
    setTimeout: (callback, delay) => { clockTimers.set(++serial, { callback, at: now + delay }); return serial; },
    clearTimeout: id => clockTimers.delete(id), cancelAnimationFrame() {},
    mountBeautyLoading(container, options) {
      events.push('mount');
      const experience = { container, options, destroyed: 0, photoUpdates: [], at: now + options.duration,
        destroy() { this.destroyed++; }, setPhoto(photo) { this.photoUpdates.push(photo); } };
      experiences.push(experience);
      return experience;
    },
  });
  node('beautyPage').hidden = false;
  function advance(time) {
    now = time;
    for (const experience of experiences) if (!experience.destroyed && !experience.completed && experience.at <= now) {
      experience.completed = true;
      experience.options.onComplete();
    }
    for (const [id, timer] of [...clockTimers]) if (timer.at <= now) { clockTimers.delete(id); timer.callback(); }
  }
  return { api, node, requests, experiences, shown, toasts, events, advance };
}

test('upload starts the loading UI before photos resolve and passes the original photo immediately', async () => {
  const h = harness();
  h.api.setUpload('blob:uploaded-photo');
  const pending = h.api.start(90);
  assert.deepEqual(h.events, ['mount', 'prepare:90']);
  assert.equal(h.experiences.length, 1);
  assert.equal(h.experiences[0].options.duration, 15000);
  assert.equal(h.experiences[0].options.photo, 'blob:uploaded-photo');
  assert.equal(h.node('beautyScanning').hidden, false);
  assert.equal(h.node('beautyReport').hidden, true);
  assert.equal(h.node('beautyEntry').hidden, true);
  const photos = pair('upload'); h.requests[0].resolve(photos); await pending;
  assert.deepEqual(h.experiences[0].photoUpdates, [photos.before]);
  assert.equal(h.shown.length, 0);
  h.advance(14999); assert.equal(h.shown.length, 0);
  h.advance(15000); assert.equal(h.shown.length, 1);
  assert.equal(h.shown[0].photos, photos);
  assert.equal(h.shown[0].report.score, 90);
  assert.equal(h.node('beautyScanning').hidden, true);
  assert.equal(h.node('beautyReport').hidden, false);
});

test('a photo that takes longer than fifteen seconds remains gated until both prerequisites are ready', async () => {
  const h = harness(); const pending = h.api.start(80);
  h.advance(15000); assert.equal(h.shown.length, 0);
  h.advance(17000); assert.equal(h.shown.length, 0);
  const photos = pair('slow'); h.requests[0].resolve(photos); await pending;
  assert.equal(h.shown.length, 1);
  assert.equal(h.shown[0].photos, photos);
  assert.equal(h.api.state().loadingExperience, null);
});

test('reset destroys an in-flight loader and rejects late photos and stale completion callbacks', async () => {
  for (const resolveFirst of [false, true]) {
    const h = harness(); const pending = h.api.start(68); const experience = h.experiences[0];
    if (resolveFirst) { h.requests[0].resolve(pair('early')); await pending; }
    h.api.reset();
    assert.equal(experience.destroyed, 1);
    if (!resolveFirst) { h.requests[0].resolve(pair('late')); await pending; }
    experience.options.onComplete(); h.advance(20000);
    assert.equal(h.shown.length, 0);
    assert.equal(h.api.state().currentReport, null);
    assert.equal(h.api.state().photos, null);
    assert.equal(h.node('beautyEntry').hidden, false);
    assert.equal(h.node('beautyScanning').hidden, true);
    assert.equal(h.node('beautyReport').hidden, true);
  }
});

test('closing the feature never allows an old pending result to reopen it', async () => {
  const h = harness(); const pending = h.api.start(97);
  h.api.close();
  h.requests[0].resolve(pair('closed')); await pending;
  h.experiences[0].options.onComplete();
  assert.equal(h.node('beautyPage').hidden, true);
  assert.equal(h.shown.length, 0);
});

test('a replacement run keeps its own loader when old photos and deadline arrive out of order', async () => {
  const h = harness(); const first = h.api.start(52); const oldExperience = h.experiences[0];
  const second = h.api.start(97); const nextExperience = h.experiences[1];
  assert.equal(oldExperience.destroyed, 1);
  h.requests[0].resolve(pair('old')); await first;
  oldExperience.options.onComplete();
  assert.equal(h.shown.length, 0);
  assert.equal(nextExperience.destroyed, 0);
  assert.deepEqual(nextExperience.photoUpdates, []);
  const current = pair('current'); h.requests[1].resolve(current); await second;
  h.advance(15000);
  assert.equal(h.shown.length, 1);
  assert.equal(h.shown[0].report.score, 97);
  assert.equal(h.shown[0].photos, current);
});

test('switching to a score scene cancels the old loading and does not inherit its deadline', async () => {
  const h = harness(); const old = h.api.start(52);
  const scene = h.api.start(90, false);
  assert.equal(h.experiences.length, 1);
  assert.equal(h.experiences[0].destroyed, 1);
  h.requests[1].resolve(pair('scene')); await scene;
  h.requests[0].resolve(pair('previous')); await old;
  h.experiences[0].options.onComplete();
  assert.equal(h.shown.length, 1);
  assert.equal(h.shown[0].report.score, 90);
  assert.equal(h.shown[0].photos.before, 'scene-before');
});

test('photo failures reset the entry and dismiss the loader; cancelled failures do not show an error', async () => {
  const h = harness(); const pending = h.api.start(90);
  h.requests[0].reject(new Error('照片读取失败')); await pending;
  assert.deepEqual(h.toasts, ['照片读取失败']);
  assert.equal(h.experiences[0].destroyed, 1);
  assert.equal(h.node('beautyEntry').hidden, false);
  h.experiences[0].options.onComplete(); assert.equal(h.shown.length, 0);
  const cancelled = harness(); const old = cancelled.api.start(90); cancelled.api.reset();
  cancelled.requests[0].reject(new Error('迟到的错误')); await old;
  assert.deepEqual(cancelled.toasts, []);
  assert.equal(cancelled.shown.length, 0);
});

test('reduced-motion users still receive the complete fifteen-second interactive waiting experience', async () => {
  const h = harness({ reducedMotion: true }); const pending = h.api.start(68);
  assert.equal(h.experiences.length, 1);
  assert.equal(h.experiences[0].options.reducedMotion, true);
  assert.equal(h.experiences[0].options.duration, 15000);
  h.requests[0].resolve(pair('reduced')); await pending;
  h.advance(14999); assert.equal(h.shown.length, 0);
  h.advance(15000); assert.equal(h.shown.length, 1);
});

test('explicit scene preview bypasses the loader but still waits for its photographs', async () => {
  const h = harness(); const pending = h.api.start(80, false);
  assert.equal(h.experiences.length, 0);
  assert.equal(h.shown.length, 0);
  assert.equal(h.node('beautyScanning').hidden, true);
  const photos = pair('direct'); h.requests[0].resolve(photos); await pending;
  assert.equal(h.shown.length, 1);
  assert.equal(h.shown[0].photos, photos);
});
