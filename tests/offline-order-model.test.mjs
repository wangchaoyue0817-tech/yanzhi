import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../public/offline-order-model.js', import.meta.url), 'utf8');
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
const address = { name: '演示用户', phone: '13800000000', region: '演示省 演示市 演示区', detail: '演示路 88 号，请勿寄件' };
function storageMock(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
function boot(storage = storageMock()) {
  const context = vm.createContext({ sessionStorage: storage, Date, Math, JSON });
  vm.runInContext(source, context);
  return context.OfflineOrderModel;
}
function ready(model, key = 'bag') {
  const order = model.createDraft(key);
  assert.equal(model.updateDraft(order.id, { address, photo, photoName: '外观.png', agreement: true }).ok, true);
  return order.id;
}

test('canonical categories and completed example do not expose mutable model references', () => {
  const model = boot();
  assert.equal(model.categories.length, 6);
  assert.equal(model.categories.find(item => item.key === 'beauty').price, '0.01');
  model.categories[0].price = '999';
  assert.equal(model.categories[0].price, '0.01');
  const sample = model.get(model.sampleId);
  assert.equal(sample.certificate, 'EAWGMFHB');
  assert.equal(sample.status, 'returned');
  assert.equal(sample.score, 96);
  assert.equal(sample.isSample, true);
  sample.address.name = 'changed';
  assert.equal(model.get(model.sampleId).address.name, '示例用户');
  assert.equal(model.advance(model.sampleId).ok, false);
  assert.equal(model.createDraft('unknown'), null);
});

test('payment requires complete address, valid mobile, image and agreement', () => {
  const model = boot();
  const id = model.createDraft('shoes').id;
  assert.equal(model.pay(id).field, 'name');
  model.updateDraft(id, { address: { ...address, phone: '12345678901' } });
  assert.equal(model.pay(id).field, 'phone');
  model.updateDraft(id, { address: { ...address, region: '' } });
  assert.equal(model.pay(id).field, 'region');
  model.updateDraft(id, { address: { ...address, detail: '123' } });
  assert.equal(model.pay(id).field, 'detail');
  model.updateDraft(id, { address });
  assert.equal(model.pay(id).field, 'photo');
  assert.equal(model.updateDraft(id, { photo: 'javascript:alert(1)' }).ok, false);
  assert.equal(model.updateDraft(id, { photo: 'data:image/svg+xml;base64,PHN2Zz4=' }).ok, false);
  model.updateDraft(id, { photo });
  assert.equal(model.pay(id).field, 'agreement');
  model.updateDraft(id, { agreement: true });
  assert.equal(model.pay(id).ok, true);
  assert.equal(model.get(id).price, '59.9');
});

test('payment and shipping are idempotent and cannot skip prerequisite states', () => {
  const model = boot();
  const id = ready(model);
  assert.equal(model.advance(id).ok, false);
  assert.equal(model.ship(id, 'SF123456789012').ok, false);
  const paid = model.pay(id).order;
  assert.equal(model.pay(id).order.paidAt, paid.paidAt);
  assert.equal(model.list().length, 2);
  assert.equal(model.updateDraft(id, { address }).ok, false);
  for (const value of ['', 'hello', 'SF1234', '1234567890123456']) assert.equal(model.ship(id, value).ok, false);
  assert.equal(model.ship(id, 'sf123456789012').ok, true);
  const shipped = model.get(id);
  assert.equal(shipped.outbound.tracking, 'SF123456789012');
  assert.equal(model.ship(id, 'SF123456789012').order.shippedAt, shipped.shippedAt);
  assert.equal(model.ship(id, 'SF000000000000').ok, false);
});

test('chronological transitions expose the report only after approval and add return logistics last', () => {
  const model = boot();
  const id = ready(model);
  model.pay(id);
  model.ship(id, '123456789012');
  const dates = [model.get(id).createdAt, model.get(id).paidAt, model.get(id).shippedAt];
  for (const [status, field] of [['received', 'receivedAt'], ['inspecting', 'inspectingAt'], ['passed', 'passedAt'], ['returned', 'returnedAt']]) {
    const advanced = model.advance(id);
    assert.equal(advanced.ok, true);
    assert.equal(advanced.order.status, status);
    dates.push(advanced.order[field]);
    if (status === 'received' || status === 'inspecting') assert.equal(advanced.order.certificate, '');
    if (status === 'passed') {
      assert.match(advanced.order.certificate, /^TL[A-Z0-9]+$/);
      assert.equal(advanced.order.score, 96);
      assert.equal(advanced.order.inbound.tracking, '');
    }
  }
  assert.ok(dates.every((date, index) => index === 0 || Date.parse(date) > Date.parse(dates[index - 1])));
  assert.match(model.get(id).inbound.tracking, /^SF\d{12,15}$/);
  const completedAt = model.get(id).returnedAt;
  assert.equal(model.advance(id).order.returnedAt, completedAt);
});

test('session roundtrip preserves submitted data and rejects corrupt or forged records', () => {
  const storage = storageMock();
  const model = boot(storage);
  const id = ready(model);
  model.pay(id);
  model.ship(id, 'SF123456789012');
  for (let i = 0; i < 4; i++) model.advance(id);
  const restored = boot(storage);
  assert.equal(JSON.stringify(restored.get(id)), JSON.stringify(model.get(id)));
  const saved = JSON.parse(storage.values.get(model.storageKey));
  saved.orders.push({ ...saved.orders[0], id: 'of-unknownstate', status: 'admin', price: '0' });
  saved.orders[0].price = '0';
  saved.orders[0].categoryName = '<img src=x onerror=alert(1)>';
  saved.orders[0].isSample = true;
  storage.setItem(model.storageKey, JSON.stringify(saved));
  const sanitized = boot(storage);
  assert.equal(sanitized.get(id).price, '99.9');
  assert.equal(sanitized.get(id).categoryName, '包袋');
  assert.equal(sanitized.get(id).isSample, false);
  assert.equal(sanitized.get('of-unknownstate'), null);
  saved.orders[0].certificate = [saved.orders[0].certificate];
  storage.setItem(model.storageKey, JSON.stringify(saved));
  assert.equal(boot(storage).get(id), null);
  storage.setItem(model.storageKey, '{bad json');
  assert.equal(boot(storage).list().length, 1);
});

test('storage quota failure preserves current interaction and can recover on the next save', () => {
  const storage = storageMock();
  const originalWrite = storage.setItem;
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const model = boot(storage);
  const id = model.createDraft('coin').id;
  assert.equal(model.storageStatus().persisted, false);
  const edited = model.updateDraft(id, { address, photo, agreement: true });
  assert.equal(edited.ok, true);
  assert.equal(edited.persisted, false);
  assert.ok(edited.warning);
  assert.equal(model.get(id).address.name, address.name);
  storage.setItem = originalWrite;
  assert.equal(model.pay(id).persisted, true);
  assert.equal(boot(storage).get(id).status, 'paid');
  assert.equal(model.deleteDraft(id).ok, false);
  const draft = model.createDraft('beauty');
  assert.equal(model.deleteDraft(draft.id).ok, true);
  assert.equal(model.get(draft.id), null);
});
