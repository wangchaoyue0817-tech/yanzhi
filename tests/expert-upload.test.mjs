import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const validationSource = readFileSync(new URL('../public/appraisal-input-model.js', import.meta.url), 'utf8');
const uploadSource = readFileSync(new URL('../public/expert-upload.js', import.meta.url), 'utf8');
const bag = { category: { name: '包袋' }, brand: '香奈儿 Chanel', series: '2.55' };
const file = (name, type = 'image/jpeg', size = 500) => ({ name, type, size });

function harness(decode = () => Promise.resolve()) {
  class Element {
    children = [];
    events = new Map();
    attributes = new Map();
    classList = new Set();
    files = [];
    set innerHTML(markup) {
      for (const [, className] of markup.matchAll(/class="([^"]+)"/g)) {
        const child = new Element();
        child.className = className;
        this.children.push(child);
      }
    }
    get lastElementChild() { return this.children.at(-1); }
    querySelector(selector) { return this.children.find(child => `.${child.className}` === selector); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    addEventListener(type, handler) { this.events.set(type, handler); }
    click() { this.clicked = true; return this.events.get('click')?.(); }
    focus() { this.focused = true; }
  }

  const urls = new Map();
  const released = [];
  let serial = 0;
  const sandbox = vm.createContext({
    Image: class { decode() { return decode(urls.get(this.src)); } },
    URL: {
      createObjectURL(photo) {
        const url = `blob:${++serial}`;
        urls.set(url, photo);
        return url;
      },
      revokeObjectURL(url) { urls.delete(url); released.push(url); }
    }
  });
  sandbox.window = sandbox;
  vm.runInContext(validationSource, sandbox);
  vm.runInContext(uploadSource, sandbox);
  const view = new Element();
  view.ownerDocument = { createElement: () => new Element() };
  const uploader = sandbox.ExpertUpload.create(view);
  const input = view.querySelector('.ep-upload-input');
  return {
    uploader,
    view,
    urls,
    released,
    input,
    choose: view.querySelector('.ep-upload-choose'),
    list: view.querySelector('.ep-upload-photos'),
    count: view.querySelector('.ep-upload-count'),
    status: view.querySelector('.ep-upload-status'),
    chooseFiles(...files) {
      input.files = files;
      input.value = files.length ? 'fakepath' : '';
      return input.events.get('change')();
    }
  };
}

test('choose an item, add a local preview, preserve it after back and remove with focus restored', async () => {
  const h = harness();
  assert.equal(h.view.hidden, true);
  h.uploader.show(bag);
  assert.equal(h.view.hidden, false);
  assert.equal(h.view.querySelector('.ep-upload-context').textContent, '包袋 · 香奈儿 Chanel');
  assert.equal(h.view.querySelector('.ep-upload-series').textContent, '2.55');
  h.choose.click();
  assert.equal(h.input.clicked, true);

  await h.chooseFiles(file('正面.jpg'));
  assert.equal(h.count.textContent, '1 / 9');
  assert.equal(h.input.value, '');
  assert.equal(h.list.children[0].children[0].alt, '正面.jpg');
  h.uploader.hide();
  h.uploader.show(bag);
  assert.equal(h.list.children.length, 1);
  assert.equal(h.released.length, 0);

  h.list.children[0].lastElementChild.click();
  assert.deepEqual(h.released, ['blob:1']);
  assert.equal(h.list.hidden, true);
  assert.equal(h.choose.focused, true);
});

test('reject invalid and unreadable files, keep valid photos and enforce the existing nine-photo limit', async () => {
  const h = harness(photo => photo.name === 'unreadable.jpg' ? Promise.reject(new Error('decode')) : Promise.resolve());
  h.uploader.show(bag);
  await h.chooseFiles(file('bad.svg', 'image/svg+xml'), file('large.jpg', 'image/jpeg', 13 * 1024 * 1024), file('unreadable.jpg'), file('背面.jpg'));
  assert.match(h.status.textContent, /JPG.*12MB.*无法读取/);
  assert.equal(h.list.children.length, 1);
  assert.deepEqual(h.released, ['blob:1']);
  await h.chooseFiles(...Array.from({ length: 10 }, (_, index) => file(`细节-${index}.jpg`)));
  assert.equal(h.count.textContent, '9 / 9');
  assert.equal(h.choose.disabled, true);
  assert.match(h.status.textContent, /最多选择 9 张/);
  h.uploader.reset();
  assert.equal(h.urls.size, 0);
  assert.equal(h.view.hidden, true);
});

test('switching the product releases in-flight previews and prevents old files appearing in the new product', async () => {
  let completeOldDecode;
  const h = harness(photo => photo.name === '旧照片.jpg'
    ? new Promise(resolve => { completeOldDecode = resolve; })
    : Promise.resolve());
  h.uploader.show(bag);
  const oldBatch = h.chooseFiles(file('旧照片.jpg'), file('旧批次.jpg'));
  assert.equal(h.choose.disabled, true);
  h.uploader.show({ ...bag, series: 'Classic Flap' });
  assert.deepEqual(h.released, ['blob:1']);
  await h.chooseFiles(file('新照片.jpg'));
  completeOldDecode();
  await oldBatch;
  assert.equal(h.list.children.length, 1);
  assert.equal(h.list.children[0].children[0].alt, '新照片.jpg');
  assert.deepEqual(h.released, ['blob:1']);
});
