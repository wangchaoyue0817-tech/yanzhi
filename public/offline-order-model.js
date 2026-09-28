/* Local interactive demo only: no payment, carrier or authentication API is called. */
(() => {
  'use strict';
  const root = typeof window === 'undefined' ? globalThis : window;
  const STORAGE_KEY = 'jianx.offline-orders.v13';
  const categories = [
    { key: 'beauty', name: '美妆', price: '0.01', icon: 'tabler-perfume' },
    { key: 'bag', name: '包袋', price: '99.9', icon: 'handbag' },
    { key: 'shoes', name: '鞋靴', price: '59.9', icon: 'sneaker' },
    { key: 'clothes', name: '服装', price: '59.9', icon: 't-shirt' },
    { key: 'coin', name: '钱币', price: '29.9', icon: 'coin' },
    { key: 'accessories', name: '配饰', price: '29.9', icon: 'sunglasses' }
  ];
  const centerAddress = { name: '图灵评鉴中心（演示）', phone: '400-000-0000', region: '演示省 演示市 演示区', detail: '演示路 100 号鉴定中心，请勿实际寄件', isDemo: true };
  const states = ['draft', 'paid', 'shipped', 'received', 'inspecting', 'passed', 'returned'];
  const timeFields = ['createdAt', 'paidAt', 'shippedAt', 'receivedAt', 'inspectingAt', 'passedAt', 'returnedAt'];
  const sampleId = 'demo-completed';
  const maxPhotoLength = 4 * 1024 * 1024;
  const clone = value => JSON.parse(JSON.stringify(value));
  const text = (value, limit = 160) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : '';
  const validPhoto = value => typeof value === 'string' && value.length <= maxPhotoLength && /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(value);
  const trackingNumber = value => text(value, 40).replace(/\s/g, '').toUpperCase();
  const validTracking = value => /^(?:SF)?\d{12,15}$/.test(value);
  const cleanAddress = address => ({ name: text(address?.name, 30), phone: text(address?.phone, 20), region: text(address?.region, 80), detail: text(address?.detail, 160) });
  const cleanDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  const blankAddress = () => ({ name: '', phone: '', region: '', detail: '' });
  let serial = 0;
  let storageWarning = '';
  let storage = null;
  try { storage = root.sessionStorage || null; } catch { /* Unavailable storage falls back to this page's memory. */ }
  const result = order => ({ ok: true, order: clone(order), persisted: !storageWarning, ...(storageWarning ? { warning: storageWarning } : {}) });
  const fail = (error, field, order) => ({ ok: false, error, field, order: order ? clone(order) : null });
  const timestamp = order => new Date(Math.max(Date.now(), ...timeFields.map(key => (Date.parse(order[key]) || 0) + 1000))).toISOString();
  const emptyOrder = (category, id, createdAt) => ({
    id, categoryKey: category.key, categoryName: category.name, price: category.price,
    address: blankAddress(), photo: '', photoName: '', agreement: false, status: 'draft',
    createdAt, paidAt: null, shippedAt: null, receivedAt: null, inspectingAt: null, passedAt: null, returnedAt: null,
    outbound: { company: '顺丰速运', tracking: '' }, inbound: { company: '', tracking: '' },
    certificate: '', sampleSerial: '', score: null, assessor: '', isSample: false
  });

  // All loaded fields are rebuilt from a whitelist. Views must still render user text as text.
  function restoreOrder(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !/^of-[a-z0-9-]{6,70}$/.test(raw.id)) return null;
    const category = categories.find(item => item.key === raw.categoryKey);
    const stage = states.indexOf(raw.status);
    const createdAt = cleanDate(raw.createdAt);
    if (!category || stage < 0 || !createdAt) return null;
    const order = emptyOrder(category, raw.id, createdAt);
    order.status = states[stage];
    order.address = cleanAddress(raw.address);
    order.photo = validPhoto(raw.photo) ? raw.photo : '';
    order.photoName = text(raw.photoName, 100);
    order.agreement = raw.agreement === true;
    for (let i = 1; i <= stage; i++) {
      const value = cleanDate(raw[timeFields[i]]);
      if (!value || Date.parse(value) < Date.parse(order[timeFields[i - 1]])) return null;
      order[timeFields[i]] = value;
    }
    if (stage >= 1 && paymentError(order)) return null;
    if (stage >= 2) {
      const tracking = trackingNumber(raw.outbound?.tracking);
      if (!validTracking(tracking)) return null;
      order.outbound.tracking = tracking;
    }
    if (stage >= 5) {
      order.certificate = typeof raw.certificate === 'string' && /^TL[A-Z0-9]{6,20}$/.test(raw.certificate) ? raw.certificate : '';
      order.sampleSerial = typeof raw.sampleSerial === 'string' && /^DEMO-[A-Z0-9-]{3,30}$/.test(raw.sampleSerial) ? raw.sampleSerial : '';
      if (!order.certificate || !order.sampleSerial) return null;
      order.score = 96;
      order.assessor = '图灵联合鉴定组（演示）';
    }
    if (stage >= 6) {
      const tracking = trackingNumber(raw.inbound?.tracking);
      if (!validTracking(tracking)) return null;
      order.inbound = { company: '顺丰速运（演示）', tracking };
    }
    return order;
  }

  function makeSample() {
    const order = emptyOrder(categories[1], sampleId, new Date(Date.now() - 6 * 86400000).toISOString());
    order.status = 'returned';
    order.isSample = true;
    order.address = { name: '示例用户', phone: '13800000000', region: '演示省 演示市 演示区', detail: '演示路 88 号（示例地址）' };
    order.agreement = true;
    const base = Date.parse(order.createdAt);
    [60000, 3600000, 86400000, 90000000, 100000000, 172800000].forEach((offset, index) => { order[timeFields[index + 1]] = new Date(base + offset).toISOString(); });
    order.outbound = { company: '顺丰速运（演示）', tracking: 'SF000000000001' };
    order.inbound = { company: '顺丰速运（演示）', tracking: 'SF000000000002' };
    order.certificate = 'EAWGMFHB';
    order.sampleSerial = 'DEMO-001';
    order.score = 96;
    order.assessor = '图灵联合鉴定组（演示）';
    return order;
  }
  let orders = [];
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    if (saved && saved.length <= 24 * 1024 * 1024) {
      const parsed = JSON.parse(saved);
      if (parsed?.version === 1 && Array.isArray(parsed.orders)) {
        const ids = new Set();
        orders = parsed.orders.map(restoreOrder).filter(order => {
          if (!order || ids.has(order.id)) return false;
          ids.add(order.id);
          return true;
        });
      }
    }
  } catch { /* Invalid or stale demo data is safely ignored. */ }
  const sample = makeSample();

  function persist() {
    try {
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, orders }));
      storageWarning = '';
    } catch {
      storageWarning = '浏览器暂时无法保存，当前页面仍可继续体验；刷新后可能丢失本次演示数据。';
    }
  }
  function find(id) { return id === sampleId ? sample : orders.find(order => order.id === id); }
  function paymentError(order) {
    const { name, phone, region, detail } = order.address;
    if (!name) return { error: '请填写收件人姓名', field: 'name' };
    if (!/^1[3-9]\d{9}$/.test(phone)) return { error: '请填写有效的 11 位手机号码', field: 'phone' };
    if (region.length < 2) return { error: '请填写省、市、区', field: 'region' };
    if (detail.length < 5) return { error: '请填写至少 5 个字的详细收货地址', field: 'detail' };
    if (!validPhoto(order.photo)) return { error: '请上传商品完整清晰的正面图', field: 'photo' };
    if (!order.agreement) return { error: '请阅读并同意实物鉴别协议', field: 'agreement' };
    return null;
  }
  function finish(order) { persist(); return result(order); }
  function editable(id) {
    const order = find(id);
    if (!order) return fail('没有找到这笔演示订单', 'order');
    if (order.isSample) return fail('这是已完成的示例订单，请从品类创建新订单', 'order', order);
    return { ok: true, order };
  }
  root.OfflineOrderModel = {
    get categories() { return clone(categories); },
    get centerAddress() { return clone(centerAddress); },
    sampleId,
    storageKey: STORAGE_KEY,
    list() { return clone([...orders, sample].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))); },
    get(id) { const order = find(id); return order ? clone(order) : null; },
    storageStatus() { return { persisted: !storageWarning, warning: storageWarning }; },
    createDraft(categoryKey) {
      const category = categories.find(item => item.key === categoryKey);
      if (!category) return null;
      let id;
      do { id = `of-${Date.now().toString(36)}-${(++serial).toString(36)}-${Math.random().toString(36).slice(2, 9)}`; } while (find(id));
      const order = emptyOrder(category, id, new Date().toISOString());
      orders.unshift(order);
      // Keep the demo session bounded without deleting paid or in-progress orders.
      if (orders.length > 40) {
        const oldDraft = orders.findLastIndex(item => item.id !== id && item.status === 'draft');
        if (oldDraft >= 0) orders.splice(oldDraft, 1);
      }
      persist();
      return clone(order);
    },
    updateDraft(id, changes = {}) {
      const entry = editable(id);
      if (!entry.ok) return entry;
      const order = entry.order;
      if (order.status !== 'draft') return fail('支付后无法更改商品信息，请查看订单进度', 'status', order);
      if (Object.hasOwn(changes, 'photo') && changes.photo !== '' && !validPhoto(changes.photo)) return fail('请选择有效图片，并将图片压缩至 3 MB 以内', 'photo', order);
      if (Object.hasOwn(changes, 'address')) order.address = cleanAddress(changes.address);
      if (Object.hasOwn(changes, 'photo')) order.photo = changes.photo;
      if (Object.hasOwn(changes, 'photoName')) order.photoName = text(changes.photoName, 100);
      if (Object.hasOwn(changes, 'agreement')) order.agreement = changes.agreement === true;
      return finish(order);
    },
    pay(id) {
      const entry = editable(id);
      if (!entry.ok) return entry;
      const order = entry.order;
      if (order.status !== 'draft') return result(order);
      const invalid = paymentError(order);
      if (invalid) return fail(invalid.error, invalid.field, order);
      order.paidAt = timestamp(order);
      order.status = 'paid';
      return finish(order);
    },
    ship(id, rawTracking) {
      const entry = editable(id);
      if (!entry.ok) return entry;
      const order = entry.order;
      const tracking = trackingNumber(rawTracking);
      if (!validTracking(tracking)) return fail('请输入顺丰单号：SF 加 12–15 位数字，或 12–15 位数字', 'tracking', order);
      if (states.indexOf(order.status) >= 2) return order.outbound.tracking === tracking ? result(order) : fail('发货信息已提交，不能重复修改单号', 'tracking', order);
      if (order.status !== 'paid') return fail('请先完成模拟支付', 'status', order);
      order.outbound = { company: '顺丰速运', tracking };
      order.shippedAt = timestamp(order);
      order.status = 'shipped';
      return finish(order);
    },
    advance(id) {
      const entry = editable(id);
      if (!entry.ok) return entry;
      const order = entry.order;
      const stage = states.indexOf(order.status);
      if (stage < 2) return fail('请先提交发货信息', 'status', order);
      if (stage === 6) return result(order);
      order.status = states[stage + 1];
      order[timeFields[stage + 1]] = timestamp(order);
      if (order.status === 'passed') {
        order.certificate = `TL${order.id.replace(/[^a-z0-9]/g, '').slice(-10).toUpperCase()}`;
        order.sampleSerial = `DEMO-${order.id.split('-').slice(1, 3).join('-').toUpperCase()}`;
        order.score = 96;
        order.assessor = '图灵联合鉴定组（演示）';
      }
      if (order.status === 'returned') {
        order.inbound = { company: '顺丰速运（演示）', tracking: `SF${String(Date.now()).padStart(13, '0')}` };
      }
      return finish(order);
    },
    deleteDraft(id) {
      const entry = editable(id);
      if (!entry.ok) return entry;
      if (entry.order.status !== 'draft') return fail('只能删除未支付的演示草稿', 'status', entry.order);
      orders = orders.filter(order => order.id !== id);
      persist();
      return { ok: true, order: null, persisted: !storageWarning, ...(storageWarning ? { warning: storageWarning } : {}) };
    }
  };
})();
