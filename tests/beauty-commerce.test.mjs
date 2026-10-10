import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../public/beauty-model.js';
import { getFoundationProducts, quoteOrder } from '../public/beauty-commerce.js';

test('empty orders have no selected products, charges, savings, or gap', () => {
  const empty = { items: [], quantity: 0, subtotal: 0, discount: 0, total: 0, nextThresholdGap: 0 };
  assert.deepEqual(quoteOrder(), empty);
  assert.deepEqual(quoteOrder([]), empty);
});

test('a qualifying single product gets the same stacking discount as combined orders', () => {
  for (const [quantity, subtotal, discount, total] of [[1, 200, 20, 180], [2, 400, 40, 360], [3, 600, 60, 540], [9, 1800, 180, 1620]]) {
    const order = quoteOrder([{ id: 'base-normal', quantity }]);
    assert.equal(order.quantity, quantity);
    assert.equal(order.subtotal, subtotal);
    assert.equal(order.discount, discount);
    assert.equal(order.total, total);
    assert.equal(order.nextThresholdGap, 200);
    assert.deepEqual(order.items, [{ id: 'base-normal', quantity, price: 200, subtotal }]);
  }
});

test('combined orders sum the current prices and earn twenty yuan for every full two hundred', () => {
  const order = quoteOrder([{ id: 'base-normal', quantity: 3 }, { id: 'blush', quantity: 2 }]);
  assert.equal(order.quantity, 5);
  assert.equal(order.subtotal, 798);
  assert.equal(order.discount, 60);
  assert.equal(order.total, 738);
  assert.equal(order.nextThresholdGap, 2);
  assert.deepEqual(order.items, [
    { id: 'base-normal', quantity: 3, price: 200, subtotal: 600 },
    { id: 'blush', quantity: 2, price: 99, subtotal: 198 },
  ]);
});

test('discounts are removed or reduced immediately when the selection drops below a threshold', () => {
  const below = quoteOrder([{ id: 'lashes', quantity: 1 }, { id: 'style', quantity: 1 }]);
  assert.equal(below.subtotal, 198);
  assert.equal(below.discount, 0);
  assert.equal(below.total, 198);
  assert.equal(below.nextThresholdGap, 2);
  const above = quoteOrder([{ id: 'lashes', quantity: 1 }, { id: 'style', quantity: 1 }, { id: 'blush', quantity: 1 }]);
  assert.equal(above.subtotal, 297);
  assert.equal(above.discount, 20);
  assert.equal(above.total, 277);
  assert.equal(above.nextThresholdGap, 103);
  assert.equal(quoteOrder([{ id: 'blush', quantity: 4 }]).discount, 20);
  assert.equal(quoteOrder([{ id: 'blush', quantity: 5 }]).discount, 40);
});

test('duplicate SKUs merge in first-selected order with one quantity limit per SKU', () => {
  assert.deepEqual(quoteOrder([
    { id: 'hair', quantity: 2 },
    { id: 'brow', quantity: 1 },
    { id: 'hair', quantity: 3 },
  ]).items, [
    { id: 'hair', quantity: 5, price: 89, subtotal: 445 },
    { id: 'brow', quantity: 1, price: 69, subtotal: 69 },
  ]);
  assert.equal(quoteOrder([{ id: 'hair', quantity: 4 }, { id: 'hair', quantity: 5 }]).quantity, 9);
  assert.throws(() => quoteOrder([{ id: 'hair', quantity: 5 }, { id: 'hair', quantity: 5 }]), RangeError);
});

test('quotes ignore caller supplied prices and never use crossed-out prices', () => {
  const order = quoteOrder([{ id: 'brow', quantity: 1, price: 1, originalPrice: 1, subtotal: 1 }]);
  assert.equal(order.subtotal, 69);
  assert.equal(order.discount, 0);
  assert.equal(order.total, 69);
  assert.equal(order.nextThresholdGap, 131);
});

test('quote validation rejects malformed orders, unknown products, and coerced quantities', () => {
  for (const invalid of [null, 1, true, 'hair', {}]) assert.throws(() => quoteOrder(invalid), TypeError);
  for (const invalid of [null, 1, false, 'hair', []]) assert.throws(() => quoteOrder([invalid]), TypeError);
  for (const id of [undefined, null, 1, {}, '', 'base', 'missing']) {
    assert.throws(() => quoteOrder([{ id, quantity: 1 }]), RangeError);
  }
  for (const quantity of [undefined, null, NaN, Infinity, -1, 0, 10, 1.5, '1', true, {}, []]) {
    assert.throws(() => quoteOrder([{ id: 'hair', quantity }]), RangeError);
  }
});

test('quotes do not mutate inputs, future quotes, or the immutable product catalog', () => {
  const input = [{ id: 'hair', quantity: 2 }, { id: 'brow', quantity: 1 }];
  const snapshot = structuredClone(input);
  const expected = quoteOrder(input);
  const changed = quoteOrder(input);
  changed.items[0].price = 0;
  changed.items[0].quantity = 9;
  changed.items.push({ id: 'made-up', quantity: 1, price: 0, subtotal: 0 });
  assert.deepEqual(input, snapshot);
  assert.deepEqual(quoteOrder(input), expected);
  assert.equal(PRODUCTS.find(product => product.id === 'hair').price, 89);
});

test('every catalog combination remains nonnegative and follows integer-cent discount arithmetic', () => {
  for (const first of PRODUCTS) {
    for (const second of PRODUCTS.filter(product => product.id !== first.id)) {
      for (const quantity of [1, 4, 9]) {
        const order = quoteOrder([{ id: first.id, quantity }, { id: second.id, quantity: 1 }]);
        const cents = Math.round(first.price * 100) * quantity + Math.round(second.price * 100);
        const discountCents = Math.floor(cents / 20000) * 2000;
        assert.equal(order.subtotal, cents / 100);
        assert.equal(order.discount, discountCents / 100);
        assert.equal(order.total, (cents - discountCents) / 100);
        assert.ok(order.total >= 0);
        assert.ok(order.nextThresholdGap > 0 && order.nextThresholdGap <= 200);
      }
    }
  }
});

test('foundation sorting is available through the commerce module', () => {
  assert.equal(getFoundationProducts('oily')[0].id, 'base-oily');
  assert.equal(getFoundationProducts('dry')[0].id, 'base-dry');
  assert.equal(getFoundationProducts('normal')[0].id, 'base-normal');
});
