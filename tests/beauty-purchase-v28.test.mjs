import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../public/beauty-model.js';
import { PURCHASE_LINKS, resolvePurchaseTarget } from '../public/beauty-purchase.js';

test('all known products default to a SKU-specific demonstration until merchant links are supplied', () => {
  assert.ok(Object.isFrozen(PURCHASE_LINKS));
  assert.deepEqual(PURCHASE_LINKS, {});
  for (const product of PRODUCTS) {
    assert.deepEqual(resolvePurchaseTarget(product.id), { type: 'demo', productId: product.id });
    for (const value of [undefined, null, '']) {
      assert.deepEqual(resolvePurchaseTarget(product.id, { [product.id]: value }), { type: 'demo', productId: product.id });
    }
  }
});

test('only known product IDs can resolve purchase destinations', () => {
  for (const id of ['', 'unknown', '__proto__', 'constructor', null, undefined, {}, 0, '<script>']) {
    assert.equal(resolvePurchaseTarget(id, { [id]: 'https://merchant.example' }), null);
  }
});

test('valid HTTPS merchant links preserve their path and query and are scoped to the selected SKU', () => {
  const links = { hair: 'https://wxaurl.cn/example-token?sku=hair&source=beauty', lip: 'https://merchant.example/lip' };
  assert.deepEqual(resolvePurchaseTarget('hair', links), { type: 'external', productId: 'hair', url: links.hair });
  assert.deepEqual(resolvePurchaseTarget('lip', links), { type: 'external', productId: 'lip', url: links.lip });
  assert.deepEqual(resolvePurchaseTarget('brow', links), { type: 'demo', productId: 'brow' });
  assert.deepEqual(resolvePurchaseTarget('hair', Object.create(links)), { type: 'demo', productId: 'hair' }, 'inherited destinations cannot override configuration');
});

test('unsafe or malformed configured links are unavailable and never silently route to a different product', () => {
  for (const link of ['http://merchant.example', 'javascript:alert(1)', 'data:text/html,<h1>bad</h1>', '//merchant.example', '/purchase/hair', 'not a URL', 'https://', 'https://user:password@merchant.example', 'https://user@merchant.example', 123, {}, []]) {
    assert.deepEqual(resolvePurchaseTarget('hair', { hair: link }), { type: 'unavailable', productId: 'hair' }, String(link));
  }
});
