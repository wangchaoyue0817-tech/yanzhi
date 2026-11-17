import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/appraisal-task-runner.js', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const ordinaryPhotos = () => [{ url: 'blob:user-upload', name: 'my-photo.jpg' }];
const referenceTitles = [
  '运行校验、查看文件：single-image.md',
  '已读取 SKILL.md',
  '查看鉴定技能目录结构',
  '已读取 point-match.md',
  '已读取 wording.md',
  '确认图片文件存在',
  '对 CPB 隔离霜 5 图运行多图鉴定',
  '用命中的系列 ID 重跑多图鉴定',
  '带品牌重跑多图鉴定',
  '查询卡牌类目是否支持',
  '查看批量鉴定脚本参数',
  '对宝可梦卡牌正反面批量鉴定',
  '查看目录查询脚本用法',
  '查询宝可梦品牌下的系列',
  '按品牌对宝可梦卡牌做多图鉴定',
  '已读取 appraise_batch.py',
  '查看目录数据文件',
  '检查宝可梦品牌级鉴定点键',
  '检查点位键与 mcp_call 命令行入口',
  '已读取 single-image.md',
  '查看单张与多张上传脚本参数',
  '运行校验、查看文件：auth-and-tools.md',
  '已读取 auth-and-tools.md',
  '为卡牌正反面签发上传凭证',
  '上传卡牌正反面图片',
  '卡牌正反面逐点单鉴',
  '卡牌正反面整鉴出结论'
];
const unseparatedRows = new Set([0, 8, 13, 17, 22]);

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

test('an ordinary upload emits the complete ordered reference and a conclusion at forty seconds', async () => {
  const { run, advance, timers } = setup();
  const events = [];
  const work = run({ photos: ordinaryPhotos(), text: '请看看这个商品', skill: '鉴美妆', onEvent: event => events.push(event) });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'step');
  advance(10000);
  assert.equal(events.length, 8);
  assert.deepEqual(events.map(event => event.title), referenceTitles.slice(0, 8));
  advance(39999);
  assert.equal(events.length, 27);
  assert.equal(new Set(events.map(event => event.id)).size, 27);
  assert.deepEqual(events.map(event => event.title), referenceTitles);
  assert.ok(events.every(event => event.status === 'active' && event.technical.length > 0));
  assert.ok(events.every(event => event.type !== 'complete' && event.type !== 'error'));
  advance(40000);
  await work;
  assert.equal(events.length, 28);
  assert.equal(events[27].type, 'complete');
  assert.match(events[27].result.title, /65/);
  assert.equal(events[27].result.paragraphs.length, 3);
  assert.equal(events[27].result.rows.length, 4);
  assert.deepEqual(plain(events[27].result.rows[0]), ['粉扑正面', '真', '81%']);
  assert.deepEqual(plain(events[27].result.rows.at(-1)), ['气垫正面', '假/偏低', '26%']);
  assert.equal(timers.size, 0);
  advance(120000);
  assert.equal(events.length, 28, 'completion is emitted only once');
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

test('reference titles and deep-thinking group boundaries match every screenshot row', async () => {
  const { run, advance } = setup();
  const events = [];
  const work = run({ photos: ordinaryPhotos(), onEvent: event => events.push(event) });
  advance(40000);
  await work;
  const records = events.filter(event => event.type === 'step');
  assert.deepEqual(records.map(record => record.title), referenceTitles);
  for (const [index, record] of records.entries()) {
    assert.equal(record.reference, true);
    assert.equal(record.groupStart, !unseparatedRows.has(index));
    assert.equal(record.detail, '', 'the reference has no additional subtitle');
  }
  assert.equal(records.filter(record => record.groupStart).length, 22);
  assert.equal(records.at(-1).title, '卡牌正反面整鉴出结论');
  assert.ok(records.every(record => record.title !== '深度思考'), 'group headings are not extra action rows');
  const copy = events.flatMap(event => event.type === 'step'
    ? [event.title, event.detail, ...event.technical]
    : [event.result.title, ...event.result.paragraphs, ...event.result.rows.flat()]).join('\n');
  assert.doesNotMatch(copy, /演示|示例|示范|\b(?:demo|fixture|mock)\b/i);
  assert.doesNotMatch(copy, /鉴定服务.*(?:接入|连接|未配置)|JianxAppraisalService/);
});

test('each expandable code record is inert local metadata with no credentials or network calls', async () => {
  const { run, advance } = setup();
  const events = [];
  const work = run({ onEvent: event => events.push(event) });
  advance(40000);
  await work;
  for (const record of events.filter(event => event.type === 'step')) {
    assert.equal(record.technical.length, 1);
    const code = record.technical[0];
    const declaration = /^const [a-zA-Z]+ = ([\s\S]+);$/.exec(code);
    assert.ok(declaration, record.id);
    const metadata = JSON.parse(declaration[1]);
    assert.equal(typeof metadata, 'object');
    assert.doesNotMatch(code, /https?:|fetch\(|XMLHttpRequest|WebSocket|require\(|import\(|eval\(|secret|bearer|access_token|signature/i);
  }
});

test('the long sequence keeps current and two recent rows while all older rows remain in history', async () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../public/appraisal-progress-model.js', import.meta.url), 'utf8'), context);
  const { createState, applyEvent, view } = context.JianxAppraisalProgress;
  const state = createState(0);
  const events = [];
  const { run, advance } = setup();
  const work = run({ onEvent(event) { events.push(event); applyEvent(state, event, events.length * 1000); } });
  for (const [at, count] of [[0, 1], [7800, 7], [22000, 16], [39999, 27]]) {
    advance(at);
    const current = view(state, 39999);
    assert.equal(state.steps.length, count);
    assert.equal(current.currentId, events[count - 1].id);
    assert.deepEqual(plain(current.recentIds), events.slice(Math.max(0, count - 3), count).map(event => event.id));
    assert.deepEqual(plain(current.historyIds), events.slice(0, Math.max(0, count - 3)).map(event => event.id));
    assert.equal(current.recentIds.length + current.historyIds.length, count);
    assert.equal(state.steps.filter(step => step.status === 'active').length, 1);
  }
  advance(40000);
  await work;
  assert.equal(state.status, 'complete');
  assert.deepEqual(plain(view(state).recentIds), events.slice(24, 27).map(event => event.id));
  assert.equal(view(state).historyIds.length, 24);
});

test('cancellation clears timers and prevents all later task events', async () => {
  const { run, advance, timers } = setup();
  const controller = new AbortController();
  const events = [];
  const work = run({ photos: ordinaryPhotos(), signal: controller.signal, onEvent: event => events.push(event) });
  advance(16000);
  assert.equal(events.length, 12);
  controller.abort();
  await work;
  assert.equal(timers.size, 0);
  advance(120000);
  assert.equal(events.length, 12);
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
  assert.equal(first.length, 12);
  assert.equal(second.length, 9);
  firstController.abort();
  await workA;
  assert.ok(timers.size > 0, 'only the cancelled call timers are removed');
  advance(44999);
  assert.equal(first.length, 12);
  assert.equal(second.length, 27);
  advance(45000);
  await workB;
  assert.equal(first.length, 12);
  assert.equal(second.length, 28);
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
  assert.equal(second.length, 27);
  advance(80000);
  await workB;
  assert.equal(second.length, 28);
  assert.equal(second.at(-1).result.rows[0][0], '粉扑正面');
  assert.equal(timers.size, 0);
});
