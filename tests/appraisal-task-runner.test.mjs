import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/appraisal-task-runner.js', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const ordinaryPhotos = () => [{ url: 'blob:user-upload', name: 'my-photo.jpg' }];

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

test('an ordinary upload without query flags emits seven steps and a conclusion at forty seconds', async () => {
  const { run, advance, timers } = setup();
  const events = [];
  const work = run({ photos: ordinaryPhotos(), text: '请看看这个商品', skill: '鉴美妆', onEvent: event => events.push(event) });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'step');
  advance(10000);
  assert.equal(events.length, 3);
  advance(39999);
  assert.equal(events.length, 7);
  assert.equal(new Set(events.map(event => event.id)).size, 7);
  assert.ok(events.every(event => event.status === 'active' && event.technical.length > 0));
  assert.ok(events.every(event => event.type !== 'complete' && event.type !== 'error'));
  advance(40000);
  await work;
  assert.equal(events.length, 8);
  assert.equal(events[7].type, 'complete');
  assert.match(events[7].result.title, /65/);
  assert.equal(events[7].result.paragraphs.length, 3);
  assert.equal(events[7].result.rows.length, 4);
  assert.deepEqual(plain(events[7].result.rows[0]), ['粉扑正面', '真', '81%']);
  assert.equal(timers.size, 0);
  advance(120000);
  assert.equal(events.length, 8, 'completion is emitted only once');
});

test('URL flags and photo metadata do not gate the local experience', async () => {
  const transcripts = [];
  for (const [search, photos] of [
    ['', ordinaryPhotos()],
    ['?unrelated=1', ordinaryPhotos()],
    ['?appraisal=demo', ordinaryPhotos()],
    ['', [{ url: 'blob:another-photo', sample: true }]],
    ['', [...ordinaryPhotos(), { url: 'blob:second-photo', name: 'second.png' }]]
  ]) {
    const { run, advance, timers } = setup(search);
    const events = [];
    const work = run({ photos, onEvent: event => events.push(event) });
    advance(40000);
    await work;
    assert.equal(timers.size, 0);
    assert.equal(events.at(-1).type, 'complete');
    transcripts.push(plain(events));
  }
  for (const transcript of transcripts.slice(1)) assert.deepEqual(transcript, transcripts[0]);
});

test('the experience neither checks nor calls an external provider', async () => {
  const { run, window, advance } = setup();
  let providerReads = 0;
  let providerCalls = 0;
  Object.defineProperty(window, 'JianxAppraisalService', {
    get() {
      providerReads++;
      return { run() { providerCalls++; throw new Error('provider must not run'); } };
    }
  });
  Object.defineProperty(window, 'location', { get() { assert.fail('URL state is not an access requirement'); } });
  const events = [];
  const work = run({ photos: ordinaryPhotos(), onEvent: event => events.push(event) });
  advance(40000);
  await work;
  assert.equal(providerReads, 0);
  assert.equal(providerCalls, 0);
  assert.equal(events.at(-1).type, 'complete');
  assert.ok(events.every(event => event.type !== 'error'));
});

test('all emitted user-facing copy uses formal wording', async () => {
  const { run, advance } = setup();
  const events = [];
  const work = run({ photos: ordinaryPhotos(), onEvent: event => events.push(event) });
  advance(40000);
  await work;
  const copy = events.flatMap(event => event.type === 'step'
    ? [event.title, event.detail, ...event.technical]
    : [event.result.title, ...event.result.paragraphs, ...event.result.rows.flat()]).join('\n');
  assert.doesNotMatch(copy, /演示|示例|示范|\b(?:demo|fixture|mock)\b/i);
  assert.doesNotMatch(copy, /鉴定服务.*(?:接入|连接|未配置)|JianxAppraisalService/);
});

test('cancellation clears timers and prevents all later task events', async () => {
  const { run, advance, timers } = setup();
  const controller = new AbortController();
  const events = [];
  const work = run({ photos: ordinaryPhotos(), signal: controller.signal, onEvent: event => events.push(event) });
  advance(16000);
  assert.equal(events.length, 4);
  controller.abort();
  await work;
  assert.equal(timers.size, 0);
  advance(120000);
  assert.equal(events.length, 4);
  assert.ok(events.every(event => event.type !== 'complete'));
});

test('already cancelled work never starts', async () => {
  const { run, timers } = setup();
  const controller = new AbortController();
  controller.abort();
  await run({ photos: ordinaryPhotos(), signal: controller.signal, onEvent() { assert.fail('cancelled task emitted an event'); } });
  assert.equal(timers.size, 0);
});

test('cancellation from the first event does not leave scheduled work behind', async () => {
  const { run, timers, advance } = setup();
  const controller = new AbortController();
  const events = [];
  const work = run({ photos: ordinaryPhotos(), signal: controller.signal, onEvent(event) { events.push(event); controller.abort(); } });
  await work;
  assert.equal(events.length, 1);
  assert.equal(timers.size, 0);
  advance(120000);
  assert.equal(events.length, 1);
});

test('overlapping calls retain independent clocks and cancelling one leaves the other running', async () => {
  const { run, advance, timers } = setup();
  const firstController = new AbortController();
  const first = [], second = [];
  const workA = run({ photos: ordinaryPhotos(), signal: firstController.signal, onEvent: event => first.push(event) });
  advance(5000);
  const workB = run({ photos: [{ url: 'blob:second-call' }], onEvent: event => second.push(event) });
  advance(16000);
  assert.equal(first.length, 4);
  assert.equal(second.length, 3);
  firstController.abort();
  await workA;
  assert.ok(timers.size > 0, 'only the cancelled call timers are removed');
  advance(44999);
  assert.equal(first.length, 4);
  assert.equal(second.length, 7);
  advance(45000);
  await workB;
  assert.equal(first.length, 4);
  assert.equal(second.length, 8);
  assert.equal(second.at(-1).type, 'complete');
  assert.equal(timers.size, 0);
});

test('later calls create fresh events and result data on the same page', async () => {
  const { run, advance, timers } = setup();
  const first = [], second = [];
  const workA = run({ photos: ordinaryPhotos(), onEvent: event => first.push(event) });
  advance(40000);
  await workA;
  const originalTitle = first[0].title;
  first[0].title = '上一轮修改';
  first.at(-1).result.rows[0][0] = '上一轮修改';
  const workB = run({ photos: ordinaryPhotos(), onEvent: event => second.push(event) });
  assert.equal(second.length, 1);
  assert.equal(second[0].title, originalTitle);
  advance(79999);
  assert.equal(second.length, 7);
  advance(80000);
  await workB;
  assert.equal(second.length, 8);
  assert.equal(second.at(-1).result.rows[0][0], '粉扑正面');
  assert.equal(timers.size, 0);
});
