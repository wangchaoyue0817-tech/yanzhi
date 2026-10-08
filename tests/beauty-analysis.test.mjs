import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { TIERS, PRODUCTS, createReport } from '../public/beauty-model.js';

const publicRoot = new URL('../public/', import.meta.url);
const read = path => readFileSync(new URL(path, publicRoot), 'utf8');
const html = read('index.html');
const controller = read('beauty-analysis.js');
const css = read('beauty-analysis.css');
const reportCss = read('beauty-report-v17.css');

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

test('keyboard navigation retains the visible dialog focus loop without exposing hidden report chapters', () => {
  const handlers = {};
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {hidden:true, addEventListener(){}, classList:{values:new Set(),add(value){this.values.add(value);}}});
    return nodes.get(id);
  };
  const document = { getElementById:node, addEventListener:(name, handler)=>{handlers[name]=handler;} };
  runInNewContext(controller.replace(/^import .*;$/gm,''), {
    document, matchMedia:()=>({matches:false,addEventListener(){}}), window:{},
    location:{search:''}, URLSearchParams,
  });
  const first = {tabIndex:0,closest:()=>null, getClientRects:()=>[{}], focus(){document.activeElement=this;}};
  const last = {...first};
  node('beautyPage').hidden=false;
  node('beautyReport').hidden=false;
  node('beautyPage').querySelectorAll=()=>[first,last];
  let prevented=false;
  const event={key:'Tab',shiftKey:false,preventDefault(){prevented=true;}};
  document.activeElement=first;
  handlers.keydown(event);
  assert.equal(prevented,false, 'forward traversal can reach visible controls');
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
  assert.equal(entry.src, 'beauty-analysis.js?v=21');
  for (const filename of ['beauty-model.js', 'beauty-poster.js']) {
    assert.ok(controller.includes(`from './${filename}?v=18'`), `${filename} must bypass the preceding version's cache`);
  }
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
  const harness = reportHarness({ reducedMotion: true });
  harness.api.show(createReport(90), reportPhotos());
  const renderedElements = elements(harness.node('beautyReport').innerHTML);
  const definedIds = new Set([...staticIds, ...dynamicElements.filter(element => element.id).map(element => element.id), ...renderedElements.filter(element => element.id).map(element => element.id)]);
  const referencedIds = [...controller.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
  assert.ok(referencedIds.length > 0);
  for (const id of new Set(referencedIds)) assert.ok(definedIds.has(id), `controller references missing element #${id}`);

  for (const element of [...staticElements, ...dynamicElements, ...renderedElements]) {
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'for']) {
      if (!element[attribute] || element[attribute].includes('$') || element[attribute].includes("'")) continue;
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

function reportHarness({ reducedMotion = false } = {}) {
  const nodes = new Map();
  const timers = new Map();
  const frames = new Map();
  const effects = { celebrations: [], stopped: 0, observers: [], revoked: [], posterRequests: [], blobCount: 0 };
  let timerId = 0;
  let frameId = 0;
  let resolvePoster;
  let document;
  const posterReady = new Promise(resolve => { resolvePoster = resolve; });
  const node = id => {
    if (!nodes.has(id)) {
      const classes = new Set();
      const attributes = {};
      const handlers = new Map();
      nodes.set(id, {
        id, hidden: true, value: '', innerHTML: '', textContent: '', scrollTop: 0,
        dataset: {}, style: {setProperty(name,value){this[name]=value;}}, inert: false, isConnected: true, handlers,
        classList: {
          add(...values) { values.forEach(value => classes.add(value)); },
          remove(...values) { values.forEach(value => classes.delete(value)); },
          contains(value) { return classes.has(value); },
          toggle(value, force) { const add = force ?? !classes.has(value); if (add) classes.add(value); else classes.delete(value); return add; },
        },
        addEventListener(name, callback) { handlers.set(name, callback); },
        setAttribute(name, value) { attributes[name] = value; },
        getAttribute(name) { return attributes[name]; },
        querySelector(selector) { return node(`${id}:${selector}`); },
        querySelectorAll() { return []; },
        getBoundingClientRect() { return { top: 0 }; },
        focus() { document.activeElement = this; },
        scrollTo(options) { this.lastScroll = options; this.scrollTop = options.top; },
      });
    }
    return nodes.get(id);
  };
  document = { getElementById: node, querySelector: selector => node(selector), addEventListener() {}, activeElement: null };
  const api = runInNewContext(controller.replace(/^import .*;$/gm, '') + `
    ({
      show: showReport, cycle: cycleCopy, reset: resetEntry, formatCopy: resultCopy,
      cancel: cancelPresentation, poster: posterSheet, closeSheet, scenes: sceneSheet,
      setPosterCache(value) { posterCache = value; },
      setPreviewURL(value) { posterPreviewUrl = value; },
      addPendingFrame(id) { frames.add(id); },
      state() { return { currentReport, photos, posterCache, copyVariant, generation, timerCount: timers.size, frameCount: frames.size }; }
    });
  `, {
    document, TIERS, PRODUCTS, createReport,
    matchMedia: () => ({ matches: reducedMotion, addEventListener() {} }),
    window: {}, location: { search: '' }, URLSearchParams,
    URL: {
      createObjectURL() { return `blob:poster-${++effects.blobCount}`; },
      revokeObjectURL(url) { effects.revoked.push(url); },
    },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    IntersectionObserver: class {
      constructor(callback, options) { this.callback = callback; this.options = options; this.disconnected = false; this.observed = []; this.unobserved = []; effects.observers.push(this); }
      observe(element) { this.observed.push(element); }
      unobserve(element) { this.unobserved.push(element); }
      disconnect() { this.disconnected = true; }
    },
    startBeautyCelebration(options) {
      effects.celebrations.push(options);
      let stopped = false;
      return () => { if (!stopped) { effects.stopped++; stopped = true; } };
    },
    renderBeautyPoster(options) { effects.posterRequests.push(options); return posterReady; },
  });
  node('beautyPage').hidden = false;
  const click = action => node('beautyPage').handlers.get('click')({ target: { closest: () => ({ dataset: { action }, hasAttribute: () => false }) } });
  const runDelay = delay => {
    for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); }
  };
  return { api, node, document, effects, timers, frames, click, runDelay, resolvePoster };
}

const reportPhotos = () => ({
  before: 'photo-before', after: 'photo-after',
  parts: Object.fromEntries(['hair', 'brows', 'eyes', 'skin', 'lips', 'style'].map(id => [id, { before: `${id}-before`, after: `${id}-after` }])),
});

function markupText(markup) {
  return markup.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function renderedCopy(markup) {
  return markupText(markup.match(/<p class="beauty-result-copy">([\s\S]*?)<\/p>/)?.[1] ?? '');
}

test('v21 keeps a short result cover and mounts complete report chapters directly below it', () => {
  const harness = reportHarness({ reducedMotion: true });
  const report = createReport(90, 2);
  const photos = reportPhotos();
  harness.api.show(report, photos);
  const rendered = harness.node('beautyReport').innerHTML;
  assert.equal(harness.node('beautyReport').hidden, false);
  assert.equal(harness.node('beautyReport').dataset.tier, report.tier.id);
  assert.ok(rendered.includes(`<h1 tabindex="-1">${report.title}</h1>`));
  assert.equal(renderedCopy(rendered), report.copy.match(/^.*?[。！？]/u)?.[0] ?? report.copy);
  const cover = rendered.slice(0, rendered.indexOf('<div id="beautyDetail"'));
  assert.doesNotMatch(cover, /beauty-comparison|beauty-radar-wrap|beauty-area-pair|beauty-product-compact/);
  assert.doesNotMatch(cover, /data-action="open-report"|beauty-preview-card|你的下一幕/);
  assert.match(cover, /data-action="poster"/);
  assert.match(rendered, /id="beautyDetail" class="beauty-reader"(?:>|\s+(?!hidden)[^>]*>)/);
  assert.doesNotMatch(rendered, /id="beautyDetail"[^>]*\bhidden/);
  const overview = rendered.slice(rendered.indexOf('id="beautyOverview"'), rendered.indexOf('class="beauty-advice-panel"'));
  assert.equal((rendered.match(/id="beautyOverview"/g) || []).length, 1);
  assert.ok(overview.includes('更出彩的你'));
  assert.ok(overview.includes('beauty-compare-grid'));
  assert.ok(overview.includes('beautyBefore'));
  assert.ok(overview.includes('beautyAfter'));
  assert.ok(overview.includes('beauty-radar-wrap'));
  assert.ok(overview.includes('五官表现'));
  assert.ok(overview.includes(`超过 <b>${report.afterPercentile}%</b> 的人`));
  assert.equal((overview.match(/class="beauty-dimension" data-dimension=/g) || []).length, 5);
  assert.doesNotMatch(rendered, /放大对比|详细建议|data-area-detail|data-action="compare"/);
  assert.doesNotMatch(controller, /function areaSheet\(|function comparisonSheet\(|case 'compare':/);
  const adviceLists = [...rendered.matchAll(/<ol class="beauty-inline-steps">([\s\S]*?)<\/ol>/g)];
  assert.equal(adviceLists.length, 6);
  for (const [index, match] of adviceLists.entries()) {
    assert.equal((match[1].match(/<li>/g) || []).length, 3);
    report.areas[index].steps.forEach(step => assert.ok(match[1].includes(step)));
    assert.ok(rendered.includes(`src="${photos.parts[report.areas[index].id].before}"`));
    assert.ok(rendered.includes(`src="${photos.parts[report.areas[index].id].after}"`));
  }
  assert.equal((rendered.match(/class="beauty-product beauty-product-compact"/g) || []).length, 6);
  assert.doesNotMatch(rendered, /beauty-product-purchase|data-product-buy=/);
  assert.equal((rendered.match(/data-product-detail=/g) || []).length, 6);
  assert.equal((rendered.match(/class="beauty-product-reason"/g) || []).length, 6);
});

test('result copy emphasizes the opening sentence without losing text or permitting HTML injection', () => {
  const harness = reportHarness({ reducedMotion: true });
  for (const tier of TIERS) {
    for (let variant = 0; variant < 5; variant++) {
      const report = createReport(tier.sampleScore, variant);
      harness.api.show(report, reportPhotos());
      const markup = harness.node('beautyReport').innerHTML;
      const detailCopy = markup.match(/<p class="beauty-reader-copy">([\s\S]*?)<\/p>/)?.[1];
      const lead = detailCopy.match(/<strong class="beauty-copy-lead">([\s\S]*?)<\/strong>/)?.[1];
      const body = detailCopy.match(/<span class="beauty-copy-body">([\s\S]*?)<\/span>/)?.[1];
      const sentenceEnd = report.copy.search(/[。！？]/) + 1;
      assert.equal(markupText(lead), report.copy.slice(0, sentenceEnd));
      assert.equal(markupText(body), report.copy.slice(sentenceEnd));
      assert.equal(markupText(detailCopy), report.copy, `${tier.id} detail copy ${variant} is preserved`);
      assert.equal(renderedCopy(markup), report.copy.slice(0, sentenceEnd), 'cover only shows the opening sentence');
    }
  }
  const escaped = '<img src=x onerror="bad()">&这一眼。<script>bad()</script>别漏掉"引号"。';
  const formatted = harness.api.formatCopy(escaped);
  assert.doesNotMatch(formatted, /<img|<script/);
  assert.ok(formatted.includes('&lt;img'));
  assert.ok(formatted.includes('&amp;'));
  assert.ok(formatted.includes('&quot;'));
  assert.equal(markupText(formatted), escaped);
  for (const copy of ['', '没有句号的完整评价', '只有一个句子。']) {
    const result = harness.api.formatCopy(copy);
    assert.doesNotMatch(result, /beauty-copy-lead/);
    assert.equal(markupText(result), copy);
  }
});

test('all tiers and boundary scores connect before and after photos with one accurate improvement arrow', () => {
  const harness = reportHarness({ reducedMotion: true });
  for (const score of [0, ...TIERS.map(tier => tier.sampleScore), 100]) {
    const report = createReport(score);
    const photos = reportPhotos();
    harness.api.show(report, photos);
    const markup = harness.node('beautyReport').innerHTML;
    const comparison = markup.slice(markup.indexOf('<div class="beauty-comparison">'), markup.indexOf('<div class="beauty-features-heading">'));
    const transition = comparison.match(/<div class="beauty-compare-transition" aria-label="([^"]+)">([\s\S]*?)<\/div>/);
    assert.ok(transition);
    const increase = `预计增加 ${report.afterScore - report.score} 分`;
    assert.equal(transition[1], increase);
    assert.equal(markupText(transition[2]), increase);
    assert.match(transition[2], /<i aria-hidden="true"><svg[\s\S]*<path/);
    assert.equal((comparison.match(/class="beauty-compare-transition"/g) || []).length, 1);
    assert.doesNotMatch(comparison, /beauty-lift-line|妆发调整后/);
    assert.ok(comparison.indexOf('beauty-compare-grid') < comparison.indexOf('beauty-compare-transition'));
    assert.ok(comparison.indexOf('beauty-compare-transition') < comparison.indexOf('beauty-compare-scores'));
    for (const [side, src, label] of [['before', photos.before, '现在的你'], ['after', photos.after, '变美后的你']]) {
      const figure = comparison.match(new RegExp(`<figure class="beauty-compare-${side}">([\\s\\S]*?)<\\/figure>`))?.[1];
      assert.ok(figure && figure.includes(`src="${src}"`) && figure.includes(label), `${score}: ${side} image is retained`);
    }
    const scores = [...comparison.matchAll(/<div class="beauty-compare-score"><strong>(\d+)<small>分<\/small><\/strong><span>([^<]+)<\/span><\/div><p>超过 <b>([\d.]+)%<\/b> 的人<\/p>/g)];
    assert.equal(scores.length, 2);
    assert.deepEqual(scores.map(([, score, tier, percentile]) => [Number(score), tier, Number(percentile)]), [
      [report.score, report.tier.name, report.percentile],
      [report.afterScore, report.afterTier.name, report.afterPercentile],
    ]);
    for (const keyword of report.keywords) assert.ok(!comparison.includes(keyword), 'the removed right-side keywords do not return');
    const seal = markup.match(/<span class="beauty-portrait-seal">([^<]+)<\/span>/)?.[1];
    assert.equal(seal, report.tier.name);
    assert.doesNotMatch(seal, /[a-z]/i, 'portrait recognition uses Chinese at every tier');
    assert.match(markup, /class="beauty-reveal-halo" aria-hidden="true"/);
    assert.doesNotMatch(markup, /beauty-reveal-beam/);
  }
});

test('five facial dimensions use an SVG gradient radar and five distinct gradient tracks', () => {
  const harness = reportHarness({ reducedMotion: true });
  const report = createReport(52);
  harness.api.show(report, reportPhotos());
  const markup = harness.node('beautyReport').innerHTML;
  const radar = markup.match(/<svg class="beauty-radar"[\s\S]*?<\/svg>/)?.[0];
  assert.match(radar, /role="img" aria-label="五官表现五维图"/);
  for (const gradient of ['beautyRadarFill', 'beautyRadarStroke']) {
    const definition = radar.match(new RegExp(`<linearGradient id="${gradient}"[^>]*>([\\s\\S]*?)<\\/linearGradient>`))?.[1];
    assert.ok(definition, `${gradient} exists as an SVG definition`);
    const stops = elements(definition).filter(element => element.tag === 'stop');
    assert.ok(stops.length >= 3);
    assert.ok(new Set(stops.map(stop => stop['stop-color'])).size >= 3);
    assert.ok(reportCss.includes(`url(#${gradient})`), `${gradient} is actually painted`);
  }
  assert.match(radar, /<radialGradient id="beautyRadarAura">/);
  assert.match(radar, /fill="url\(#beautyRadarAura\)"/);
  const radarNodes = elements(radar).filter(element => element.class === 'beauty-radar-node');
  assert.equal(radarNodes.length, 5);
  assert.equal(new Set(radarNodes.map(node => node.style)).size, 5);
  const dimensions = [...markup.matchAll(/<div class="beauty-dimension" data-dimension="(\d)"><span>([^<]+)<\/span><b>(\d+)<\/b><i><span style="width:(\d+)%"><\/span><\/i><\/div>/g)];
  assert.equal(dimensions.length, 5);
  dimensions.forEach(([, index, label, score, width], position) => {
    assert.equal(Number(index), position);
    assert.equal(label, report.dimensions[position].label);
    assert.equal(Number(score), report.dimensions[position].score);
    assert.equal(width, score);
  });
  const gradientBlocks = [
    reportCss.match(/\.beauty-dimension\{([^}]+)\}/)?.[1],
    ...[1, 2, 3, 4].map(index => reportCss.match(new RegExp(`\\.beauty-dimension\\[data-dimension="${index}"\\]\\{([^}]+)\\}`))?.[1]),
  ];
  const palettes = gradientBlocks.map(block => {
    assert.ok(block, 'every dimension has a palette');
    const from = block.match(/--dimension-from:(#[0-9a-f]{6})/i)?.[1];
    const to = block.match(/--dimension-to:(#[0-9a-f]{6})/i)?.[1];
    assert.ok(from && to);
    assert.notEqual(from, to);
    return `${from}/${to}`;
  });
  assert.equal(new Set(palettes).size, 5);
  assert.ok(reportCss.includes('background:linear-gradient(90deg,var(--dimension-from),var(--dimension-to))'));
});

test('strength and focus retain their analysis in separately styled cards with decorative icons', () => {
  const harness = reportHarness({ reducedMotion: true });
  for (const tier of TIERS) {
    const report = createReport(tier.sampleScore);
    harness.api.show(report, reportPhotos());
    const markup = harness.node('beautyReport').innerHTML;
    for (const [type, heading, value] of [['strength', '你的优势', report.strength], ['focus', '优先调整', report.focus]]) {
      const card = markup.match(new RegExp(`<div class="beauty-insight beauty-insight-${type}">([\\s\\S]*?)<\\/div>`))?.[1];
      assert.ok(card);
      assert.match(card, /<small><i aria-hidden="true"><svg/);
      assert.ok(card.includes(`</i>${heading}</small>`));
      assert.equal(markupText(card.match(/<p>([\s\S]*?)<\/p>/)?.[1]), value);
    }
  }
});

test('all six recommendation cards have one detail action, paired prices and no purchase action', () => {
  const harness = reportHarness({ reducedMotion: true });
  harness.api.show(createReport(90), reportPhotos());
  const markup = harness.node('beautyReport').innerHTML;
  const cards = [...markup.matchAll(/<article class="beauty-product beauty-product-compact">([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 6);
  const ids = new Set();
  for (const [, card] of cards) {
    const controls = elements(card).filter(element => element.tag === 'button');
    assert.equal(controls.length, 1);
    const detail = controls[0];
    const product = PRODUCTS.find(item => item.id === detail['data-product-detail']);
    assert.ok(product);
    ids.add(product.id);
    assert.equal(detail['aria-label'], `查看${product.name}详情`);
    assert.doesNotMatch(card, /data-product-buy|购买|beauty-product-purchase/);
    assert.ok(card.includes(`aria-label="现价${product.price}元"`));
    assert.ok(card.includes(`<del aria-label="原价${product.originalPrice}元">¥${product.originalPrice}</del>`));
    assert.ok(card.includes(product.shortReason));
    assert.ok(card.includes('推荐理由'));
    product.shortFeatures.forEach(feature => assert.ok(card.includes(feature)));
  }
  assert.equal(ids.size, PRODUCTS.length);
});

test('the result cover exposes sharing without the removed restart, slogan or extra caption', () => {
  const harness = reportHarness({ reducedMotion: true });
  harness.api.show(createReport(52), reportPhotos());
  const markup = harness.node('beautyReport').innerHTML;
  assert.doesNotMatch(markup, /换张照片，发现另一面的你|图灵鉴X · 每一种美，都有自己的表达|照片 · 得分 · 六部位变美攻略|beauty-report-footer|data-action="restart"/);
  const cover = markup.slice(0, markup.indexOf('<div id="beautyDetail"'));
  assert.match(cover, /class="beauty-primary beauty-cover-share" data-action="poster"/);
  assert.match(cover, /查看我的颜值海报/);
  assert.equal((cover.match(/data-action="open-report"/g) || []).length, 0);
  assert.equal((cover.match(/data-action="poster"/g) || []).length, 1);
});

test('scrolling dismisses celebration without an extra guide control or lazy report reveal', () => {
  for (const reducedMotion of [false, true]) {
    const harness = reportHarness({ reducedMotion });
    const report = createReport(97);
    const scroll = harness.node('beautyScroll');
    harness.api.show(report, reportPhotos());
    const rendered = harness.node('beautyReport').innerHTML;
    assert.doesNotMatch(rendered, /beauty-scroll-cue|beauty-guide-copy|data-action="explore"|data-reveal/);
    assert.ok(!rendered.includes(report.scrollHint));
    assert.doesNotMatch(controller, /function exploreReport\(|case 'explore':/);
    assert.equal(harness.effects.observers.length, 0, 'chapters switch directly instead of hiding a long scroll report');
    harness.runDelay(1200);
    scroll.scrollTop = 40;
    scroll.handlers.get('scroll')();
    assert.equal(harness.effects.stopped, 0);
    scroll.scrollTop = 41;
    scroll.handlers.get('scroll')();
    assert.equal(harness.effects.stopped, reducedMotion ? 0 : 1);
  }
});

test('reduced motion creates no reveal observer or pending celebration delay', () => {
  const harness = reportHarness({ reducedMotion: true });
  harness.api.show(createReport(52), reportPhotos());
  assert.equal(harness.effects.observers.length, 0);
  assert.equal(harness.timers.size, 0);
  assert.equal(harness.frames.size, 0);
});

test('changing the copy wraps through all five choices, preserves report facts and photos, and cancels stale presentation and poster data', () => {
  const harness = reportHarness();
  const original = createReport(97, 4);
  const photos = reportPhotos();
  harness.api.show(original, photos);
  harness.runDelay(1200);
  assert.equal(harness.effects.celebrations.length, 1);
  harness.api.setPosterCache(Promise.resolve({ blob: {} }));
  harness.api.setPreviewURL('blob:previous-copy-poster');
  const oldGeneration = harness.api.state().generation;
  harness.api.addPendingFrame(88);
  harness.frames.set(88, () => { throw new Error('stale count frame executed'); });
  harness.click('copy-next');
  const changed = harness.api.state();
  assert.equal(changed.currentReport.copyVariant, 0);
  assert.equal(changed.copyVariant, 0);
  assert.equal(changed.currentReport.title, createReport(97, 0).title);
  assert.notEqual(changed.currentReport.copy, original.copy);
  for (const key of ['score', 'percentile', 'afterScore', 'afterPercentile']) assert.equal(changed.currentReport[key], original[key]);
  assert.deepEqual(changed.currentReport.areas, original.areas);
  assert.deepEqual(changed.currentReport.products, original.products);
  assert.equal(changed.photos, photos);
  assert.equal(changed.posterCache, null);
  assert.deepEqual(harness.effects.revoked, ['blob:previous-copy-poster']);
  assert.equal(harness.effects.stopped, 1);
  assert.ok(changed.generation > oldGeneration);
  assert.equal(changed.frameCount, 0);
  assert.equal(harness.frames.size, 0);
  assert.equal([...harness.timers.values()].filter(timer => timer.delay === 1200).length, 0, 'changing copy does not replay fireworks');
  assert.equal(harness.node('beautyOverlay').hidden, true);
  assert.equal(renderedCopy(harness.node('beautyReport').innerHTML), changed.currentReport.copy.match(/^.*?[。！？]/u)?.[0] ?? changed.currentReport.copy);
  for (let variant = 1; variant <= 4; variant++) {
    harness.click('copy-next');
    assert.equal(harness.api.state().currentReport.copyVariant, variant);
  }
  harness.api.reset();
  assert.equal(harness.api.state().copyVariant, 0);
  assert.equal(harness.api.state().currentReport, null);
  assert.equal(harness.api.state().photos, null);
  assert.equal(harness.api.state().posterCache, null);
  assert.equal(harness.node('beautyReport').innerHTML, '');
  assert.equal(harness.node('beautyComposer').hidden, false);
});

test('poster generation receives the current wording and all six before/after parts, and reuses only the current report cache', async () => {
  const harness = reportHarness({ reducedMotion: true });
  const report = createReport(80, 3);
  const photos = reportPhotos();
  harness.api.show(report, photos);
  const pending = harness.click('poster');
  assert.equal(harness.effects.posterRequests.length, 1);
  const request = harness.effects.posterRequests[0];
  assert.equal(request.report, report);
  assert.equal(request.parts, photos.parts);
  assert.equal(request.beforeSrc, photos.before);
  assert.equal(request.afterSrc, photos.after);
  assert.equal(Object.keys(request.parts).length, 6);
  harness.resolvePoster({ blob: { type: 'image/png' } });
  await pending;
  assert.equal(harness.effects.blobCount, 1);
  assert.ok(harness.node('beautySheetBody').innerHTML.includes(`${report.title} · ${report.score} 分分享海报`));
  assert.ok(harness.node('beautySheetBody').innerHTML.includes('data-action="download"'));
  harness.api.closeSheet();
  assert.deepEqual(harness.effects.revoked, ['blob:poster-1']);
  await harness.click('poster');
  assert.equal(harness.effects.posterRequests.length, 1, 'same report reuses rendered poster');
  assert.equal(harness.effects.blobCount, 2);
});

test('a poster resolving after the copy changes cannot replace the current report or reopen its sheet', async () => {
  const harness = reportHarness({ reducedMotion: true });
  harness.api.show(createReport(90), reportPhotos());
  const pending = harness.api.poster();
  harness.click('copy-next');
  const current = harness.api.state().currentReport;
  harness.resolvePoster({ blob: { type: 'image/png' } });
  await pending;
  assert.equal(harness.api.state().currentReport, current);
  assert.equal(current.copyVariant, 1);
  assert.equal(harness.api.state().posterCache, null);
  assert.equal(harness.node('beautyOverlay').hidden, true);
  assert.equal(harness.effects.blobCount, 0, 'no object URL is created for a stale poster');
  assert.doesNotMatch(harness.node('beautySheetBody').innerHTML, /beauty-poster-image/);
});

test('celebration starts after the score reveal and is omitted when motion is reduced or the reader has moved on', () => {
  for (const scenario of ['normal', 'reduced', 'scrolled', 'closed', 'cancelled']) {
    const harness = reportHarness({ reducedMotion: scenario === 'reduced' });
    harness.api.show(createReport(97), reportPhotos());
    assert.equal(harness.effects.celebrations.length, 0);
    if (scenario === 'scrolled') harness.node('beautyScroll').scrollTop = 80;
    if (scenario === 'closed') harness.node('beautyPage').hidden = true;
    if (scenario === 'cancelled') harness.api.cancel();
    harness.runDelay(1200);
    assert.equal(harness.effects.celebrations.length, scenario === 'normal' ? 1 : 0, scenario);
    if (scenario === 'normal') {
      assert.equal(harness.effects.celebrations[0].score, 97);
      assert.equal(harness.effects.celebrations[0].host, harness.node('beautyReport').querySelector('.beauty-result-hero'));
      harness.api.cancel();
      assert.equal(harness.effects.stopped, 1);
    }
  }
});
