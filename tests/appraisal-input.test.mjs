import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('public/appraisal-input-model.js', root), 'utf8'), context);
const model = context.JianxAppraisalInput;
const photo = (type = 'image/jpeg', size = 1024) => ({ name: 'photo', type, size });

test('Unicode counting and truncation preserve whole emoji at the 250 character boundary', () => {
  const value = '你'.repeat(249) + '😀尾';
  assert.equal(model.countText(value), 251);
  assert.equal(model.normalizeText(value), '你'.repeat(249) + '😀');
  assert.equal(model.countText(model.normalizeText(value)), 250);
});

test('upload accepts nine distinct files and accounts for an existing draft', () => {
  const files = Array.from({ length: 10 }, () => photo());
  assert.equal(model.selectFiles(files).accepted.length, 9);
  assert.equal(model.selectFiles(files, 7).accepted.length, 2);
  assert.equal(model.selectFiles(files, 9).accepted.length, 0);
  assert.equal(model.selectFiles(files, 7).errors[0], '每次最多选择 9 张照片');
});

test('invalid and oversized files do not consume valid photo slots', () => {
  const valid = photo('image/png', model.MAX_BYTES);
  const result = model.selectFiles([photo('text/html'), photo('image/jpeg', model.MAX_BYTES + 1), valid], 8);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0], valid);
  assert.equal(result.errors.length, 2);
});

test('upload avoids active SVG and unsupported unrenderable media', () => {
  for (const type of ['image/svg+xml', 'image/heic', 'application/javascript', '']) {
    assert.equal(model.selectFiles([photo(type)]).accepted.length, 0);
  }
});

test('cancelled picker preserves the existing draft', () => {
  const result = model.selectFiles([], 4);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.errors.length, 0);
});

test('homepage integrates the replica before the controller and retains beauty entry', () => {
  const html = readFileSync(new URL('public/index.html', root), 'utf8');
  const controller = readFileSync(new URL('public/app.js', root), 'utf8');
  assert.ok(html.indexOf('src="appraisal-conversation.js') < html.indexOf('src="app.js'));
  assert.match(html, /for="inputField">鉴定问题/);
  assert.doesNotMatch(html, /id="appraisalUseSample"/);
  assert.match(controller, /appraisal\.send\(\{text:value,photos:/);
  assert.match(controller, /!e\.isComposing/);
  assert.match(controller, /appraisal\.close\(\);window\.beautyExperience\.open/);
  assert.match(controller, /appraisal\.reset\(\)/);
  assert.doesNotMatch(controller, /最多选择 3 张照片/);
});

test('upload dialog offers device photos with concise limits and production copy', () => {
  const html = readFileSync(new URL('public/index.html', root), 'utf8');
  const dialog = html.match(/<dialog\b[^>]*id="appraisalUploadDialog"[^>]*>[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(dialog, 'upload dialog remains available');
  assert.match(dialog, /id="appraisalChooseFiles"/);
  assert.match(dialog, /从设备选择照片/);
  assert.match(dialog, /最多 9 张，每张不超过 12MB/);
  assert.match(dialog, /图片仅在本机预览/);
  assert.doesNotMatch(dialog, /演示|示例|示范/);
});

// Execute the real composer functions without starting homepage timers. These
// checks cover handoff ownership and draft preservation at the UI boundary.
function composerHarness({ value = '', photos = [], busy = false, uploading = false, accept = true } = {}) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', isComposing: false, hidden: false, innerHTML: '', attrs: {}, classes: new Set(),
      setAttribute(name, value) { this.attrs[name] = value; },
      blur() { this.blurCount = (this.blurCount || 0) + 1; },
      classList: { toggle(name, enabled) { const el = elements.get(id); if (enabled) el.classes.add(name); else el.classes.delete(name); } }
    });
    return elements.get(id);
  };
  const state = { photos, busy, selected: '鉴美妆' };
  const calls = [];
  const sandbox = vm.createContext({
    $: get, state, uploading, appraisalInput: model, document: { activeElement: null },
    escaped: value => String(value).replaceAll('"', '&quot;'),
    appraisal: { send(payload) { calls.push(payload); if (accept && payload.photos.length) state.busy = true; return accept; } }
  });
  const source = readFileSync(new URL('public/app.js', root), 'utf8');
  const functions = source.slice(source.indexOf('function syncInput(){'), source.indexOf('\ncreateCards();'));
  assert.ok(functions.length > 0);
  vm.runInContext(functions, sandbox);
  get('inputField').value = value;
  return { sandbox, state, calls, get };
}

test('composer cannot submit empty, busy or decoding drafts', () => {
  for (const config of [{ value: ' \n ' }, { value: '请鉴定', busy: true }, { photos: [photo()], uploading: true }]) {
    const h = composerHarness(config);
    h.sandbox.syncInput();
    h.sandbox.sendMessage();
    assert.equal(h.get('sendBtn').disabled, true);
    assert.equal(h.calls.length, 0);
    assert.equal(h.get('inputField').value, config.value || '');
    assert.equal(h.state.photos.length, config.photos?.length || 0);
  }
});

test('failed conversation handoff keeps the draft and photo ownership', () => {
  const photos = [{ url: 'blob:uploaded-1', name: 'one.jpg' }];
  const h = composerHarness({ value: '请看看这件商品', photos, accept: false });
  h.sandbox.sendMessage();
  assert.equal(h.calls.length, 1);
  assert.equal(h.get('inputField').value, '请看看这件商品');
  assert.equal(h.state.photos, photos);
  assert.equal(h.get('inputField').blurCount || 0, 0);
});

test('accepted handoff transfers a photo snapshot and clears only the composer', () => {
  const photos = [{ url: 'blob:uploaded-1', name: 'one.jpg' }];
  const h = composerHarness({ value: '  请看看这件商品  ', photos });
  h.sandbox.sendMessage();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].text, '请看看这件商品');
  assert.equal(h.calls[0].skill, '鉴美妆');
  assert.notEqual(h.calls[0].photos, photos);
  assert.equal(h.calls[0].photos[0], photos[0]);
  assert.equal(h.state.photos.length, 0);
  assert.equal(h.get('inputField').value, '');
  assert.equal(h.get('attachmentTray').hidden, true);
  assert.equal(h.get('sendBtn').disabled, true);
  assert.equal(h.get('sendBtn').attrs['aria-label'], '正在鉴定');
  assert.equal(h.get('inputField').blurCount, 1);
});

test('composer defers Unicode truncation until composition finishes', () => {
  const value = '你'.repeat(249) + '😀尾';
  const h = composerHarness({ value });
  h.get('inputField').isComposing = true;
  h.sandbox.syncInput();
  assert.equal(h.get('inputField').value, value);
  h.get('inputField').isComposing = false;
  h.sandbox.syncInput();
  assert.equal(h.get('inputField').value, '你'.repeat(249) + '😀');
  assert.equal(h.get('wordCount').textContent, '250/250');
});
