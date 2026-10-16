import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { PRODUCTS, createReport, getFoundationProducts } from '../public/beauty-model.js';

const source = readFileSync(new URL('../public/beauty-analysis.js', import.meta.url), 'utf8');
// Run the shipped functions and listeners, with small DOM/event adapters. No
// controller business logic is rewritten or asserted through source matching.
function between(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `controller section: ${start}`);
  return source.slice(from, to);
}
const executable = [
  between('function productImage(', 'function resultCopy('),
  between('function foundationHTML(', 'function priorityArea('),
  between('function openSheet(', 'function menuSheet('),
  between('function detailSheet(', 'async function posterSheet('),
  between("page.addEventListener('click',event=>{", "scroll.addEventListener('scroll',syncReading"),
  between('// Foundation swipes stay inside their picker', '// A fresh gesture must begin at the end;'),
].join('\n');
const attributes = text => Object.fromEntries([...text.matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)].map(match => [match[1], match[2] ?? '']));
const plain = value => JSON.parse(JSON.stringify(value));

function harness(score = 90) {
  const nodes = new Map(), productControls = new Map(), timers = new Map();
  const effects = { sheets: [], toasts: [], chapters: [], starts: [], clearedUploads: 0 };
  let document, serial = 0, timerSerial = 0, now = 1000;
  const node = id => {
    if (nodes.has(id)) return nodes.get(id);
    const attrs = {}, handlers = new Map(), classes = new Set();
    let html = '';
    const el = {
      id, dataset: {}, hidden: false, disabled: false, inert: false, value: '', textContent: '', tabIndex: 0,
      scrollTop: 0, isConnected: true, customValidity: '', handlers,
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        toggle(name, force) { const active = force ?? !classes.has(name); active ? classes.add(name) : classes.delete(name); return active; },
        contains(name) { return classes.has(name); },
      },
      setAttribute(name, value) { attrs[name] = String(value); },
      getAttribute(name) { return attrs[name] ?? null; },
      hasAttribute(name) { return Object.hasOwn(attrs, name); },
      removeAttribute(name) { delete attrs[name]; },
      focus() { document.activeElement = el; },
      addEventListener(type, fn, options = {}) {
        if (!handlers.has(type)) handlers.set(type, []);
        handlers.get(type).push({ fn, capture: options === true || !!options.capture, once: !!options.once });
      },
      removeEventListener(type, fn) { handlers.set(type, (handlers.get(type) || []).filter(listener => listener.fn !== fn)); },
      querySelector(selector) { return node(`${id}:${selector}`); },
      querySelectorAll() { return []; },
      getBoundingClientRect() { return { top: 0, left: 0, right: 390, bottom: 800, height: 800, width: 390 }; },
      closest() { return null; },
    };
    Object.defineProperty(el, 'innerHTML', {
      get: () => html,
      set(value) {
        html = value;
        if (id === 'beautySheetBody') {
          effects.sheets.push(value);
        }
        for (const match of value.matchAll(/<(button|input|textarea|form|div|p)\b([^>]*)>/g)) {
          const data = attributes(match[2]);
          const child = node(data.id || `generated-${++serial}`);
          for (const [key, val] of Object.entries(data)) {
            child.setAttribute(key, val);
            if (key.startsWith('data-')) child.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val;
          }
          child.value = data.value ?? '';
          child.hidden = Object.hasOwn(data, 'hidden');
          child.disabled = Object.hasOwn(data, 'disabled');
          if (data['data-product-buy'] && id === 'beautyPage') productControls.set(data['data-product-buy'], child);
        }
      },
    });
    nodes.set(id, el);
    return el;
  };
  document = { getElementById: node, querySelector: node, activeElement: null };
  const ctx = {
    document, PRODUCTS, getFoundationProducts, createReport,
    Date: { now: () => now },
    URL: { revokeObjectURL() {} },
    effectToast: message => effects.toasts.push(message),
    effectStart: (...args) => effects.starts.push(args),
    effectClearUpload: () => effects.clearedUploads++,
    effectChapter: id => effects.chapters.push(id),
    setTimeout(fn) { const id = ++timerSerial; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const api = runInNewContext(`
    const $=id=>document.getElementById(id),page=$('beautyPage'),scroll=$('beautyScroll');
    const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const star='<svg></svg>',money=value=>Number.isInteger(value)?String(value):value.toFixed(2);
    let currentReport=createReport(${score}),reader={tab:'advice'},foundationSwipe=null,swipeStart=null,wheelGesture=null,touchStart=null;
    let sheetFocus=null,overlayGeneration=0,modalKind='',posterPreviewUrl='',copyVariant=0;
    const start=(...args)=>effectStart(...args),clearUpload=()=>effectClearUpload();
    const toast=message=>effectToast(message),inert=(el,value)=>{if(el)el.inert=value;};
    const later=(fn,delay)=>setTimeout(fn,delay);
    const reportReady=()=>!!currentReport&&!page.hidden;
    const selectChapter=id=>{reader.tab=id;effectChapter(id);};
    ${executable}
    ({ init(){page.hidden=false;$('beautyOverlay').hidden=true;page.innerHTML=collectionHTML(currentReport)+foundationHTML();},
      detailSheet,miniProgramSheet,closeSheet,selectFoundation,
      state(){return {reader,modalKind};},
      setChapter(id){reader.tab=id;} });
  `, ctx);
  api.init();
  const dispatch = (type, extra = {}) => {
    const event = { target: null, defaultPrevented: false, stopped: false, preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra };
    const handlers = node('beautyPage').handlers;
    const listeners = [...(handlers.get(type) || [])].sort((a, b) => Number(b.capture) - Number(a.capture));
    for (const listener of listeners) {
      if (event.stopped) break;
      listener.fn(event);
      if (listener.once) node('beautyPage').removeEventListener(type, listener.fn);
    }
    return event;
  };
  const click = dataset => {
    const button = { dataset, hasAttribute: () => false };
    return dispatch('click', { target: { closest: selector => selector === 'button' ? button : null } });
  };
  const pointer = ({ fromX = 280, toX = 90, fromY = 300, toY = 302, duration = 100, picker = true, primary = true, endId = 1, cancel = false } = {}) => {
    const target = { closest(selector) {
      if (selector === '[data-foundation-picker]') return picker ? node('foundation-picker') : null;
      if (selector === '#beautyDetail') return node('beautyDetail');
      if (selector.includes('[data-foundation-picker]')) return picker ? node('foundation-picker') : null;
      return null;
    } };
    dispatch('pointerdown', { target, pointerId: 1, clientX: fromX, clientY: fromY, isPrimary: primary, pointerType: 'touch', button: 0 });
    now += duration;
    if (cancel) dispatch('pointercancel');
    dispatch('pointerup', { target, pointerId: endId, clientX: toX, clientY: toY });
  };
  return { api, node, document, click, pointer, dispatch, effects, productControls, timers, state: () => plain(api.state()), flushTimers() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } } };
}

test('each of the twelve collection entries hands off exactly its own product without internal checkout', () => {
  const h = harness();
  assert.equal(h.productControls.size, 12);
  for (const product of PRODUCTS) {
    const trigger = h.productControls.get(product.id);
    trigger.focus();
    h.click({ productBuy: trigger.dataset.productBuy });
    assert.equal(h.state().modalKind, 'mini-program');
    assert.equal(h.node('beautySheetTitle').textContent, '前往小程序购买');
    const html = h.node('beautySheetBody').innerHTML;
    assert.match(html, new RegExp(`data-mini-product="${product.id}"`));
    assert.equal((html.match(/data-mini-product=/g) || []).length, 1);
    assert.ok(html.includes(product.name));
    assert.ok(html.includes(product.shade));
    assert.ok(html.includes(product.image));
    assert.ok(html.includes(`<small>¥</small>${product.price}`));
    assert.ok(html.includes(`<del>¥${product.originalPrice}</del>`));
    assert.match(html, /在商家小程序中完成下单/);
    assert.match(html, /跳转展示 · 小程序暂未接入/);
    assert.doesNotMatch(html, /<form|<input|<textarea|满减|优惠|收货|下单成功|支付成功/);
    h.click({ action: 'continue' });
    assert.equal(h.node('beautyOverlay').hidden, true);
    assert.equal(h.document.activeElement, trigger);
  }
});

test('product details retain their facts and route the same SKU to the external purchase demonstration', () => {
  const h = harness();
  for (const product of PRODUCTS) {
    h.click({ productDetail: product.id });
    assert.equal(h.state().modalKind, 'product');
    const detail = h.node('beautySheetBody').innerHTML;
    for (const value of [product.name, product.brand, product.shade, product.reason, product.usage, ...product.features]) assert.ok(detail.includes(value));
    assert.ok(detail.includes(`<del>¥${product.originalPrice}</del>`));
    assert.match(detail, /立即购买/);
    assert.doesNotMatch(detail, />去小程序购买/);
    const attrs = attributes(detail.match(/<button\b([^>]*data-product-buy[^>]*)>/)[1]);
    assert.equal(attrs['data-product-buy'], product.id);
    assert.equal(attrs.type, 'button');
    h.click({ productBuy: attrs['data-product-buy'] });
    assert.equal(h.state().modalKind, 'mini-program');
    assert.match(h.node('beautySheetBody').innerHTML, new RegExp(`data-mini-product="${product.id}"`));
    h.api.closeSheet();
  }
});

test('unknown and empty product IDs are ignored without replacing the current sheet', () => {
  const h = harness();
  for (const id of ['missing', '', '__proto__', '<script>']) {
    h.click({ productBuy: id });
    h.click({ productDetail: id });
    assert.equal(h.effects.sheets.length, 0);
    assert.equal(h.node('beautyOverlay').hidden, true);
  }
  h.click({ productBuy: 'hair' });
  const prior = h.node('beautySheetBody').innerHTML;
  h.click({ productBuy: 'missing' });
  assert.equal(h.node('beautySheetBody').innerHTML, prior);
});

test('detail to handoff retains the original report focus target and keeps the background inert', () => {
  const h = harness();
  const original = h.node('report-product');
  original.focus();
  h.click({ productDetail: 'lip' });
  h.node('detail-buy').focus();
  h.click({ productBuy: 'lip' });
  for (const id of ['beautyScroll', '.beauty-header', 'beautyComposer']) assert.equal(h.node(id).inert, true);
  assert.equal(h.document.activeElement, h.node('beautySheet:[data-beauty-close]'));
  h.pointer({ picker: false, fromX: 90, toX: 280 });
  h.pointer();
  assert.deepEqual(h.effects.chapters, []);
  assert.equal(h.node('foundationTab-base-normal').getAttribute('aria-selected'), 'true');
  h.click({ action: 'continue' });
  assert.equal(h.state().modalKind, '');
  for (const id of ['beautyScroll', '.beauty-header', 'beautyComposer']) assert.equal(h.node(id).inert, false);
  assert.equal(h.document.activeElement, original);
});

test('reopening another SKU replaces the prior handoff and never accumulates a purchase selection', () => {
  const h = harness();
  h.click({ productBuy: 'hair' });
  h.api.closeSheet();
  h.click({ productBuy: 'earrings' });
  const html = h.node('beautySheetBody').innerHTML;
  assert.match(html, /data-mini-product="earrings"/);
  assert.doesNotMatch(html, /data-mini-product="hair"|已选|合并|打包|勾选/);
  assert.equal((html.match(/data-mini-product=/g) || []).length, 1);
});

test('shipped beauty assets have no discount, selection, cart, shipping or internal order remnants', () => {
  const root = new URL('../public/', import.meta.url);
  assert.equal(existsSync(new URL('beauty-commerce.js', root)), false);
  const files = readdirSync(root).filter(name => /^beauty-.*\.(?:css|js)$/.test(name));
  const forbidden = /quoteOrder|selectedProducts|updateCartDock|beautyCartDock|beautyOrderForm|beautySubmitOrder|beauty-select-product|beauty-cart-|beauty-checkout-|beauty-order-|beauty-offer|data-cart-toggle|data-order-(?:step|quantity|remove)|checkout-cart|满减|每满|优惠可叠加|合并下单|下单成功/;
  for (const file of files) assert.doesNotMatch(readFileSync(new URL(file, root), 'utf8'), forbidden, file);
  const html = readFileSync(new URL('index.html', root), 'utf8');
  assert.doesNotMatch(html, /beautyCartDock|beautyOrderForm|beauty-commerce\.js|beauty-cart-/);
});

test('foundation clicks switch only their panels and do not select products or change the main chapter', () => {
  const h = harness(80);
  assert.equal(h.node('foundationTab-base-oily').getAttribute('aria-selected'), 'true');
  h.click({ foundation: 'base-dry' });
  assert.equal(h.node('foundationTab-base-dry').getAttribute('aria-selected'), 'true');
  assert.equal(h.node('foundationPanel-base-dry').hidden, false);
  assert.equal(h.node('foundationPanel-base-oily').hidden, true);
  assert.equal(h.node('foundationTab-base-dry').tabIndex, 0);
  assert.equal(h.node('foundationTab-base-oily').tabIndex, -1);
  assert.equal(h.state().modalKind, '');
  assert.deepEqual(h.effects.chapters, []);
});

test('foundation swipes stay within foundation tabs and suppress the resulting product click', () => {
  const h = harness(90);
  h.pointer();
  assert.equal(h.node('foundationTab-base-dry').getAttribute('aria-selected'), 'true');
  assert.deepEqual(h.effects.chapters, []);
  assert.equal(h.click({ productDetail: 'base-dry' }).defaultPrevented, true);
  assert.equal(h.state().modalKind, '');
  h.click({ productDetail: 'base-dry' });
  assert.equal(h.state().modalKind, 'product');
});

test('vertical, short, cancelled, multi-pointer, and stale foundation gestures do not switch panels', () => {
  for (const gesture of [{ toX: 270 }, { toY: 600 }, { cancel: true }, { primary: false }, { endId: 2 }, { duration: 1300 }]) {
    const h = harness();
    h.pointer(gesture);
    assert.equal(h.node('foundationTab-base-normal').getAttribute('aria-selected'), 'true', JSON.stringify(gesture));
    assert.deepEqual(h.effects.chapters, []);
  }
});

test('main chapter swipes continue to work outside the foundation picker', () => {
  const h = harness();
  h.pointer({ picker: false, fromX: 90, toX: 280 });
  assert.deepEqual(h.effects.chapters, ['overview']);
  assert.equal(h.node('foundationTab-base-normal').getAttribute('aria-selected'), 'true');
});


test('removing internal checkout keeps the custom score form functional and validates score bounds', () => {
  const h = harness();
  for (const score of ['-1', '101', '1.5', 'not-a-score']) {
    h.node('beautyScoreInput').value = score;
    const event = h.dispatch('submit', { target: h.node('beautyCustomScore') });
    assert.equal(event.defaultPrevented, true);
    assert.equal(h.effects.starts.length, 0);
    assert.equal(h.effects.toasts.at(-1), '请输入 0–100 的整数分数');
  }
  for (const score of [0, 52, 90, 100]) {
    h.node('beautyScoreInput').value = String(score);
    h.dispatch('submit', { target: h.node('beautyCustomScore') });
    assert.deepEqual(h.effects.starts.at(-1), [score]);
  }
  assert.equal(h.effects.clearedUploads, 4);
});
