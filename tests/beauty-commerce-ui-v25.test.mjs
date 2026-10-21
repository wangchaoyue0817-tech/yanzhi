import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { PRODUCTS, createReport, getFoundationProducts } from '../public/beauty-model.js';
import { resolvePurchaseTarget } from '../public/beauty-purchase.js';
import { merchantHTML } from '../public/beauty-merchant.js';

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
  between('function openPurchase(', 'async function posterSheet('),
  between('function reportReady(', 'function contentTop('),
  between("page.addEventListener('click',event=>{", "scroll.addEventListener('scroll',syncReading"),
  between('// Foundation swipes stay inside their picker', '// A fresh gesture must begin at the end;'),
  between("document.addEventListener('keydown'", "motion.addEventListener('change'"),
  between("window.addEventListener?.('popstate'", 'window.beautyExperience='),
].join('\n');
const attributes = text => Object.fromEntries([...text.matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)].map(match => [match[1], match[2] ?? '']));
const plain = value => JSON.parse(JSON.stringify(value));

function harness(score = 90, { links, failNavigation = false } = {}) {
  const nodes = new Map(), productControls = new Map(), timers = new Map(), windowHandlers = new Map(), documentHandlers = new Map();
  const effects = { sheets: [], toasts: [], chapters: [], starts: [], clearedUploads: 0, navigation: [], history: [] };
  let document, serial = 0, timerSerial = 0, now = 1000;
  const node = id => {
    if (nodes.has(id)) return nodes.get(id);
    const attrs = {}, handlers = new Map(), classes = new Set(), controls = [];
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
      querySelectorAll() {
        if (id === 'beautyPage' && !node('beautyMerchant').hidden) return node('beautyMerchant').querySelectorAll();
        return controls;
      },
      getClientRects() { return el.hidden ? [] : [{}]; },
      getBoundingClientRect() { return { top: 0, left: 0, right: 390, bottom: 800, height: 800, width: 390 }; },
      closest() { return null; },
    };
    Object.defineProperty(el, 'innerHTML', {
      get: () => html,
      set(value) {
        html = value;
        controls.length = 0;
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
          if (['button', 'input', 'textarea'].includes(match[1])) controls.push(child);
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
  document = { getElementById: node, querySelector: node, activeElement: null, addEventListener(type, listener) { documentHandlers.set(type, listener); } };
  const historyStack = [{ homepage: 'preserved' }];
  let historyIndex = 0;
  const history = {
    get state() { return historyStack[historyIndex]; },
    pushState(state, title, url) { historyStack.splice(++historyIndex, Infinity, state); effects.history.push({ type: 'push', state: plain(state), url }); },
    replaceState(state) { historyStack[historyIndex] = state; effects.history.push({ type: 'replace', state: plain(state) }); },
    back() { history.go(-1); },
    go(delta) { const next = historyIndex + delta; if (next < 0 || next >= historyStack.length) return; historyIndex = next; windowHandlers.get('popstate')?.({ state: history.state }); },
  };
  const window = {
    addEventListener(type, listener) { windowHandlers.set(type, listener); },
    location: { assign(url) { if (failNavigation) throw new Error('Navigation unavailable'); effects.navigation.push(url); } },
  };
  const ctx = {
    document, PRODUCTS, getFoundationProducts, createReport, history, window, merchantHTML,
    resolvePurchaseTarget: id => resolvePurchaseTarget(id, links),
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
    let merchantProduct=null,merchantFocus=null,merchantScrollTop=0,generation=1;
    const start=(...args)=>effectStart(...args),clearUpload=()=>effectClearUpload();
    const toast=message=>effectToast(message),inert=(el,value)=>{if(el)el.inert=value;};
    const later=(fn,delay)=>setTimeout(fn,delay);
    const selectChapter=id=>{reader.tab=id;effectChapter(id);};
    ${executable}
    ({ init(){page.hidden=false;$('beautyReport').hidden=false;$('beautyOverlay').hidden=true;$('beautyMerchant').hidden=true;page.innerHTML=collectionHTML(currentReport)+foundationHTML();},
      openPurchase,showMerchant,hideMerchant,returnFromMerchant,clearMerchant,openSheet,closeSheet,selectFoundation,
      state(){return {reader,modalKind,merchantProduct,generation};},
      invalidateReport(){clearMerchant();generation++;currentReport=null;},
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
  const click = (dataset, attrs = []) => {
    const button = { dataset, hasAttribute: name => attrs.includes(name) };
    return dispatch('click', { target: { closest: selector => selector === 'button' ? button : null } });
  };
  const key = (value, { shiftKey = false } = {}) => {
    const event = { key: value, shiftKey, target: document.activeElement, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    documentHandlers.get('keydown')(event);
    return event;
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
  return { api, node, document, click, key, pointer, dispatch, effects, productControls, timers, history, windowHandlers, state: () => plain(api.state()), flushTimers() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } } };
}

test('each of the twelve collection entries directly opens its own merchant page without a sheet', () => {
  const h = harness();
  assert.equal(h.productControls.size, 12);
  for (const product of PRODUCTS) {
    const trigger = h.productControls.get(product.id);
    trigger.focus();
    h.node('beautyScroll').scrollTop = 2370;
    h.click({ productBuy: trigger.dataset.productBuy });
    assert.equal(h.state().merchantProduct.id, product.id);
    assert.equal(h.state().modalKind, '');
    assert.equal(h.node('beautyOverlay').hidden, true);
    assert.equal(h.node('beautyMerchant').hidden, false);
    const html = h.node('beautyMerchant').innerHTML;
    for (const value of [product.name, product.shade, product.image]) assert.ok(html.includes(value), value);
    assert.match(html, /演示/);
    assert.doesNotMatch(html, /role="dialog"|aria-modal|<form|<input|<textarea|满减|优惠|收货|下单成功|支付成功/);
    assert.equal(h.document.activeElement, h.node('beautyMerchantTitle'));
    h.click({}, ['data-merchant-back']);
    assert.equal(h.node('beautyMerchant').hidden, true);
    assert.equal(h.node('beautyMerchant').innerHTML, '');
    assert.equal(h.node('beautyScroll').scrollTop, 2370);
    assert.equal(h.document.activeElement, trigger);
  }
  assert.equal(h.effects.sheets.length, 0);
  assert.equal(h.effects.starts.length, 0);
});

test('all existing product controls use one direct-buy action and no product detail route survives', () => {
  assert.doesNotMatch(source, /data-product-detail|productDetail|detailSheet|miniProgramSheet|case 'continue'/);
  const buyHandler = between('const productId=target.dataset.productBuy;', 'switch(target.dataset.action)');
  assert.match(buyHandler, /openPurchase\(product\)/);
  assert.doesNotMatch(buyHandler, /openSheet/);
});

test('unknown and empty product IDs are ignored without opening or replacing a destination', () => {
  const h = harness();
  for (const id of ['missing', '', '__proto__', '<script>']) h.click({ productBuy: id });
  assert.equal(h.effects.sheets.length, 0);
  assert.equal(h.node('beautyMerchant').hidden, true);
  assert.equal(h.effects.history.length, 0);
  h.click({ productBuy: 'hair' });
  const prior = h.node('beautyMerchant').innerHTML;
  h.click({ productBuy: 'missing' });
  assert.equal(h.node('beautyMerchant').innerHTML, prior);
});

test('merchant destination blocks background gestures and restores report focus, chapter and scroll on browser back', () => {
  const h = harness();
  const original = h.node('report-product');
  original.focus();
  h.node('beautyScroll').scrollTop = 3150;
  h.click({ productBuy: 'lip' });
  for (const id of ['beautyScroll', '.beauty-header', 'beautyComposer']) assert.equal(h.node(id).inert, true);
  h.pointer({ picker: false, fromX: 90, toX: 280 });
  h.pointer();
  assert.deepEqual(h.effects.chapters, []);
  assert.equal(h.node('foundationTab-base-normal').getAttribute('aria-selected'), 'true');
  assert.equal(h.history.state.homepage, 'preserved');
  h.history.back();
  assert.equal(h.state().merchantProduct, null);
  assert.equal(h.state().reader.tab, 'advice');
  for (const id of ['beautyScroll', '.beauty-header', 'beautyComposer']) assert.equal(h.node(id).inert, false);
  assert.equal(h.node('beautyScroll').scrollTop, 3150);
  assert.equal(h.document.activeElement, original);
  assert.equal(h.effects.starts.length, 0, 'returning does not rerun loading');
  h.history.go(1);
  assert.equal(h.state().merchantProduct.id, 'lip', 'forward restores the matching product for the same report');
  h.history.back();
  assert.equal(h.document.activeElement, original);
});

test('merchant history forward dismisses an intervening menu or poster before restoring the destination', () => {
  for (const kind of ['menu', 'poster']) {
    const h = harness();
    const purchaseOpener = h.productControls.get('lip');
    purchaseOpener.focus();
    h.node('beautyScroll').scrollTop = 2910;
    h.click({ productBuy: 'lip' });
    h.history.back();
    assert.equal(h.document.activeElement, purchaseOpener);
    const sheetOpener = h.node(`${kind}-opener`);
    sheetOpener.focus();
    h.api.openSheet(kind, '<p>Content</p>', kind);
    assert.equal(h.node('beautyOverlay').hidden, false);
    assert.equal(h.document.activeElement, h.node('beautySheet:[data-beauty-close]'));
    h.history.go(1);
    assert.equal(h.node('beautyOverlay').hidden, true, `${kind}: forward closes the old sheet`);
    assert.equal(h.state().modalKind, '');
    assert.equal(h.state().merchantProduct.id, 'lip');
    assert.equal(h.document.activeElement, h.node('beautyMerchantTitle'));
    for (const id of ['beautyScroll', '.beauty-header', 'beautyComposer']) assert.equal(h.node(id).inert, true);
    h.history.back();
    assert.equal(h.node('beautyMerchant').hidden, true);
    assert.equal(h.node('beautyOverlay').hidden, true);
    assert.equal(h.document.activeElement, sheetOpener, `${kind}: back restores the report control, not a hidden sheet control`);
    assert.equal(h.node('beautyScroll').scrollTop, 2910);
    assert.equal(h.state().reader.tab, 'advice');
    for (const id of ['beautyScroll', '.beauty-header', 'beautyComposer']) assert.equal(h.node(id).inert, false);
    assert.equal(h.effects.starts.length, 0);
  }
});

test('initial merchant heading focus enters and stays within its return control on Tab and Shift Tab', () => {
  for (const shiftKey of [false, true]) {
    const h = harness();
    h.click({ productBuy: 'hair' });
    assert.equal(h.document.activeElement, h.node('beautyMerchantTitle'));
    const controls = h.node('beautyMerchant').querySelectorAll();
    assert.equal(controls.length, 1);
    assert.equal(controls[0].hasAttribute('data-merchant-back'), true);
    assert.equal(h.key('Tab', { shiftKey }).defaultPrevented, true, 'heading focus is directed to the visible control');
    assert.equal(h.document.activeElement, controls[0]);
    assert.equal(h.key('Tab', { shiftKey }).defaultPrevented, true, 'single-control traversal stays in the page');
    assert.equal(h.document.activeElement, controls[0]);
    assert.equal(h.node('beautyOverlay').hidden, true);
  }
});

test('opening another SKU after return replaces the destination without accumulating a selection', () => {
  const h = harness();
  h.click({ productBuy: 'hair' });
  h.history.back();
  h.click({ productBuy: 'earrings' });
  const html = h.node('beautyMerchant').innerHTML;
  assert.equal(h.state().merchantProduct.id, 'earrings');
  assert.ok(html.includes(PRODUCTS.find(product => product.id === 'earrings').name));
  assert.ok(!html.includes(PRODUCTS.find(product => product.id === 'hair').name));
  assert.doesNotMatch(html, /已选|合并|打包|勾选/);
});

test('configured HTTPS links navigate directly without rendering an internal destination or a sheet', () => {
  const links = Object.fromEntries(PRODUCTS.map(product => [product.id, `https://merchant.example/purchase?sku=${product.id}`]));
  const h = harness(90, { links });
  for (const product of PRODUCTS) h.click({ productBuy: product.id });
  assert.deepEqual(h.effects.navigation, PRODUCTS.map(product => links[product.id]));
  assert.equal(h.effects.history.length, 0);
  assert.equal(h.effects.sheets.length, 0);
  assert.equal(h.node('beautyMerchant').hidden, true);
});

test('invalid or failed external navigation stays on the report and reports an actionable error', () => {
  for (const configured of ['javascript:alert(1)', 'http://merchant.example', 'https://user:secret@merchant.example', 42]) {
    const h = harness(90, { links: { hair: configured } });
    h.click({ productBuy: 'hair' });
    assert.equal(h.effects.toasts.at(-1), '购买链接暂不可用，请稍后再试');
    assert.deepEqual(h.effects.navigation, []);
    assert.equal(h.node('beautyMerchant').hidden, true);
  }
  const h = harness(90, { links: { hair: 'https://merchant.example/hair' }, failNavigation: true });
  h.click({ productBuy: 'hair' });
  assert.equal(h.effects.toasts.at(-1), '暂时无法打开购买页面，请重试');
  assert.equal(h.node('beautyMerchant').hidden, true);
});

test('stale history cannot reopen a merchant page after its report has been reset', () => {
  const h = harness();
  h.click({ productBuy: 'hair' });
  const stale = h.history.state;
  h.api.invalidateReport();
  assert.equal(h.node('beautyMerchant').hidden, true);
  assert.equal(h.history.state.beautyMerchant, undefined);
  assert.equal(h.history.state.homepage, 'preserved');
  h.windowHandlers.get('popstate')({ state: stale });
  assert.equal(h.node('beautyMerchant').hidden, true);
  assert.equal(h.state().merchantProduct, null);
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
  assert.equal(h.click({ productBuy: 'base-dry' }).defaultPrevented, true);
  assert.equal(h.state().modalKind, '');
  h.click({ productBuy: 'base-dry' });
  assert.equal(h.state().merchantProduct.id, 'base-dry');
  assert.equal(h.effects.sheets.length, 0);
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
