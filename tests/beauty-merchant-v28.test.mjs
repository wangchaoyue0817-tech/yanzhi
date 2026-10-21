import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRODUCTS } from '../public/beauty-model.js';
import { merchantHTML } from '../public/beauty-merchant.js';

test('merchant destination renders the selected product and existing information for every SKU', () => {
  for (const product of PRODUCTS) {
    const html = merchantHTML(product);
    assert.ok(html.includes('data-merchant-product="' + product.id + '"'));
    assert.ok(html.includes(product.name));
    assert.ok(html.includes(product.shade));
    assert.ok(html.includes(product.usage));
    assert.ok(product.features.every(feature => html.includes(feature)));
    assert.ok(html.includes('background-position:' + product.atlasPosition));
    assert.ok(html.includes('background-size:' + product.atlasSize));
    assert.ok(html.includes('现价' + product.price + '元'));
    assert.ok(html.includes('原价' + product.originalPrice + '元'));
  }
});

test('merchant destination is honest about demo transactions and has only a back action', () => {
  const html = merchantHTML(PRODUCTS[0]);
  assert.match(html, /商家小程序/);
  assert.match(html, /购买页面演示，暂未接入真实交易/);
  assert.match(html, /id="beautyMerchantTitle" tabindex="-1"/);
  assert.equal((html.match(/<button\b/g) || []).length, 1);
  assert.match(html, /data-merchant-back aria-label="返回报告"/);
  assert.doesNotMatch(html, /role="dialog"|aria-modal|data-action|前往|支付|下单成功|收货|满\s*200|多选/);
});

test('merchant product copy, attributes and atlas declarations cannot inject markup or CSS', () => {
  const html = merchantHTML({
    ...PRODUCTS[0], id: 'x" onfocus="alert(1)', name: '<script>alert(1)</script>',
    brand: '<b>brand</b>', shade: '" /><img src=x onerror=alert(1)>',
    features: ['<iframe src=x>'], usage: "<svg onload='x'>", price: '<b>0</b>',
    originalPrice: 'x', image: 'javascript:alert(1)',
    atlasPosition: '50% 0%;color:red', atlasSize: '400% 300%;position:fixed',
  });
  assert.doesNotMatch(html, /<script|<iframe|<img src=x|onfocus="alert|style="[^"]*color:red|position:fixed|javascript:/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&quot; onfocus=&quot;alert\(1\)/);
  assert.match(html, /background-position:50% 50%;background-size:400% 300%/);
  assert.match(html, /现价—元/);
  const imageAttack = merchantHTML({ ...PRODUCTS[0], image: 'assets/x.png");color:red;/*' });
  assert.doesNotMatch(imageAttack, /x\.png&quot;\);color/);
  assert.match(imageAttack, /x\.png%22%29;color:red;/);
});

test('merchant CSS stays a standalone full page with a 44px back target and hidden support', () => {
  const css = readFileSync(new URL('../public/beauty-merchant-v28.css', import.meta.url), 'utf8');
  assert.match(css, /\.beauty-merchant \{[^}]*position:absolute;inset:0;[^}]*overflow:auto;/);
  assert.match(css, /\.beauty-merchant\[hidden\] \{ display:none!important;/);
  assert.match(css, /\.beauty-page \.beauty-merchant-back \{[^}]*width:44px;min-height:44px;/);
  assert.match(css, /\.beauty-page \.beauty-merchant-back:focus-visible/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.doesNotMatch(css, /position:fixed|bottom-sheet/);
});
