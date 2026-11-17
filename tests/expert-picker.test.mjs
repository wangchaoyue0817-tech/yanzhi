import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function setup() {
  const nodes = new Map();
  const windowEvents = new Map();
  const upload = { selection: null, shown: false, show(selection) { this.selection = selection; this.shown = true; }, hide() { this.shown = false; }, reset() { this.selection = null; this.hide(); } };
  const document = { activeElement: null, getElementById: id => nodes.get(id), createElement: tag => new Element(tag) };

  class Element {
    constructor(tag, attributes = {}) {
      this.tag = tag;
      this.attributes = { ...attributes };
      this.dataset = {};
      this.style = { setProperty() {} };
      this.children = [];
      this.events = new Map();
      this.value = '';
      this.scrollTop = 0;
      this.scrollLeft = 0;
      this.clientWidth = 390;
      this.isConnected = true;
      for (const [name, value] of Object.entries(attributes)) {
        if (name.startsWith('data-')) {
          const key = name.slice(5).replace(/-([a-z])/gu, (_, a) => a.toUpperCase());
          this.dataset[key] = value;
        }
      }
      this.id = attributes.id ?? '';
    }
    set innerHTML(value) {
      this.markup = value;
      const elements = Array.from(value.matchAll(/<(\w+)\s+([^<>]+)>/gu), ([, tag, raw]) => {
        const attributes = Object.fromEntries(Array.from(raw.matchAll(/([\w-]+)="([^"]*)"/gu), ([, key, attr]) => [key, attr]));
        return new Element(tag, attributes);
      });
      this.children = elements.filter(el => el.tag === 'button' || el.dataset.epLetterGroup);
      for (const element of elements) if (element.id) nodes.set(element.id, element);
    }
    get innerHTML() { return this.markup ?? ''; }
    append(child) { this.children.push(child); if (child.id) nodes.set(child.id, child); }
    addEventListener(type, handler) { this.events.set(type, handler); }
    fire(type, data = {}) { this.events.get(type)?.({ target: this, ...data }); }
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    removeAttribute(name) { delete this.attributes[name]; }
    querySelector(selector) {
      if (selector === '.navbar') return nodes.get('navbar');
      const [, name, value] = selector.match(/^\[([^=]+)="([^"]+)"\]$/u) ?? [];
      return this.children.find(child => child.attributes[name] === value) ?? null;
    }
    getBoundingClientRect() { return { left: 0, top: 0, bottom: 52 }; }
    focus() { document.activeElement = this; }
    closest() { return this; }
  }

  for (const id of ['app', 'navbar', 'expertCta']) nodes.set(id, new Element('div', { id }));
  const cta = nodes.get('expertCta');
  cta.focus();
  nodes.get('app').append(cta);
  const entries = [null];
  let current = 0;
  const window = { ExpertUpload: { create: () => upload }, addEventListener: (type, handler) => windowEvents.set(type, handler) };
  const history = {
    get state() { return entries[current]; },
    pushState(state) { entries.splice(++current); entries.push(state); },
    replaceState(state) { entries[current] = state; },
    back() { current -= 1; windowEvents.get('popstate')?.({ state: entries[current] }); }
  };
  const context = vm.createContext({ document, history, window, ResizeObserver: class { observe() {} } });
  for (const file of ['expert-catalog.js', 'expert-directory.js', 'expert-picker.js']) {
    vm.runInContext(readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), context, { filename: file });
  }
  const get = id => nodes.get(id);
  const root = get('expertPickerRoot');
  const click = target => { assert.ok(target); root.fire('click', { target }); };
  return { get, root, click, window, history, upload, cta, document };
}

test('expert picker routes from category and brand to photo upload on the first series click', () => {
  const { get, root, click, window, history, upload, document, cta } = setup();
  window.expertPicker.open();
  assert.equal(root.dataset.view, 'categories');
  assert.equal(cta.inert, true);
  click(get('epCategoryGrid').querySelector('[data-ep-category="0"]'));
  assert.equal(root.dataset.view, 'product');
  assert.equal(get('epProductView').hidden, false);
  assert.equal(get('epSeriesLayer').hidden, true);
  assert.equal(get('epConfirm'), undefined);

  const field = get('epGroupSearch');
  assert.equal(field.placeholder, '搜索品牌');
  field.value = 'Classic Flap';
  field.fire('input');
  assert.match(get('epBrandGroups').innerHTML, /没有找到相关品牌/u);
  field.value = '香奈儿';
  field.fire('input');
  const brand = get('epBrandGroups').querySelector('[data-ep-brand="0"]');
  click(brand);
  assert.equal(get('epSeriesLayer').hidden, false);
  assert.equal(get('epProductView').inert, true);
  assert.equal(document.activeElement, get('epSeriesDrawer'));
  click(get('epSeriesMask'));
  assert.equal(get('epSeriesLayer').hidden, true);
  assert.equal(get('epProductView').inert, false);
  assert.equal(document.activeElement, brand);
  assert.equal(field.value, '香奈儿');

  click(brand);
  const seriesSearch = get('epStyleSearch');
  assert.equal(seriesSearch.placeholder, '搜索系列');
  seriesSearch.value = '香奈儿';
  seriesSearch.fire('input');
  assert.match(get('epSeriesGroups').innerHTML, /没有找到相关款式/u);
  seriesSearch.value = 'classic';
  seriesSearch.fire('input');
  click(get('epSeriesGroups').querySelector('[data-ep-style="0"]'));
  assert.equal(root.dataset.view, 'upload');
  assert.equal(get('epSeriesLayer').hidden, true);
  assert.equal(upload.shown, true);
  assert.equal(upload.selection.brand.name, '香奈儿 Chanel');
  assert.equal(upload.selection.series, 'Classic Flap');

  history.back();
  assert.equal(root.dataset.view, 'product');
  assert.equal(upload.shown, false);
  assert.equal(field.value, '香奈儿');
  assert.match(get('epBrandGroups').innerHTML, /Classic Flap/u);
  history.back();
  assert.equal(root.dataset.view, 'categories');
  history.back();
  assert.equal(root.hidden, true);
  assert.equal(document.activeElement, cta);
});
