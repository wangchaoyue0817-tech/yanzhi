import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { PRODUCTS, createReport } from '../public/beauty-model.js';

const controller = readFileSync(new URL('../public/beauty-analysis.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/beauty-commerce-v22.css', import.meta.url), 'utf8');
const sliceFunction = (start, end) => {
  const from = controller.indexOf(start), to = controller.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `shipped renderer ${start} is available`);
  return controller.slice(from, to);
};
const renderer = runInNewContext(`
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => Number.isInteger(value) ? String(value) : value.toFixed(2);
  const selectedProducts = new Map();
  ${sliceFunction('function productImage(', 'function productCard(')}
  ${sliceFunction('function accessoryHTML(', 'function areaHTML(')}
  ${sliceFunction('function collectionHTML(', 'function selectedItems(')}
  ({ accessoryHTML, collectionHTML, selectedProducts });
`, { PRODUCTS });

const attributes = value => Object.fromEntries([...value.matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)].map(match => [match[1], match[2] ?? '']));
const elements = (markup, tag) => [...markup.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map(match => attributes(match[1]));
const cssBlock = selector => {
  const from = css.indexOf(selector + ' {');
  assert.ok(from >= 0, `${selector} has a layout rule`);
  return css.slice(css.indexOf('{', from) + 1, css.indexOf('}', from));
};

test('accessories render two wearable close-ups with independent product detail entries', () => {
  const html = renderer.accessoryHTML({ before: 'assets/beauty-earring-detail-v23.png', after: 'assets/beauty-necklace-detail-v23.png' });
  const images = elements(html, 'img'), buttons = elements(html, 'button');
  assert.equal(elements(html, 'figure').length, 2);
  assert.equal(images.length, 2);
  assert.deepEqual(images.map(image => image.src), ['assets/beauty-earring-detail-v23.png', 'assets/beauty-necklace-detail-v23.png']);
  assert.deepEqual(images.map(image => image.alt), ['耳部佩戴珍珠耳钉的局部特写', '锁骨处佩戴珍珠细链项链的局部特写']);
  assert.deepEqual(buttons.map(button => button['data-product-detail']), ['earrings', 'style']);
  assert.ok(buttons.every(button => button.type === 'button' && button['aria-label'].includes('详情')));
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

test('all five reports build one twelve-item shopping list with complete row content', () => {
  for (const score of [52, 68, 80, 90, 97]) {
    const report = createReport(score), html = renderer.collectionHTML(report);
    assert.equal(elements(html, 'div').filter(node => node.class === 'beauty-collection-list').length, 1);
    const rows = [...html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/g)];
    assert.equal(rows.length, 12);
    assert.equal(new Set(rows.map(row => attributes(row[1])['data-collection-item'])).size, 12);
    assert.match(html, /共 12 件/);
    assert.match(html, /满 <b>200<\/b> 减 <b>20<\/b>/);
    assert.match(html, /优惠可叠加/);
    for (const [, rawAttributes, body] of rows) {
      const id = attributes(rawAttributes)['data-collection-item'];
      const product = PRODUCTS.find(value => value.id === id);
      assert.ok(product);
      const buttons = elements(body, 'button');
      assert.equal(buttons.length, 2, `${id}: selection and detail remain separate controls`);
      assert.equal(buttons[0]['data-cart-toggle'], id);
      assert.equal(buttons[0]['aria-pressed'], 'false');
      assert.equal(buttons[1]['data-product-detail'], id);
      assert.match(buttons[0]['aria-label'], /^选择/);
      assert.match(buttons[1]['aria-label'], /详情$/);
      assert.ok(body.includes(`<strong>${product.shortName || product.name}</strong>`));
      assert.ok(body.includes(`<small>${product.shade}</small>`));
      assert.ok(body.includes(`<b>¥${product.price}</b>`));
      assert.ok(body.includes(`<del>¥${product.originalPrice}</del>`));
      const image = elements(body, 'span').find(node => node.role === 'img');
      assert.equal(image['aria-label'], product.name);
      assert.ok(image.style.includes(product.image));
    }
    assert.doesNotMatch(html, /beauty-collection-grid|beauty-collection-hint|点击商品查看详情/);
  }
});

test('shopping list renders the selected SKU and removes duplicate recommendations', () => {
  const report = createReport(90);
  report.areas[0].productIds.push('hair');
  renderer.selectedProducts.set('hair', 1);
  try {
    const html = renderer.collectionHTML(report);
    const controls = elements(html, 'button').filter(button => button['data-cart-toggle']);
    assert.equal(controls.length, 12);
    assert.deepEqual(controls.filter(button => button['aria-pressed'] === 'true').map(button => button['data-cart-toggle']), ['hair']);
  } finally {
    renderer.selectedProducts.clear();
  }
});

test('each report ends its product collection with one browse-more button without a destination', () => {
  for (const score of [52, 68, 80, 90, 97]) {
    const html = renderer.collectionHTML(createReport(score));
    const matches = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
      .filter(match => attributes(match[1]).class?.split(/\s+/).includes('beauty-collection-more'));
    assert.equal(matches.length, 1, `${score}: exactly one browse-more entry`);
    const [button] = matches, attrs = attributes(button[1]);
    assert.equal(attrs.type, 'button');
    assert.match(button[2], /<span>逛逛更多好物<\/span>/);
    assert.equal((html.match(/逛逛更多好物/g) || []).length, 1);
    assert.ok(button.index > html.lastIndexOf('</article>'), `${score}: entry follows all product rows`);
    assert.match(html.slice(html.lastIndexOf('</article>') + '</article>'.length, button.index), /^\s*<\/div>\s*$/);
    assert.match(html.slice(button.index + button[0].length), /^\s*<\/section>\s*$/);
    assert.ok(!Object.hasOwn(attrs, 'disabled'));
    assert.ok(!Object.keys(attrs).some(key => /^(?:href|formaction|onclick|data-)/.test(key)), 'destination and commerce actions remain unset');
    const icons = elements(button[2], 'svg');
    assert.equal(icons.length, 1);
    assert.equal(icons[0]['aria-hidden'], 'true');
  }
});

test('browse-more entry uses a full-width gradient touch target and accessible focus treatment', () => {
  const button = cssBlock('.beauty-collection-more');
  assert.match(button, /min-height:\s*48px/);
  assert.match(button, /width:\s*100%/);
  assert.match(button, /background:\s*linear-gradient/);
  assert.match(css, /\.beauty-collection-more:focus-visible\s*\{[^}]*outline:/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.beauty-collection-more[^}]*transition:\s*none/);
});

test('foundation tabs use light text and a gradient underline while keeping touch targets', () => {
  const tab = cssBlock('.beauty-foundation-tabs button');
  assert.match(tab, /min-height:\s*44px/);
  assert.match(tab, /background:\s*transparent/);
  assert.match(tab, /border:\s*0/);
  assert.match(cssBlock('.beauty-foundation-tabs button:after'), /background:\s*linear-gradient/);
  assert.match(cssBlock('.beauty-foundation-tabs button[aria-selected=true]:after'), /opacity:\s*1/);
});

test('accessory details are side by side and product recommendations form compact shopping rows', () => {
  assert.match(cssBlock('.beauty-accessory-grid'), /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(cssBlock('.beauty-accessory-detail>img'), /aspect-ratio:\s*4\s*\/\s*3/);
  const list = cssBlock('.beauty-collection-list');
  assert.match(list, /display:\s*flex/);
  assert.match(list, /flex-direction:\s*column/);
  assert.match(cssBlock('.beauty-collection-item'), /grid-template-columns:\s*44px\s+minmax\(0,\s*1fr\)/);
  assert.match(cssBlock('.beauty-select-product'), /min-height:\s*44px/);
  assert.match(cssBlock('.beauty-collection-link'), /grid-template-columns:\s*\d+px\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
