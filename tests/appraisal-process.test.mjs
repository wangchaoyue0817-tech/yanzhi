import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/appraisal-conversation.js', import.meta.url), 'utf8');
const publicCode = /sandbox|\bskill\b|\.md\b|lifecycle|mcp_call|appraise_|Worked/iu;
const nonproductionCopy = /演示|示例|示范/u;

function load(extra = {}) {
  const window = { addEventListener() {}, ...extra };
  const context = vm.createContext({ window, URL: { revokeObjectURL() {} }, ...extra });
  vm.runInContext(source, context);
  return window.AppraisalConversation;
}

test('four readable phases advance only at their boundaries and finish after 40 seconds', () => {
  const { processState, DURATION_MS } = load();
  assert.equal(DURATION_MS, 40000);
  for (const [time, index, title] of [
    [0, 0, '正在检查照片'], [7999, 0, '正在检查照片'],
    [8000, 1, '正在整理鉴定点位'], [17999, 1, '正在整理鉴定点位'],
    [18000, 2, '正在分析细节'], [29999, 2, '正在分析细节'],
    [30000, 3, '正在整理结论'], [39999, 3, '正在整理结论']
  ]) {
    const view = processState(time);
    assert.equal(view.title, title);
    assert.equal(view.index, index);
    assert.equal(view.status, 'running');
    assert.equal(view.phases.filter(phase => phase.state === 'active').length, 1);
    assert.deepEqual(Array.from(view.phases, phase => phase.state),
      Array.from({ length: 4 }, (_, i) => i < index ? 'done' : i === index ? 'active' : 'pending'));
  }
  const complete = processState(DURATION_MS);
  assert.equal(complete.status, 'complete');
  assert.equal(complete.title, '分析完成');
  assert.equal(complete.detail, '鉴定结论已生成');
  assert.equal(complete.elapsedLabel.replaceAll(' ', ''), '40秒');
  assert.ok(complete.phases.every(phase => phase.state === 'done'));
});

test('public process copy stays free of code, paths and internal tool names', () => {
  const { processState, PHASES } = load();
  for (const phase of PHASES) assert.doesNotMatch(`${phase.name} ${phase.title} ${phase.detail}`, publicCode);
  for (let time = 0; time <= 40000; time += 500) {
    for (const status of ['running', 'complete', 'stopped']) {
      const view = processState(time, status);
      assert.doesNotMatch([view.title, view.detail, view.elapsedLabel, ...view.phases.map(phase => phase.label)].join(' '), publicCode);
    }
  }
});

test('elapsed values are bounded and stopping does not imply a generated conclusion', () => {
  const { processState } = load();
  for (const value of [-500, NaN, undefined]) {
    const view = processState(value);
    assert.equal(view.index, 0);
    assert.equal(view.elapsedLabel.replaceAll(' ', ''), '0秒');
  }
  assert.equal(processState(90000).elapsedLabel.replaceAll(' ', ''), '40秒');
  const stopped = processState(19000, 'stopped');
  assert.equal(stopped.title, '分析已停止');
  assert.equal(stopped.detail, '可重新上传照片发起鉴定');
  assert.deepEqual(Array.from(stopped.phases, phase => phase.state), ['done', 'done', 'stopped', 'pending']);
  assert.equal(stopped.status, 'stopped');
});

// Minimal DOM test double. The production controller executes unchanged, including
// its click handlers, clock, focus restoration and deferred technical text.
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
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
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

function find(element, className) {
  if (element.classList.contains(className)) return element;
  for (const child of element.children) { const match = find(child, className); if (match) return match; }
  return null;
}

function accessibleCopy(element) {
  return [element.textContent, element.alt || '', element.getAttribute('aria-label') || '',
    ...element.children.map(accessibleCopy)].join(' ');
}

function stageControls(h) {
  return h.get('appraisal-stages').children.map(row => ({
    row,
    toggle: find(row, 'appraisal-stage-toggle'),
    technical: find(row, 'appraisal-stage-technical')
  }));
}

function assertStageRecordsClosed(h) {
  for (const stage of stageControls(h)) {
    assert.equal(stage.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(stage.technical.hidden, true);
    assert.equal(stage.technical.textContent, '');
  }
}

function harness() {
  let now = 0;
  const intervals = new Map(); let intervalId = 0;
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const doc = { activeElement: null, createElement(tag) { return new Element(tag, doc); } };
  const app = doc.createElement('div'), panel = doc.createElement('section'), messages = doc.createElement('div');
  app.append(panel); panel.append(messages);
  const busyEvents = [];
  const model = load({ Date: TestDate, setInterval(callback) { intervals.set(++intervalId, callback); return intervalId; }, clearInterval(id) { intervals.delete(id); } });
  const controller = model.create({ app, panel, messages, onBusyChange: busy => busyEvents.push(busy) });
  controller.send({ photos: [{ url: 'assets/appraisal/sample-reference.png', name: 'sample', sample: true }] });
  return {
    controller, app, panel, messages, doc, busyEvents, intervals,
    get: name => find(messages, name),
    advance(time) { now = time; for (const callback of [...intervals.values()]) callback(); }
  };
}

test('running process opens readable stages by default while all technical records stay closed', () => {
  const h = harness(), toggle = h.get('appraisal-process-summary'), body = h.get('appraisal-process-body');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(body.getAttribute('aria-hidden'), 'false');
  assert.equal(body.inert, false);
  assert.equal(stageControls(h).length, 4);
  assert.equal(h.get('appraisal-technical'), null, 'global technical disclosure is removed');
  assertStageRecordsClosed(h);
  assert.doesNotMatch(h.get('appraisal-process').textContent, publicCode);
  h.advance(19000);
  assert.equal(h.get('appraisal-status-title').textContent, '正在分析细节');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assertStageRecordsClosed(h);
  assert.doesNotMatch(h.get('appraisal-process').textContent, publicCode);
  toggle.onclick();
  assert.equal(body.getAttribute('aria-hidden'), 'true');
  assert.equal(body.inert, true);
  toggle.onclick();
  assert.equal(body.getAttribute('aria-hidden'), 'false');
  assert.equal(body.inert, false);
  assertStageRecordsClosed(h);
  assert.doesNotMatch(h.get('appraisal-process').textContent, publicCode);
});

test('each stage reveals only its elapsed records and pending stages cannot be opened', () => {
  const h = harness(), stages = stageControls(h);
  assert.equal(stages[0].toggle.disabled, false);
  assert.ok(stages.slice(1).every(stage => stage.toggle.disabled));
  stages[3].toggle.onclick();
  assert.equal(stages[3].technical.hidden, true);
  assert.equal(stages[3].technical.textContent, '');
  stages[0].toggle.onclick();
  assert.equal(stages[0].toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(stages[0].technical.hidden, false);
  assert.match(stages[0].technical.textContent, /\[0s\].*sandbox/);
  assert.doesNotMatch(stages[0].technical.textContent, /\[3s\]/, 'future records must not appear early');
  h.advance(25000);
  assert.match(stages[0].technical.textContent, /\[6s\]/);
  assert.doesNotMatch(stages[0].technical.textContent, /\[(?:9|12|16|20|24)s\]/, 'other stages must not leak into this stage');
  stages[0].toggle.onclick();
  assert.equal(stages[0].technical.hidden, true);
  assert.equal(stages[0].technical.textContent, '');
  assert.equal(stages[2].toggle.disabled, false);
  assert.equal(stages[3].toggle.disabled, true);
  stages[2].toggle.onclick();
  assert.match(stages[2].technical.textContent, /\[20s\]/);
  assert.match(stages[2].technical.textContent, /\[24s\]/);
  assert.doesNotMatch(stages[2].technical.textContent, /sandbox|\[(?:0|3|6|9|12|16|28|32)s\]/);
  h.advance(30000);
  assert.equal(stages[3].toggle.disabled, false);
});

test('collapsing the outer process clears all stage records and restores keyboard focus', () => {
  const h = harness(), toggle = h.get('appraisal-process-summary'), stages = stageControls(h);
  h.advance(25000);
  stages[0].toggle.onclick();
  stages[2].toggle.onclick();
  stages[2].technical.children[0].focus();
  toggle.onclick();
  assertStageRecordsClosed(h);
  assert.equal(h.doc.activeElement, toggle);
  assert.doesNotMatch(h.get('appraisal-process').textContent, publicCode);
  toggle.onclick();
  assertStageRecordsClosed(h);
  assert.doesNotMatch(h.get('appraisal-process').textContent, publicCode);
});

test('40-second completion collapses both levels, restores focus and emits one conclusion', () => {
  const h = harness(), toggle = h.get('appraisal-process-summary'), stages = stageControls(h);
  stages[0].toggle.onclick();
  stages[0].technical.children[0].focus();
  h.advance(39999);
  assert.equal(h.get('appraisal-result'), null);
  assert.equal(h.controller.busy, true);
  h.advance(40000);
  assert.equal(h.controller.busy, false);
  assert.equal(h.intervals.size, 0);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(h.get('appraisal-process-body').inert, true);
  for (const stage of find(h.messages, 'appraisal-stages').children) {
    const button = find(stage, 'appraisal-stage-toggle');
    if (button.disabled) assert.match(button.getAttribute('aria-label'), /尚未开始/);
  }
  assertStageRecordsClosed(h);
  assert.equal(h.doc.activeElement, toggle);
  assert.equal(h.get('appraisal-status-title').textContent, '分析完成');
  assert.doesNotMatch(h.get('appraisal-process').textContent, publicCode);
  const result = h.get('appraisal-result');
  assert.match(result.innerHTML, /AI 鉴定结果：真（正品置信度 65 分）/);
  assert.match(result.innerHTML, /各点位明细/);
  assert.equal((result.innerHTML.match(/scope="row"/g) || []).length, 4);
  h.advance(80000);
  assert.equal(h.get('appraisal-result'), result);
  assert.deepEqual(h.busyEvents, [true, false]);
});

test('conversation uses production copy in visible text and accessible labels throughout the flow', () => {
  const h = harness();
  for (const time of [0, 8000, 18000, 30000]) {
    h.advance(time);
    assert.doesNotMatch(accessibleCopy(h.panel), nonproductionCopy);
  }
  for (const stage of stageControls(h)) stage.toggle.onclick();
  assert.doesNotMatch(accessibleCopy(h.panel), nonproductionCopy);
  h.advance(40000);
  assert.equal(h.get('appraisal-result').getAttribute('aria-label'), '鉴定结论');
  assert.doesNotMatch(accessibleCopy(h.panel), nonproductionCopy);
});

test('leaving an unfinished process stops the clock without manufacturing a conclusion', () => {
  const h = harness();
  h.advance(19000);
  stageControls(h)[0].toggle.onclick();
  h.controller.close();
  assert.equal(h.controller.busy, false);
  assert.equal(h.intervals.size, 0);
  assert.equal(h.panel.hidden, true);
  assert.equal(h.get('appraisal-status-title').textContent, '分析已停止');
  h.advance(80000);
  assert.equal(h.get('appraisal-result'), null);
  assert.equal(h.get('appraisal-process-summary').getAttribute('aria-expanded'), 'false');
  assertStageRecordsClosed(h);
});

test('visual activity follows the actual running stage and becomes quiet when complete or stopped', () => {
  const finished = harness();
  const stages = find(finished.messages, 'appraisal-stages').children;
  const progressbar = finished.get('appraisal-phase-progress');
  const progress = progressbar.children;
  assert.equal(progress.length, 4);
  assert.equal(progressbar.getAttribute('role'), 'progressbar');
  assert.equal(progressbar.getAttribute('aria-valuenow'), '0');
  assert.match(progressbar.getAttribute('aria-valuetext'), /检查照片/);
  assert.equal(finished.get('appraisal-process').dataset.state, 'running');
  assert.equal(stages.filter(stage => stage.dataset.state === 'active').length, 1);
  assert.deepEqual(progress.map(segment => segment.dataset.state), stages.map(stage => stage.dataset.state));
  finished.advance(19000);
  assert.deepEqual(stages.map(stage => stage.dataset.state), ['done', 'done', 'active', 'pending']);
  assert.deepEqual(progress.map(segment => segment.dataset.state), ['done', 'done', 'active', 'pending']);
  assert.equal(progressbar.getAttribute('aria-valuenow'), '2');
  assert.match(progressbar.getAttribute('aria-valuetext'), /分析细节/);
  finished.advance(40000);
  assert.equal(finished.get('appraisal-process').dataset.state, 'complete');
  assert.equal(finished.get('appraisal-process').classList.contains('is-complete'), true);
  assert.ok(stages.every(stage => stage.dataset.state === 'done'));
  assert.ok(progress.every(segment => segment.dataset.state === 'done'));
  assert.equal(progressbar.getAttribute('aria-valuenow'), '4');

  const stopped = harness();
  stopped.advance(19000);
  stopped.controller.close();
  assert.equal(stopped.get('appraisal-process').dataset.state, 'stopped');
  assert.equal(stopped.get('appraisal-process').classList.contains('is-stopped'), true);
  assert.ok(find(stopped.messages, 'appraisal-stages').children.every(stage => stage.dataset.state !== 'active'));
  assert.deepEqual(stopped.get('appraisal-phase-progress').children.map(segment => segment.dataset.state), ['done', 'done', 'stopped', 'pending']);
});

test('continuous status animation is restricted to active work and disabled for reduced motion', () => {
  const css = readFileSync(new URL('../public/appraisal-conversation.css', import.meta.url), 'utf8');
  const preference = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/g.exec(css);
  assert.ok(preference, 'reduced-motion preference must be supported');
  const start = preference.index + preference[0].length;
  let depth = 1, end = start;
  while (depth && end < css.length) {
    if (css[end] === '{') depth++;
    if (css[end] === '}') depth--;
    end++;
  }
  const reduced = css.slice(start, end - 1);
  const rules = text => Array.from(text.matchAll(/([^{}]+)\{([^{}]*)\}/g), match => ({ selector: match[1].trim(), declarations: match[2] }));
  const continuouslyAnimated = rules(css).filter(rule => /animation(?:-iteration-count)?\s*:[^;]*\binfinite\b/.test(rule.declarations));
  assert.ok(continuouslyAnimated.length, 'running status retains a visible activity indicator');
  const motionDisabled = rules(reduced).filter(rule => /animation\s*:\s*none\s*!important/.test(rule.declarations));
  const animationTarget = selector => selector.trim().split(/\s+/).at(-1).replace(/\[data-state=["']?(?:running|active)["']?\]/g, '');
  for (const rule of continuouslyAnimated) {
    for (const selector of rule.selector.split(',')) {
      assert.match(selector, /\[data-state=["']?(?:running|active)["']?\]/, 'finished and stopped states must not keep looping');
      const target = animationTarget(selector);
      assert.ok(motionDisabled.some(disabled => disabled.selector.split(',').some(part => animationTarget(part) === target)), `${target} needs a reduced-motion override`);
    }
  }
  assert.match(reduced, /transition\s*:\s*none/, 'disclosure transitions also respect reduced motion');
});
