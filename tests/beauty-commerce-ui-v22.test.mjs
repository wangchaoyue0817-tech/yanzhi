import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { PRODUCTS, createReport } from '../public/beauty-model.js';
import { getFoundationProducts, quoteOrder } from '../public/beauty-commerce.js';

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
  const nodes = new Map(), quantityInputs = new Map(), fields = new Map(), cartControls = new Map(), timers = new Map();
  const effects = { sheets: [], toasts: [], chapters: [] };
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
      setCustomValidity(value) { el.customValidity = value; },
      checkValidity() {
        if (el.customValidity) return false;
        if (el.id === 'beautyOrderForm') return [...fields.values(), ...quantityInputs.values()].every(input => input.checkValidity());
        if (el.dataset.orderQuantity) return el.value !== '' && Number.isInteger(Number(el.value)) && Number(el.value) >= 1 && Number(el.value) <= 9;
        const value = el.value;
        if (el.hasAttribute('required') && !value.length) return false;
        if (el.hasAttribute('maxlength') && value.length > Number(el.getAttribute('maxlength'))) return false;
        if (el.hasAttribute('minlength') && value.length < Number(el.getAttribute('minlength'))) return false;
        if (el.hasAttribute('pattern') && !new RegExp(`^(?:${el.getAttribute('pattern')})$`).test(value)) return false;
        return true;
      },
      addEventListener(type, fn, options = {}) {
        if (!handlers.has(type)) handlers.set(type, []);
        handlers.get(type).push({ fn, capture: options === true || !!options.capture, once: !!options.once });
      },
      removeEventListener(type, fn) { handlers.set(type, (handlers.get(type) || []).filter(listener => listener.fn !== fn)); },
      querySelector(selector) {
        if (selector === '[data-order-step="-1"]') return el.minus;
        if (selector === '[data-order-step="1"]') return el.plus;
        return node(`${id}:${selector}`);
      },
      querySelectorAll(selector) {
        if (selector === '[data-order-quantity]') return [...quantityInputs.values()];
        if (selector === '[data-cart-toggle]') return [...cartControls.values()];
        const match = selector.match(/^\[data-cart-toggle="([^"]+)"\]$/);
        if (match) return cartControls.has(match[1]) ? [cartControls.get(match[1])] : [];
        return [];
      },
      getBoundingClientRect() { return { top: 0, left: 0, right: 390, bottom: 800, height: 800, width: 390 }; },
      closest() { return null; },
    };
    Object.defineProperty(el, 'innerHTML', {
      get: () => html,
      set(value) {
        html = value;
        if (id === 'beautySheetBody') {
          effects.sheets.push(value);
          quantityInputs.clear(); fields.clear();
        } else if (id === 'beautyOrderItems') quantityInputs.clear();
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
          if (data.name) fields.set(data.name, child);
          if (data['data-cart-toggle']) cartControls.set(data['data-cart-toggle'], child);
          if (data['data-order-quantity']) {
            const parent = node(`quantity-parent-${++serial}`);
            parent.minus = node(`minus-${serial}`); parent.plus = node(`plus-${serial}`);
            parent.minus.disabled = Number(child.value) <= 1;
            parent.plus.disabled = Number(child.value) >= 9;
            child.parentElement = parent;
            quantityInputs.set(data['data-order-quantity'], child);
          }
        }
      },
    });
    nodes.set(id, el);
    return el;
  };
  document = { getElementById: node, querySelector: node, activeElement: null };
  const ctx = {
    document, PRODUCTS, quoteOrder, getFoundationProducts, createReport,
    Date: { now: () => now },
    URL: { revokeObjectURL() {} },
    FormData: class { constructor() { this.data = new Map([...fields].map(([key, field]) => [key, field.value])); } get(key) { return this.data.get(key) ?? null; } },
    effectToast: message => effects.toasts.push(message),
    effectChapter: id => effects.chapters.push(id),
    setTimeout(fn) { const id = ++timerSerial; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const api = runInNewContext(`
    const $=id=>document.getElementById(id),page=$('beautyPage'),scroll=$('beautyScroll');
    const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const star='<svg></svg>',money=value=>Number.isInteger(value)?String(value):value.toFixed(2);
    const selectedProducts=new Map(),order={items:[],submitted:false,fromCart:false};
    let currentReport=createReport(${score}),reader={tab:'advice'},foundationSwipe=null,swipeStart=null,wheelGesture=null,touchStart=null;
    let sheetFocus=null,overlayGeneration=0,modalKind='',posterPreviewUrl='';
    const toast=message=>effectToast(message),inert=(el,value)=>{if(el)el.inert=value;};
    const later=(fn,delay)=>setTimeout(fn,delay);
    const reportReady=()=>!!currentReport&&!page.hidden;
    const selectChapter=id=>{reader.tab=id;effectChapter(id);};
    ${executable}
    ({ init(){page.hidden=false;$('beautyOverlay').hidden=true;page.innerHTML=collectionHTML(currentReport)+foundationHTML();},
      toggleProduct,selectedItems,orderSheet,changeOrderQuantity,closeSheet,selectFoundation,
      state(){return {selected:selectedItems(),order,reader,modalKind};},
      setChapter(id){reader.tab=id;updateCartDock();} });
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
  const input = (id, value) => {
    const control = quantityInputs.get(id);
    assert.ok(control, `quantity input exists for ${id}`);
    control.value = String(value);
    dispatch('input', { target: control });
    return control;
  };
  const submit = (data = { name: '小明', mobile: '13800138000', address: '上海市静安区测试路100号' }) => {
    for (const [key, value] of Object.entries(data)) fields.get(key).value = value;
    return dispatch('submit', { target: node('beautyOrderForm') });
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
  return { api, node, click, input, submit, pointer, dispatch, effects, fields, quantityInputs, cartControls, timers, state: () => plain(api.state()), flushTimers() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } } };
}

test('collection selection uses real controller toggles and a combined quote with twelve available SKUs', () => {
  const h = harness();
  assert.equal(h.cartControls.size, 12);
  assert.deepEqual(h.state().selected, []);
  h.click({ cartToggle: 'base-normal' });
  h.click({ cartToggle: 'blush' });
  assert.deepEqual(h.state().selected, [{ id: 'base-normal', quantity: 1 }, { id: 'blush', quantity: 1 }]);
  assert.equal(h.cartControls.get('blush').getAttribute('aria-pressed'), 'true');
  assert.equal(h.node('beautyCartDock').hidden, false);
  assert.match(h.node('beautyCartDock').innerHTML, /¥279/);
  h.click({ action: 'checkout-cart' });
  assert.equal(h.state().order.fromCart, true);
  assert.equal(h.node('beautySubmitOrder').textContent, '提交订单 · ¥279');
  assert.match(h.node('beautyOrderTotals').innerHTML, /−¥20/);
});

test('quantity edits immediately recalculate stacking savings and survive cancelling and reopening checkout', () => {
  const h = harness();
  h.click({ cartToggle: 'base-normal' });
  h.click({ action: 'checkout-cart' });
  h.input('base-normal', 3);
  assert.equal(h.state().order.items[0].quantity, 3);
  assert.deepEqual(h.state().selected, [{ id: 'base-normal', quantity: 3 }]);
  assert.match(h.node('beautyOrderTotals').innerHTML, /−¥60/);
  assert.equal(h.node('beautySubmitOrder').textContent, '提交订单 · ¥540');
  h.api.closeSheet();
  assert.equal(h.node('beautyOverlay').hidden, true);
  h.click({ action: 'checkout-cart' });
  assert.equal(h.quantityInputs.get('base-normal').value, '3');
  h.click({ orderStep: '-1', orderId: 'base-normal' });
  assert.equal(h.quantityInputs.get('base-normal').value, '2');
  assert.equal(h.node('beautySubmitOrder').textContent, '提交订单 · ¥360');
});

test('invalid quantity entries keep the last valid quote and block submission until corrected', () => {
  const h = harness();
  h.api.orderSheet(PRODUCTS.find(product => product.id === 'base-normal'));
  for (const value of ['', '0', '-1', '10', '1.5', 'oops']) {
    h.input('base-normal', value);
    assert.equal(h.state().order.items[0].quantity, 1);
    assert.equal(h.node('beautySubmitOrder').disabled, true);
    h.submit();
    assert.equal(h.state().order.submitted, false);
    assert.equal(h.state().modalKind, 'order');
    assert.equal(h.node('beautyOrderError').hidden, false);
  }
  h.input('base-normal', 2);
  assert.equal(h.node('beautySubmitOrder').disabled, false);
  assert.equal(h.quantityInputs.get('base-normal').customValidity, '');
  h.submit();
  assert.equal(h.state().order.submitted, true);
  assert.equal(h.state().modalKind, 'success');
  assert.match(h.node('beautySheetBody').innerHTML, /¥360/);
});

test('one invalid quantity continues to block checkout while another quantity is edited', () => {
  const h = harness();
  h.api.orderSheet([{ id: 'base-normal', quantity: 1 }, { id: 'blush', quantity: 1 }], true);
  h.input('base-normal', 0);
  h.input('blush', 2);
  assert.equal(h.node('beautySubmitOrder').disabled, true);
  h.submit();
  assert.equal(h.state().order.submitted, false);
  h.input('base-normal', 1);
  assert.equal(h.node('beautySubmitOrder').disabled, false);
  assert.equal(h.node('beautySubmitOrder').textContent, '提交订单 · ¥378');
});

test('quantity step controls honor one-to-nine limits and preserve entered shipping details', () => {
  const h = harness();
  h.api.orderSheet(PRODUCTS.find(product => product.id === 'hair'));
  h.fields.get('name').value = '保留姓名';
  h.click({ orderStep: '-1', orderId: 'hair' });
  assert.equal(h.state().order.items[0].quantity, 1);
  h.input('hair', 9);
  h.click({ orderStep: '1', orderId: 'hair' });
  assert.equal(h.state().order.items[0].quantity, 9);
  h.click({ orderStep: '-1', orderId: 'hair' });
  assert.equal(h.state().order.items[0].quantity, 8);
  assert.equal(h.fields.get('name').value, '保留姓名');
});

test('removing items updates cart selection, drops the discount, and safely disables empty checkout', () => {
  const h = harness();
  h.api.orderSheet([{ id: 'base-normal', quantity: 1 }, { id: 'blush', quantity: 1 }], true);
  h.click({ orderRemove: 'base-normal' });
  assert.deepEqual(h.state().selected, [{ id: 'blush', quantity: 1 }]);
  assert.equal(h.cartControls.get('base-normal').getAttribute('aria-pressed'), 'false');
  assert.match(h.node('beautyOrderTotals').innerHTML, /−¥0/);
  assert.equal(h.node('beautySubmitOrder').textContent, '提交订单 · ¥99');
  h.click({ orderRemove: 'blush' });
  assert.deepEqual(h.state().order.items, []);
  assert.deepEqual(h.state().selected, []);
  assert.equal(h.node('beautyCartDock').hidden, true);
  assert.equal(h.node('beautySubmitOrder').disabled, true);
  assert.equal(h.node('beautySubmitOrder').textContent, '请先选择商品');
  assert.doesNotMatch(h.node('beautyOrderTotals').innerHTML, /再选 ¥0/);
  h.submit();
  assert.equal(h.state().order.submitted, false);
  h.api.closeSheet();
  h.click({ action: 'checkout-cart' });
  assert.equal(h.node('beautyOverlay').hidden, true);
  assert.match(h.effects.toasts.at(-1), /先选/);
});

test('shipping validation rejects empty names, malformed mobiles, short addresses, and overlong fields', () => {
  const valid = { name: '小明', mobile: '13800138000', address: '上海市静安区测试路100号' };
  for (const patch of [{ name: '   ' }, { name: '名'.repeat(31) }, { mobile: '12800138000' }, { mobile: '1380013800' }, { mobile: '138001380000' }, { mobile: 'abcdefghijk' }, { address: '上海市' }, { address: '        ' }, { address: '地'.repeat(121) }]) {
    const h = harness();
    h.api.orderSheet(PRODUCTS[0]);
    h.submit({ ...valid, ...patch });
    assert.equal(h.state().order.submitted, false, JSON.stringify(patch));
    assert.equal(h.state().modalKind, 'order');
    assert.equal(h.node('beautyOrderError').hidden, false);
  }
});

test('successful cart checkout is locked against repeat submit and clears only the purchased selection', () => {
  const h = harness();
  h.click({ cartToggle: 'base-normal' });
  h.click({ cartToggle: 'blush' });
  h.click({ action: 'checkout-cart' });
  h.submit();
  assert.equal(h.state().order.submitted, true);
  assert.deepEqual(h.state().selected, []);
  assert.equal(h.node('beautyCartDock').hidden, true);
  assert.equal(h.cartControls.get('blush').getAttribute('aria-pressed'), 'false');
  const sheets = h.effects.sheets.length;
  h.dispatch('submit', { target: h.node('beautyOrderForm') });
  assert.equal(h.effects.sheets.length, sheets);
  assert.match(h.node('beautySheetBody').innerHTML, /138\*\*\*\*8000/);
  assert.doesNotMatch(h.node('beautySheetBody').innerHTML, /13800138000|测试路100号/);
});

test('single-product checkout applies discounts independently without discarding the cart', () => {
  const h = harness();
  h.click({ cartToggle: 'hair' });
  h.click({ productBuy: 'base-normal' });
  assert.equal(h.state().order.fromCart, false);
  assert.equal(h.node('beautySubmitOrder').textContent, '提交订单 · ¥180');
  h.input('base-normal', 2);
  h.submit();
  assert.deepEqual(h.state().selected, [{ id: 'hair', quantity: 1 }]);
  assert.match(h.node('beautySheetBody').innerHTML, /−¥40/);
  h.click({ productBuy: 'lip' });
  assert.equal(h.state().order.submitted, false);
  assert.deepEqual(h.state().order.items, [{ id: 'lip', quantity: 1 }]);
});

test('cart dock hides for product and order sheets and restores only after closing the sheet', () => {
  const h = harness();
  h.click({ cartToggle: 'base-normal' });
  assert.equal(h.node('beautyCartDock').hidden, false);
  assert.equal(h.node('beautyPage').classList.contains('has-beauty-cart'), true);

  h.click({ productDetail: 'blush' });
  assert.equal(h.state().modalKind, 'product');
  assert.equal(h.node('beautyCartDock').hidden, true);
  assert.equal(h.node('beautyPage').classList.contains('has-beauty-cart'), false);
  h.api.closeSheet();
  assert.equal(h.node('beautyCartDock').hidden, false);

  h.click({ action: 'checkout-cart' });
  assert.equal(h.state().modalKind, 'order');
  assert.equal(h.node('beautyCartDock').hidden, true);
  h.input('base-normal', 3);
  assert.equal(h.node('beautyCartDock').hidden, true, 'recalculating order savings must not bring the dock above the sheet');
  h.click({ orderStep: '-1', orderId: 'base-normal' });
  assert.equal(h.node('beautyCartDock').hidden, true);
  h.api.closeSheet();
  assert.equal(h.node('beautyCartDock').hidden, false);
  assert.match(h.node('beautyCartDock').innerHTML, /¥360/);
  assert.equal(h.node('beautyPage').classList.contains('has-beauty-cart'), true);
});

test('closing a sheet cannot restore an empty cart dock or a dock on the overview chapter', () => {
  const h = harness();
  h.click({ cartToggle: 'hair' });
  h.click({ action: 'checkout-cart' });
  h.click({ orderRemove: 'hair' });
  h.api.closeSheet();
  assert.equal(h.node('beautyCartDock').hidden, true);
  h.click({ cartToggle: 'hair' });
  h.api.setChapter('overview');
  h.click({ productDetail: 'hair' });
  h.api.closeSheet();
  assert.equal(h.node('beautyCartDock').hidden, true);
  assert.equal(h.node('beautyPage').classList.contains('has-beauty-cart'), false);
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
  assert.deepEqual(h.state().selected, []);
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
