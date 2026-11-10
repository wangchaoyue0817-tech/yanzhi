import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createReport } from '../public/beauty-model.js';

const controller = readFileSync(new URL('../public/beauty-analysis.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/beauty-commerce-v22.css', import.meta.url), 'utf8');
const sliceFunction = (start, end) => {
  const from = controller.indexOf(start), to = controller.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `shipped renderer ${start} is available`);
  return controller.slice(from, to);
};
const renderer = runInNewContext(`
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  ${sliceFunction('function accessoryHTML(', 'function areaHTML(')}
  ${sliceFunction('function reportFooterHTML(', 'function priorityArea(')}
  ({ accessoryHTML, reportFooterHTML });
`);

const attributes = value => Object.fromEntries([...value.matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)].map(match => [match[1], match[2] ?? '']));
const elements = (markup, tag) => [...markup.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map(match => attributes(match[1]));
const cssBlock = selector => {
  const from = css.indexOf(selector + ' {');
  assert.ok(from >= 0, `${selector} has a layout rule`);
  return css.slice(css.indexOf('{', from) + 1, css.indexOf('}', from));
};

test('accessories render two wearable close-ups with independent direct purchase entries', () => {
  const html = renderer.accessoryHTML({ before: 'assets/beauty-earring-detail-v23.png', after: 'assets/beauty-necklace-detail-v23.png' });
  const images = elements(html, 'img'), buttons = elements(html, 'button');
  assert.equal(elements(html, 'figure').length, 2);
  assert.equal(images.length, 2);
  assert.deepEqual(images.map(image => image.src), ['assets/beauty-earring-detail-v23.png', 'assets/beauty-necklace-detail-v23.png']);
  assert.deepEqual(images.map(image => image.alt), ['耳部佩戴珍珠耳钉的局部特写', '锁骨处佩戴珍珠细链项链的局部特写']);
  assert.deepEqual(buttons.map(button => button['data-product-buy']), ['earrings', 'style']);
  assert.ok(buttons.every(button => button.type === 'button' && button['aria-label'].startsWith('立即购买')));
  assert.ok(images.every(image => image.loading === 'lazy' && image.draggable === 'false'));
  assert.doesNotMatch(html, /beauty-accessory-(?:natural|fresh|radiant|spotlight|icon)-v22|调整前|调整后|原来|之后/);
});

test('accessory source attributes are escaped rather than inserted as markup', () => {
  const html = renderer.accessoryHTML({ before: 'ear" onerror="bad()', after: '<neck>&' });
  const images = elements(html, 'img');
  assert.equal(images.length, 2);
  assert.equal(images[0].src, 'ear&quot; onerror=&quot;bad()');
  assert.equal(images[1].src, '&lt;neck&gt;&amp;');
  assert.ok(images.every(image => !Object.hasOwn(image, 'onerror')));
});

test('the footer previews the current report and links to its poster and daily ranking', () => {
  for (const score of [0, 52, 68, 80, 90, 97, 100]) {
    const report = createReport(score);
    const html = renderer.reportFooterHTML(report, 'portrait.jpg');
    assert.deepEqual(elements(html, 'button').map(node => node['data-action']), ['poster', 'ranking']);
    assert.deepEqual(elements(html, 'img').map(node => node.src), ['portrait.jpg']);
    assert.ok(html.includes(report.title));
    assert.ok(html.includes(report.score + ' 分 · ' + report.tier.name));
    assert.match(html, /查看我的报告/);
    assert.match(html, /查看我的排名/);
    assert.match(html, /可保存分享/);
    assert.doesNotMatch(html, /我的专属产品|逛逛更多好物|data-product-buy|超过.*%/);
  }
});

test('the footer escapes personal report text and portrait source attributes', () => {
  const report = createReport(90);
  const html = renderer.reportFooterHTML({ ...report, title: '<script>bad()</script>' }, 'photo" onerror="bad()');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.doesNotMatch(html, /<script| onerror="/);
});

test('foundation tabs use light text and a gradient underline while keeping touch targets', () => {
  const tab = cssBlock('.beauty-foundation-tabs button');
  assert.match(tab, /min-height:\s*44px/);
  assert.match(tab, /background:\s*transparent/);
  assert.match(tab, /border:\s*0/);
  assert.match(cssBlock('.beauty-foundation-tabs button:after'), /background:\s*linear-gradient/);
  assert.match(cssBlock('.beauty-foundation-tabs button[aria-selected=true]:after'), /opacity:\s*1/);
});

test('accessory details retain two columns and both footer buttons remain accessible on small screens', () => {
  assert.match(cssBlock('.beauty-accessory-grid'), /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(cssBlock('.beauty-accessory-detail>img'), /aspect-ratio:\s*4\s*\/\s*3/);
  assert.ok(Number(cssBlock('.beauty-finish-actions>button').match(/min-height:\s*(\d+)px/)[1]) >= 44);
  assert.match(cssBlock('.beauty-finish-actions>button:focus-visible'), /outline:/);
});
