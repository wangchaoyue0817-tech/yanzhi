import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS, createReport, getFoundationProducts } from '../public/beauty-model.js';

test('all twelve catalog products retain distinct IDs and current and crossed-out prices', () => {
  assert.equal(PRODUCTS.length, 12);
  assert.equal(new Set(PRODUCTS.map(product => product.id)).size, 12);
  for (const product of PRODUCTS) {
    assert.ok(product.name && product.shade && product.image);
    assert.ok(Number.isFinite(product.price) && product.price > 0);
    assert.ok(product.originalPrice > product.price);
    assert.ok(product.reason && product.features.length && product.usage);
  }
});

test('foundation sorting retains all three individual products and places the suitable one first', () => {
  const snapshot = structuredClone(PRODUCTS);
  for (const skin of ['oily', 'dry', 'normal']) {
    const products = getFoundationProducts(skin);
    assert.equal(products.length, 3);
    assert.equal(products[0].id, `base-${skin}`);
    assert.deepEqual(new Set(products.map(product => product.id)), new Set(['base-dry', 'base-normal', 'base-oily']));
  }
  assert.equal(getFoundationProducts()[0].id, 'base-normal');
  assert.deepEqual(PRODUCTS, snapshot);
});

test('every score tier recommends the same complete set of independently purchasable products', () => {
  for (const score of [52, 68, 80, 90, 97]) {
    const report = createReport(score);
    assert.deepEqual(new Set(report.areas.flatMap(area => area.productIds)), new Set(PRODUCTS.map(product => product.id)));
    const eye = report.areas.find(area => area.id === 'eyes');
    const skin = report.areas.find(area => area.id === 'skin');
    const style = report.areas.find(area => area.id === 'style');
    assert.deepEqual(eye.productIds, ['eye', 'eyeliner', 'lashes']);
    assert.equal(skin.productIds.length, 4);
    assert.equal(skin.productIds.at(-1), 'blush');
    assert.deepEqual(style.productIds, ['earrings', 'style']);
  }
});
