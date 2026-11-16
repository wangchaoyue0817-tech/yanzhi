import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/appraisal-task-runner.js', import.meta.url), 'utf8');
const errorMessage = '暂时无法连接鉴定服务，请稍后重试';
const plain = value => JSON.parse(JSON.stringify(value));

function setup(search = '') {
  let time = 0;
  let id = 0;
  const timers = new Map();
  const window = {
    location: { search },
    setTimeout(callback, delay) { const key = ++id; timers.set(key, { callback, at: time + delay }); return key; },
    clearTimeout(key) { timers.delete(key); }
  };
  vm.runInNewContext(source, { window, URLSearchParams });
  return {
    window, run: window.JianxAppraisalTask.run, timers,
    advance(target) {
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        time = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
      }
      time = target;
    }
  };
}

test('the current provider receives original task inputs and owns completion events', async () => {
  const { run, window, timers } = setup('?appraisal=demo');
  const photos = [{ sample: true }];
  const signal = new AbortController().signal;
  const events = [];
  let received;
  window.JianxAppraisalService = {
    run(options) {
      assert.equal(this, window.JianxAppraisalService);
      received = options;
      options.onEvent({ type: 'step', id: 'real-task', title: '检查照片', status: 'active' });
      return Promise.resolve({ title: '返回值不能自动完成任务' });
    }
  };
  await run({ photos, text: '检查包装', skill: '美妆', signal, onEvent: event => events.push(event) });
  assert.equal(received.photos, photos);
  assert.equal(received.text, '检查包装');
  assert.equal(received.skill, '美妆');
  assert.equal(received.signal, signal);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, 'real-task');
  assert.equal(timers.size, 0);
  received.onEvent({ type: 'complete', result: { title: '完成' } });
  assert.equal(events[1].type, 'complete');
});

test('ordinary uploads never receive the screenshot result without a provider', () => {
  for (const [search, photos] of [
    ['', [{ url: 'blob:user' }]],
    ['', [{ sample: true }]],
    ['?appraisal=demo', [{ sample: true }, { url: 'blob:user' }]],
    ['?appraisal=demo', []],
    ['?appraisal=demo', [null]],
    ['?appraisal=other', [{ sample: true }]]
  ]) {
    const { run, timers } = setup(search);
    const events = [];
    run({ photos, onEvent: event => events.push(event) });
    assert.deepEqual(plain(events), [{ type: 'error', message: errorMessage, retryable: true }]);
    assert.equal(timers.size, 0);
  }
});

test('a provider can be connected after the runner loads', () => {
  const { run, window } = setup();
  const events = [];
  run({ onEvent: event => events.push(event) });
  window.JianxAppraisalService = { run({ onEvent }) { onEvent({ type: 'heartbeat' }); } };
  run({ onEvent: event => events.push(event) });
  assert.deepEqual(events.map(event => event.type), ['error', 'heartbeat']);
});

test('the isolated screenshot task emits seven distinct steps and completes at forty seconds', async () => {
  const { run, advance, timers } = setup('?appraisal=demo');
  const events = [];
  const work = run({ photos: [{ sample: true }], onEvent: event => events.push(event) });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'step');
  advance(10000);
  assert.equal(events.length, 3);
  advance(39999);
  assert.equal(events.length, 7);
  assert.equal(new Set(events.map(event => event.id)).size, 7);
  assert.ok(events.every(event => event.status === 'active' && event.technical.length > 0));
  assert.ok(events.every(event => !/演示|示例|示范|demo|fixture|mock/i.test(event.title + event.detail)));
  assert.ok(events.every(event => event.type !== 'complete'));
  advance(40000);
  await work;
  assert.equal(events.length, 8);
  assert.equal(events[7].type, 'complete');
  assert.match(events[7].result.title, /65/);
  assert.equal(events[7].result.paragraphs.length, 3);
  assert.deepEqual(plain(events[7].result.rows[0]), ['粉扑正面', '真', '81%']);
  assert.equal(timers.size, 0);
});

test('cancellation clears timers and prevents all later task events', async () => {
  const { run, advance, timers } = setup('?appraisal=demo');
  const controller = new AbortController();
  const events = [];
  const work = run({ photos: [{ sample: true }], signal: controller.signal, onEvent: event => events.push(event) });
  advance(16000);
  assert.equal(events.length, 4);
  controller.abort();
  await work;
  assert.equal(timers.size, 0);
  advance(120000);
  assert.equal(events.length, 4);
});

test('already cancelled work never starts, including when a provider exists', () => {
  for (const provider of [false, true]) {
    const { run, window, timers } = setup('?appraisal=demo');
    const controller = new AbortController();
    controller.abort();
    if (provider) window.JianxAppraisalService = { run() { assert.fail('cancelled provider must not start'); } };
    run({ photos: [{ sample: true }], signal: controller.signal, onEvent() { assert.fail('cancelled task emitted an event'); } });
    assert.equal(timers.size, 0);
  }
});

test('provider errors become readable failures and late events after cancellation are ignored', async () => {
  const { run, window } = setup();
  const events = [];
  window.JianxAppraisalService = { run() { throw new Error('private internal error'); } };
  run({ onEvent: event => events.push(event) });
  window.JianxAppraisalService = { run() { return Promise.reject(new Error('private internal error')); } };
  await run({ onEvent: event => events.push(event) });
  assert.deepEqual(events.map(event => event.message), [errorMessage, errorMessage]);

  const controller = new AbortController();
  let emit;
  let reject;
  window.JianxAppraisalService = { run({ onEvent }) { emit = onEvent; return new Promise((_, fail) => { reject = fail; }); } };
  const work = run({ signal: controller.signal, onEvent: event => events.push(event) });
  controller.abort();
  emit({ type: 'complete', result: { title: '迟到结果' } });
  reject(new Error('late failure'));
  await work;
  assert.equal(events.length, 2);
});
