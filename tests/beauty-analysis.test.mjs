import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const publicRoot = new URL('../public/', import.meta.url);
const read = path => readFileSync(new URL(path, publicRoot), 'utf8');
const html = read('index.html');
const controller = read('beauty-analysis.js');
const css = read('beauty-analysis.css');

function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
    .map(match => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '']));
}

function elements(source) {
  return [...source.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*?)>/gi)]
    .map(match => ({ tag: match[1].toLowerCase(), ...attributes(match[2]) }));
}

const staticElements = elements(html);
const dynamicElements = elements(controller);
const byId = new Map(staticElements.filter(element => element.id).map(element => [element.id, element]));

test('keyboard navigation reveals offscreen report controls and retains the dialog focus loop', () => {
  const handlers = {};
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {hidden:true, addEventListener(){}});
    return nodes.get(id);
  };
  const reveals = [0,1].map(() => ({inert:true, classList:{values:new Set(), add(value){this.values.add(value);}}}));
  const document = { getElementById:node, addEventListener:(name, handler)=>{handlers[name]=handler;} };
  runInNewContext(controller.replace(/^import .*;$/gm,''), {
    document, matchMedia:()=>({matches:false,addEventListener(){}}), window:{},
    location:{search:''}, URLSearchParams,
  });
  const first = {closest:()=>null, getClientRects:()=>[{}], focus(){document.activeElement=this;}};
  const last = {...first};
  node('beautyPage').hidden=false;
  node('beautyReport').hidden=false;
  node('beautyReport').querySelectorAll=()=>reveals;
  node('beautyPage').querySelectorAll=()=>[first,last];
  let prevented=false;
  const event={key:'Tab',shiftKey:false,preventDefault(){prevented=true;}};
  document.activeElement=first;
  handlers.keydown(event);
  assert.ok(reveals.every(el=>!el.inert && el.classList.values.has('is-visible')));
  assert.equal(prevented,false, 'forward traversal can reach the revealed report controls');
  document.activeElement=last;
  handlers.keydown(event);
  assert.equal(document.activeElement,first);
  assert.equal(prevented,true);
  event.shiftKey=true;
  handlers.keydown(event);
  assert.equal(document.activeElement,last);
});

test('the browser receives the feature as a module with resolvable named dependencies', async () => {
  const entry = staticElements.find(element => element.tag === 'script' && element.src?.split('?')[0] === 'beauty-analysis.js');
  assert.ok(entry, 'feature entry script must be included by the homepage');
  assert.equal(entry.type, 'module', 'named imports require browser module loading');
  assert.ok(staticElements.some(element => element.tag === 'link' && element.rel === 'stylesheet' && element.href?.split('?')[0] === 'beauty-analysis.css'));

  const imports = [...controller.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)];
  assert.ok(imports.length > 0);
  for (const [, names, path] of imports) {
    const moduleURL = new URL(path, new URL('beauty-analysis.js', publicRoot));
    assert.ok(existsSync(moduleURL), `missing dependency: ${path}`);
    const exports = await import(moduleURL.href);
    for (const imported of names.split(',').map(name => name.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
      assert.ok(Object.hasOwn(exports, imported), `${path} does not export ${imported}`);
    }
  }
});

test('controller ID references are backed by a unique static element or a rendered component', () => {
  const staticIds = staticElements.filter(element => element.id).map(element => element.id);
  assert.equal(new Set(staticIds).size, staticIds.length, 'duplicate static IDs can route events to the wrong screen');
  const definedIds = new Set([...staticIds, ...dynamicElements.filter(element => element.id).map(element => element.id)]);
  const referencedIds = [...controller.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
  assert.ok(referencedIds.length > 0);
  for (const id of new Set(referencedIds)) assert.ok(definedIds.has(id), `controller references missing element #${id}`);

  for (const element of [...staticElements, ...dynamicElements]) {
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'for']) {
      if (!element[attribute] || element[attribute].includes('$')) continue;
      for (const id of element[attribute].split(/\s+/)) assert.ok(definedIds.has(id), `${attribute} points to missing #${id}`);
    }
  }
});

test('entry, progress, nested sheet, and upload have accessible initial states', () => {
  const page = byId.get('beautyPage');
  const sheet = byId.get('beautySheet');
  assert.equal(page.role, 'dialog');
  assert.equal(page['aria-modal'], 'true');
  assert.ok(page['aria-label']);
  assert.ok(Object.hasOwn(page, 'hidden'));
  assert.equal(sheet.role, 'dialog');
  assert.equal(sheet['aria-modal'], 'true');
  assert.ok(byId.has(sheet['aria-labelledby']));
  assert.ok(Object.hasOwn(byId.get('beautyOverlay'), 'hidden'));
  for (const id of ['beautyScanning', 'beautyReport']) assert.ok(Object.hasOwn(byId.get(id), 'hidden'));
  for (const id of ['beautyMenu', 'beautyComposerSend']) {
    assert.equal(byId.get(id).tag, 'button');
    assert.ok(byId.get(id)['aria-label'], `icon-only control #${id} needs an accessible name`);
  }
  const progress = byId.get('beautyProgress');
  assert.equal(progress.role, 'progressbar');
  assert.ok(progress['aria-label']);
  assert.equal(Number(progress['aria-valuemin']), 0);
  assert.equal(Number(progress['aria-valuemax']), 100);
  assert.ok(Number(progress['aria-valuenow']) >= 0 && Number(progress['aria-valuenow']) <= 100);
  assert.equal(byId.get('beautyScanStep').role, 'status');
  assert.equal(byId.get('beautyPhotoInput').type, 'file');
  assert.ok(byId.get('beautyPhotoInput').accept.split(',').some(type => type.trim().startsWith('image/')));
});

function pngInfo(filename) {
  const buffer = readFileSync(new URL(filename, publicRoot));
  assert.deepEqual(buffer.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), `${filename} must contain a PNG`);
  let offset = 8;
  let header;
  let ended = false;
  const compressed = [];
  while (offset < buffer.length) {
    assert.ok(offset + 12 <= buffer.length, `${filename} has a truncated chunk header`);
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    assert.ok(offset + length + 12 <= buffer.length, `${filename} has a truncated ${type} chunk`);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], color: data[9], interlace: data[12] };
    if (type === 'IDAT') compressed.push(data);
    offset += length + 12;
    if (type === 'IEND') { ended = true; break; }
  }
  assert.ok(header && ended && compressed.length, `${filename} is missing required PNG chunks`);
  const decoded = inflateSync(Buffer.concat(compressed));
  assert.ok(decoded.length > 0);
  if (header.interlace === 0) {
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[header.color];
    assert.ok(channels, `${filename} has an unsupported PNG color type`);
    const bytesPerRow = Math.ceil(header.width * channels * header.bitDepth / 8) + 1;
    assert.equal(decoded.length, bytesPerRow * header.height, `${filename} must contain every raster row`);
  }
  return header;
}

test('the shipped portrait and product atlases contain complete usable image data', () => {
  const portraits = pngInfo('assets/beauty-portraits-v2.png');
  const products = pngInfo('assets/beauty-products-v2.png');
  assert.ok(portraits.width / 5 >= 250 && portraits.height / 2 >= 350, 'five before/after portraits need usable crop resolution');
  assert.ok(products.width / 3 >= 300 && products.height / 2 >= 300, 'six individual products need usable image resolution');

  const referencedAssets = new Set([...`${html}\n${controller}\n${css}`.matchAll(/['"](assets\/beauty[^'"]+|assets\/icons\/face-sparkle\.svg)['"]/g)].map(match => match[1]));
  for (const tier of ['natural','fresh','radiant','spotlight','icon']) {
    const path = 'assets/beauty-portrait-'+tier+'-v2.png';
    const pair = pngInfo(path);
    assert.ok(pair.width / 2 >= 650 && pair.height >= 900, 'each portrait needs detail for region crops and posters');
    assert.ok(referencedAssets.has(path), 'high resolution pair is wired to the report');
  }
  assert.ok(referencedAssets.has('assets/beauty-products-v2.png'));
  for (const path of referencedAssets) assert.ok(existsSync(new URL(path, publicRoot)), `missing runtime asset: ${path}`);
});

function uploadPresetHarness() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { hidden: true, value: '', addEventListener() {} });
    return nodes.get(id);
  };
  const calls = [];
  let resolveFixture;
  const ready = new Promise(resolve => { resolveFixture = resolve; });
  const renderSheet = body => {
    const busyAttributes = { 'aria-busy': 'true' };
    const parentElement = { setAttribute(name, value) { busyAttributes[name] = value; } };
    for (const element of elements(body).filter(element => element.id)) {
      nodes.set(element.id, {
        hidden: Object.hasOwn(element, 'hidden'),
        disabled: Object.hasOwn(element, 'disabled'),
        src: element.src ?? '',
        textContent: '',
        parentElement,
        busyAttributes,
      });
    }
  };
  const api = runInNewContext(controller.replace(/^import .*;$/gm, '') + `
    openSheet = (_title, body) => { overlayGeneration++; renderSheet(body); };
    fixture = index => { fixtureCalls.push(index); return fixtureReady; };
    ({ start: uploadSheet, invalidate: () => { overlayGeneration++; } });
  `, {
    document: { getElementById: node, addEventListener() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    window: {}, location: { search: '' }, URLSearchParams,
    renderSheet, fixtureCalls: calls, fixtureReady: ready,
  });
  return { api, node, nodes, calls, resolveFixture };
}

test('the upload preset stays disabled until its actual fixture photo is ready', async () => {
  const harness = uploadPresetHarness();
  const pending = harness.api.start();
  const photo = harness.node('beautyPresetPhoto');
  const start = harness.node('beautyPresetStart');
  assert.deepEqual(harness.calls, [3], 'preview and preset analysis use the same spotlight fixture');
  assert.equal(start.disabled, true, 'analysis cannot start while a different placeholder is visible');
  assert.equal(photo.hidden, true);
  assert.equal(photo.src, '', 'no legacy portrait is used as the pending preview');
  assert.equal(photo.busyAttributes['aria-busy'], 'true');

  const before = 'data:image/png;base64,selected-spotlight-before';
  harness.resolveFixture({ before, after: 'data:image/png;base64,selected-spotlight-after' });
  await pending;
  assert.equal(photo.src, before, 'only the actual before portrait becomes the preview');
  assert.equal(photo.hidden, false);
  assert.equal(photo.busyAttributes['aria-busy'], 'false');
  assert.equal(start.disabled, false);
  assert.equal(start.textContent, '解析这张照片 ↗');
});

test('a dismissed upload preset cannot write into a later sheet when its fixture resolves', async () => {
  for (const nextState of ['closed', 'replaced']) {
    const harness = uploadPresetHarness();
    const pending = harness.api.start();
    const originalPhoto = harness.node('beautyPresetPhoto');
    const originalStart = harness.node('beautyPresetStart');
    harness.api.invalidate();
    const nextPhoto = { src: 'next-sheet-photo', hidden: true, parentElement: { setAttribute() { throw new Error('stale parent write'); } } };
    const nextStart = { disabled: true, textContent: 'next-sheet-action' };
    if (nextState === 'replaced') {
      harness.nodes.set('beautyPresetPhoto', nextPhoto);
      harness.nodes.set('beautyPresetStart', nextStart);
    }
    harness.resolveFixture({ before: 'stale-fixture-photo', after: 'stale-fixture-after' });
    await pending;
    assert.equal(originalPhoto.src, '', `${nextState}: detached preview is untouched`);
    assert.equal(originalPhoto.hidden, true);
    assert.equal(originalStart.disabled, true);
    assert.equal(originalPhoto.busyAttributes['aria-busy'], 'true');
    assert.equal(nextPhoto.src, 'next-sheet-photo', `${nextState}: new sheet is untouched`);
    assert.equal(nextPhoto.hidden, true);
    assert.equal(nextStart.disabled, true);
    assert.equal(nextStart.textContent, 'next-sheet-action');
  }
});
