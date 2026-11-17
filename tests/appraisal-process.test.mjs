import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const modelSource = readFileSync(new URL('../public/appraisal-progress-model.js', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/appraisal-conversation.js', import.meta.url), 'utf8');
const publicCode = /sandbox|\bskill\b|\.md\b|lifecycle|mcp_call|appraise_|Worked/iu;
const nonproductionCopy = /演示|示例|示范/u;

function load(extra = {}) {
  const window = { addEventListener() {}, AbortController, ...extra };
  const context = vm.createContext({ window, AbortController, URL: { revokeObjectURL() {} }, ...extra });
  vm.runInContext(modelSource, context);
  vm.runInContext(source, context);
  return window.AppraisalConversation;
}

// Execute the real controller with a minimal DOM and an independently controlled
// clock. Only runner events may create steps or conclusions.
class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.children = [];
    this.attributes = new Map(); this.listeners = new Map(); this.dataset = {};
    this.className = ''; this.hidden = false; this.inert = false; this.open = false;
    this.offsetTop = 0; this.scrollTop = 0; this.scrollHeight = 600; this.clientHeight = 600;
    this.style = { setProperty() {} };
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: name => { if (!this.classList.contains(name)) this.className += ` ${name}`; },
      remove: name => { this.className = this.className.split(/\s+/).filter(value => value !== name).join(' '); },
      toggle: (name, enabled) => {
        const next = enabled ?? !this.classList.contains(name);
        next ? this.classList.add(name) : this.classList.remove(name); return next;
      }
    };
  }
  append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
  replaceChildren(...children) { this.children = []; this._text = ''; this._html = ''; this.append(...children); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
  replaceWith(element) { const parent = this.parentElement; if (parent) { parent.children[parent.children.indexOf(this)] = element; element.parentElement = parent; this.parentElement = null; } }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(name, handler) { if (!this.listeners.has(name)) this.listeners.set(name, []); this.listeners.get(name).push(handler); }
  fire(name) { for (const handler of this.listeners.get(name) || []) handler({ target: this }); }
  contains(element) { return this === element || this.children.some(child => child.contains(element)); }
  focus() { this.ownerDocument.activeElement = this; }
  get isConnected() { return true; }
  set textContent(value) { this._text = String(value); this._html = ''; this.children = []; }
  get textContent() { return (this._text || '') + (this._html || '').replace(/<[^>]*>/g, '') + this.children.map(child => child.textContent).join(''); }
  set innerHTML(value) { this._html = String(value); this._text = ''; this.children = []; }
  get innerHTML() { return this._html || ''; }
}

function all(element, predicate) {
  return [...(predicate(element) ? [element] : []), ...element.children.flatMap(child => all(child, predicate))];
}
function find(element, className) {
  return all(element, node => node.classList.contains(className))[0] || null;
}
function accessibleCopy(element) {
  return [element.textContent, element.alt || '', element.getAttribute('aria-label') || '',
    ...element.children.map(accessibleCopy)].join(' ');
}
function stageControls(h) {
  return h.get('appraisal-stages').children.map(row => ({
    row, toggle: find(row, 'appraisal-stage-toggle'),
    technical: find(row, 'appraisal-stage-technical'), arrow: find(row, 'appraisal-stage-chevron')
  }));
}
function assertStageRecordsClosed(h) {
  for (const stage of stageControls(h)) {
    assert.equal(stage.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(stage.technical.hidden, true);
    assert.equal(stage.technical.textContent, '');
  }
}

function harness({ runTask = null, configured = true } = {}) {
  let now = 0;
  const intervals = new Map(), runs = [], busyEvents = []; let intervalId = 0;
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const doc = { activeElement: null, createElement(tag) { return new Element(tag, doc); } };
  const app = doc.createElement('div'), panel = doc.createElement('section'), messages = doc.createElement('div');
  app.append(panel); panel.append(messages);
  const implementation = load({ Date: TestDate, setInterval(callback) { intervals.set(++intervalId, callback); return intervalId; }, clearInterval(id) { intervals.delete(id); } });
  const options = { app, panel, messages, onBusyChange: busy => busyEvents.push(busy) };
  if (configured) options.runTask = args => { runs.push(args); return runTask?.(args); };
  const controller = implementation.create(options);
  const send = () => controller.send({ text: '请鉴定这件商品', photos: [{ url: 'blob:uploaded-photo', name: 'my-photo.jpg' }], skill: '鉴美妆' });
  assert.equal(send(), true);
  return {
    controller, app, panel, messages, doc, busyEvents, intervals, runs, send,
    get: name => find(messages, name),
    emit(event, index = runs.length - 1) { runs[index].onEvent(event); },
    advance(time) { now = time; for (const callback of [...intervals.values()]) callback(); }
  };
}

const step = (id, technical) => ({ type: 'step', id, title: `检查第 ${id} 项细节`, detail: '正在核对可见特征', status: 'active', ...(technical ? { technical } : {}) });
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test('the clock only measures elapsed time and never fabricates task steps or conclusions', () => {
  const h = harness();
  assert.equal(h.runs.length, 1);
  assert.equal(h.runs[0].photos[0].url, 'blob:uploaded-photo');
  assert.equal(h.runs[0].text, '请鉴定这件商品');
  assert.equal(h.get('appraisal-process-summary').getAttribute('aria-expanded'), 'true');
  assert.equal(h.get('appraisal-process-body').inert, false);
  assert.equal(stageControls(h).length, 0);
  h.advance(120000);
  assert.equal(h.controller.busy, true);
  assert.equal(stageControls(h).length, 0);
  assert.equal(h.get('appraisal-result'), null);
  assert.match(h.get('appraisal-elapsed').textContent, /2分\s*00秒/);
  h.emit({ type: 'heartbeat' });
  assert.equal(stageControls(h).length, 0);
  assertStageRecordsClosed(h);
});

test('actual events append steps while updates retain one row per step and show only three recent records', () => {
  const h = harness();
  for (let id = 1; id <= 6; id++) h.emit(step(String(id)));
  const stages = stageControls(h);
  assert.equal(stages.length, 6);
  assert.equal(stages.filter(stage => !stage.row.hidden).length, 3);
  assert.ok(stages.slice(0, 3).every(stage => stage.row.hidden));
  assert.ok(stages.slice(3).every(stage => !stage.row.hidden));
  h.emit({ ...step('6'), status: 'done' });
  assert.equal(stageControls(h).length, 6);
  assert.equal(stages[5].row.dataset.state, 'done');
  assert.match(h.get('appraisal-history-toggle').textContent, /查看前面 3 条记录/);
  assertStageRecordsClosed(h);
});

test('history expanded by the user remains open when further events arrive', () => {
  const h = harness();
  for (let id = 1; id <= 6; id++) h.emit(step(String(id)));
  h.get('appraisal-history-toggle').onclick();
  assert.ok(stageControls(h).every(stage => !stage.row.hidden));
  h.emit(step('7'));
  assert.equal(stageControls(h).length, 7);
  assert.ok(stageControls(h).every(stage => !stage.row.hidden));
  assert.equal(h.get('appraisal-history-toggle').getAttribute('aria-expanded'), 'true');
});

test('reference group headings follow the visible cutoff and return to the original group starts when history opens', () => {
  const h = harness();
  const records = [
    ['已读取 SKILL.md', true],
    ['查看鉴定技能目录结构', false],
    ['已读取 point-match.md', false],
    ['已读取 wording.md', true],
    ['确认图片文件存在', false],
    ['查看批量鉴定脚本参数', false],
    ['已读取 appraise_batch.py', false]
  ];
  records.forEach(([title, groupStart], index) => h.emit({
    type: 'step', id: `ref-${index}`, title, detail: '', status: 'active',
    reference: true, groupStart, technical: [`record_${index}()`]
  }));
  const stages = stageControls(h);
  const visibleHeadings = () => stages.flatMap((stage, index) => {
    const heading = find(stage.row, 'appraisal-stage-group');
    if (stage.row.hidden || !heading || heading.hidden) return [];
    assert.equal(heading.tagName, 'H3');
    assert.equal(heading.textContent, '深度思考');
    return [index];
  });
  assert.deepEqual(stages.map(stage => stage.row.hidden), [true, true, true, true, false, false, false]);
  assert.deepEqual(visibleHeadings(), [4], 'a hidden group start must not orphan its visible records');
  assert.match(stages[6].toggle.textContent, /已读取 appraise_batch\.py/);
  assertStageRecordsClosed(h);
  h.get('appraisal-history-toggle').onclick();
  assert.ok(stages.every(stage => !stage.row.hidden));
  assert.deepEqual(visibleHeadings(), [0, 3]);
  assert.match(stages[0].toggle.textContent, /已读取 SKILL\.md/);
  assert.match(stages[2].toggle.textContent, /已读取 point-match\.md/);
  h.get('appraisal-history-toggle').onclick();
  assert.deepEqual(visibleHeadings(), [4]);
  assertStageRecordsClosed(h);
});

test('allowed reference titles remain readable while code requires an explicit reveal and completion clears it', () => {
  const h = harness();
  h.emit({
    type: 'step', id: 'reference-file', title: '已读取 SKILL.md', detail: '', status: 'active',
    reference: true, groupStart: true, technical: ['cat skills/private/internal.md']
  });
  const stage = stageControls(h)[0];
  assert.match(stage.toggle.textContent, /已读取 SKILL\.md/);
  assertStageRecordsClosed(h);
  assert.doesNotMatch(h.get('appraisal-process').textContent, /cat skills|private\/internal/);
  stage.toggle.onclick();
  assert.equal(stage.technical.hidden, false);
  assert.equal(stage.technical.textContent, 'cat skills/private/internal.md');
  stage.technical.children[0].focus();
  h.advance(12000);
  h.emit({ type: 'complete', result: '鉴定结论已生成' });
  assert.equal(h.get('appraisal-status-title').textContent, '已完成');
  assert.equal(h.get('appraisal-elapsed').textContent.replaceAll(' ', ''), '12秒');
  assert.equal(h.get('appraisal-process-summary').getAttribute('aria-expanded'), 'false');
  assert.equal(h.doc.activeElement, h.get('appraisal-process-summary'));
  assertStageRecordsClosed(h);
  assert.doesNotMatch(h.get('appraisal-process').textContent, /cat skills|private\/internal/);
  h.advance(60000);
  assert.equal(h.get('appraisal-elapsed').textContent.replaceAll(' ', ''), '12秒');

  const ordinary = harness();
  ordinary.emit({ type: 'step', id: 'ordinary-file', title: '已读取 SKILL.md', detail: '', status: 'active' });
  assert.doesNotMatch(stageControls(ordinary)[0].toggle.textContent, /SKILL\.md/,
    'reference exceptions must not relax ordinary event sanitization');
});

test('readable process copy hides code and disables technical actions when records are absent', () => {
  const h = harness();
  h.emit({ type: 'step', id: 'unsafe', title: 'sandbox {"mode":"new"}', detail: '读取 skills/internal.md', status: 'active' });
  const stage = stageControls(h)[0];
  assert.equal(stage.toggle.disabled, true);
  assert.equal(stage.arrow.hidden, true);
  assert.equal(h.get('appraisal-technical'), null);
  assert.doesNotMatch(accessibleCopy(h.get('appraisal-process')), publicCode);
  assert.doesNotMatch(accessibleCopy(h.get('appraisal-process')), nonproductionCopy);
  assertStageRecordsClosed(h);
});

test('technical disclosure shows only that step records and clears them on close', () => {
  const h = harness();
  h.emit(step('1', 'sandbox {"photo":1}'));
  h.emit(step('2', '读取 skills/second.md'));
  const [first, second] = stageControls(h);
  assert.equal(first.toggle.disabled, false);
  assert.equal(first.arrow.hidden, false);
  assertStageRecordsClosed(h);
  first.toggle.onclick();
  assert.equal(first.technical.hidden, false);
  assert.match(first.technical.textContent, /sandbox/);
  assert.doesNotMatch(first.technical.textContent, /second\.md/);
  first.technical.children[0].focus();
  first.toggle.onclick();
  assert.equal(h.doc.activeElement, first.toggle);
  assert.equal(first.technical.textContent, '');
  second.toggle.onclick();
  assert.match(second.technical.textContent, /second\.md/);
  assert.doesNotMatch(second.technical.textContent, /sandbox/);
  second.technical.children[0].focus();
  h.get('appraisal-process-summary').onclick();
  assert.equal(h.doc.activeElement, h.get('appraisal-process-summary'));
  assert.equal(h.get('appraisal-process-body').inert, true);
  assertStageRecordsClosed(h);
  h.get('appraisal-process-summary').onclick();
  assertStageRecordsClosed(h);
});

test('completion events collapse records, restore focus and safely render only the supplied conclusion', () => {
  const h = harness();
  h.emit(step('1', 'sandbox {"photo":1}'));
  const stage = stageControls(h)[0];
  stage.toggle.onclick();
  stage.technical.children[0].focus();
  h.emit({ type: 'complete', result: { title: '鉴定结果', paragraphs: ['这张照片还需要补充细节。', '<img src=x onerror=alert(1)>'] } });
  const result = h.get('appraisal-result');
  assert.ok(result);
  assert.match(result.textContent, /这张照片还需要补充细节/);
  assert.match(result.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(all(result, node => node.tagName === 'IMG').length, 0);
  assert.doesNotMatch(result.textContent, /YSL|65 分|GCCCMT74DB/);
  assert.equal(h.controller.busy, false);
  assert.equal(h.intervals.size, 0);
  assert.equal(h.get('appraisal-process-summary').getAttribute('aria-expanded'), 'false');
  assert.equal(h.doc.activeElement, h.get('appraisal-process-summary'));
  assertStageRecordsClosed(h);
  h.emit(step('late'));
  h.emit({ type: 'complete', result: '不应显示的第二个结果' });
  h.advance(90000);
  assert.equal(stageControls(h).length, 1);
  assert.equal(h.get('appraisal-result'), result);
  assert.doesNotMatch(result.textContent, /第二个结果/);
  assert.deepEqual(h.busyEvents, [true, false]);
});

test('a runner may complete synchronously without leaving a timer running', () => {
  const h = harness({ runTask: ({ onEvent }) => {
    onEvent(step('1'));
    onEvent({ type: 'complete', result: '鉴定已完成' });
  } });
  assert.equal(h.controller.busy, false);
  assert.equal(h.intervals.size, 0);
  assert.equal(h.get('appraisal-result').textContent, '鉴定已完成');
});

test('percentages appear only when reported and time never increments them', () => {
  const h = harness(), track = h.get('appraisal-activity-track'), value = h.get('appraisal-progress-value');
  assert.equal(track.getAttribute('role'), 'progressbar');
  assert.equal(track.getAttribute('aria-valuenow'), null);
  assert.equal(value.hidden, true);
  h.emit({ type: 'progress', value: 42 });
  assert.equal(track.getAttribute('aria-valuenow'), '42');
  assert.equal(value.hidden, false);
  assert.match(value.textContent, /42/);
  h.advance(60000);
  assert.equal(track.getAttribute('aria-valuenow'), '42');
  h.emit({ type: 'progress', value: null });
  assert.equal(track.getAttribute('aria-valuenow'), null);
  assert.equal(value.hidden, true);
});

test('closing aborts the task, clears records and rejects late runner events', () => {
  const h = harness();
  h.emit(step('1', 'sandbox {}'));
  stageControls(h)[0].toggle.onclick();
  h.controller.close();
  assert.equal(h.runs[0].signal.aborted, true);
  assert.equal(h.controller.busy, false);
  assert.equal(h.intervals.size, 0);
  assert.equal(h.panel.hidden, true);
  assertStageRecordsClosed(h);
  h.emit(step('late'));
  h.emit({ type: 'complete', result: '迟到结果' });
  assert.equal(stageControls(h).length, 1);
  assert.equal(h.get('appraisal-result'), null);
});

test('reset and a new task cannot receive the previous task late results', () => {
  const h = harness();
  h.emit(step('old'));
  h.controller.reset();
  assert.equal(h.runs[0].signal.aborted, true);
  assert.equal(h.send(), true);
  h.emit({ type: 'complete', result: '旧结论' }, 0);
  h.emit(step('new'), 1);
  assert.equal(h.controller.busy, true);
  assert.equal(h.get('appraisal-result'), null);
  assert.equal(stageControls(h).length, 1);
  assert.match(stageControls(h)[0].row.textContent, /new/);
});

test('missing task integration shows a formal error instead of a fixed merchandise conclusion', async () => {
  const h = harness({ configured: false });
  await flush();
  assert.equal(h.controller.busy, false);
  assert.equal(h.intervals.size, 0);
  assert.equal(h.get('appraisal-result'), null);
  assert.equal(h.get('appraisal-process').dataset.state, 'error');
  assert.ok(h.get('appraisal-process-error').textContent.trim());
  assert.doesNotMatch(accessibleCopy(h.panel), /YSL|GCCCMT74DB|演示|示例|示范/);
});

test('runner exceptions and rejections become readable retryable errors', async () => {
  for (const runTask of [() => { throw new Error('sandbox internal.md'); }, () => Promise.reject(new Error('sandbox internal.md'))]) {
    const h = harness({ runTask });
    await flush();
    assert.equal(h.controller.busy, false);
    assert.equal(h.get('appraisal-result'), null);
    assert.equal(h.get('appraisal-process').dataset.state, 'error');
    assert.equal(h.get('appraisal-retry').hidden, false);
    assert.doesNotMatch(h.get('appraisal-process-error').textContent, publicCode);
  }
});

test('retry starts a fresh task and ignores callbacks from the failed attempt', () => {
  const h = harness();
  h.emit(step('1', 'sandbox old'));
  stageControls(h)[0].toggle.onclick();
  h.emit({ type: 'error', message: '连接中断，请重试', retryable: true });
  assert.equal(h.get('appraisal-retry').hidden, false);
  assertStageRecordsClosed(h);
  h.get('appraisal-retry').onclick();
  assert.equal(h.runs.length, 2);
  assert.equal(h.runs[0].signal.aborted, true);
  assert.notEqual(h.runs[0].signal, h.runs[1].signal);
  assert.equal(h.controller.busy, true);
  assert.equal(stageControls(h).length, 0);
  h.emit({ type: 'complete', result: '已失效的结果' }, 0);
  assert.equal(h.get('appraisal-result'), null);
  h.emit({ type: 'complete', result: '重试后的结论' }, 1);
  assert.equal(h.get('appraisal-result').textContent, '重试后的结论');
});

test('a non-retryable error does not offer a retry action', () => {
  const h = harness();
  h.emit({ type: 'error', message: '无法处理这张照片', retryable: false });
  assert.equal(h.controller.busy, false);
  assert.equal(h.get('appraisal-retry').hidden, true);
});

test('an older failed task regains retry availability after a newer task finishes', () => {
  const h = harness();
  for (let id = 1; id <= 6; id++) h.emit(step(String(id)));
  h.emit({ type: 'error', message: '连接中断，请重试', retryable: true });
  const retryA = h.get('appraisal-retry');
  const historyA = h.get('appraisal-history-toggle');
  assert.equal(retryA.disabled, false);
  assert.equal(h.send(), true);
  assert.equal(h.runs.length, 2);
  assert.equal(retryA.disabled, true);
  historyA.onclick();
  assert.equal(retryA.disabled, true);
  retryA.onclick();
  assert.equal(h.runs.length, 2, 'a busy task cannot be interrupted by an older retry');
  h.emit({ type: 'complete', result: '第二轮已完成' }, 1);
  assert.equal(retryA.disabled, false, 'all older retry buttons must recover when idle');
  retryA.onclick();
  assert.equal(h.runs.length, 3);
  assert.equal(h.controller.busy, true);
  h.emit({ type: 'complete', result: '第一轮重试完成' }, 2);
  assert.equal(all(h.messages, node => node.classList.contains('appraisal-result')).length, 2);
});

test('runner promises complete only when a valid result is supplied', async () => {
  const completed = harness({ runTask: () => Promise.resolve({ title: '识别完成', paragraphs: ['已收到鉴定结果'] }) });
  await flush();
  assert.equal(completed.controller.busy, false);
  assert.match(completed.get('appraisal-result').textContent, /已收到鉴定结果/);
  const pending = harness({ runTask: () => Promise.resolve(undefined) });
  await flush();
  pending.advance(60000);
  assert.equal(pending.controller.busy, true);
  assert.equal(pending.get('appraisal-result'), null);
  pending.emit({ type: 'complete', result: '稍后收到的结论' });
  assert.equal(pending.get('appraisal-result').textContent, '稍后收到的结论');
});

test('continuous status animation is restricted to active work and disabled for reduced motion', () => {
  const css = readFileSync(new URL('../public/appraisal-conversation.css', import.meta.url), 'utf8');
  const preference = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/g.exec(css);
  assert.ok(preference);
  const start = preference.index + preference[0].length;
  let depth = 1, end = start;
  while (depth && end < css.length) { if (css[end] === '{') depth++; if (css[end] === '}') depth--; end++; }
  const reduced = css.slice(start, end - 1);
  const rules = text => Array.from(text.matchAll(/([^{}]+)\{([^{}]*)\}/g), match => ({ selector: match[1].trim(), declarations: match[2] }));
  const animated = rules(css).filter(rule => /animation(?:-iteration-count)?\s*:[^;]*\binfinite\b/.test(rule.declarations));
  const disabled = rules(reduced).filter(rule => /animation\s*:\s*none\s*!important/.test(rule.declarations));
  const target = selector => selector.trim().split(/\s+/).at(-1).replace(/:not\([^()]*\)/g, '').replace(/\[data-state=["']?(?:running|active)["']?\]/g, '');
  assert.ok(animated.length);
  for (const rule of animated) for (const selector of rule.selector.split(',')) {
    assert.match(selector, /\[data-state=["']?(?:running|active)["']?\]/);
    assert.ok(disabled.some(override => override.selector.split(',').some(part => target(part) === target(selector))), `${target(selector)} needs a reduced-motion override`);
  }
  assert.match(reduced, /transition\s*:\s*none/);
});
