import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../public/appraisal-progress-model.js', import.meta.url), 'utf8'), context);
const { createState, applyEvent, view } = context.JianxAppraisalProgress;
const ids = value => Array.from(value);
const start = (state, number, extra = {}) => applyEvent(state, { type: 'step', id: `s${number}`, title: `检查细节 ${number}`, detail: `整理本次照片中的细节 ${number}`, status: 'active', ...extra }, number * 1000);

test('the timeline is empty until actual task events arrive', () => {
  const state = createState(0);
  assert.equal(state.steps.length, 0);
  assert.deepEqual(ids(view(state).recentIds), []);
  applyEvent(state, { type: 'heartbeat' }, 40000);
  assert.equal(state.steps.length, 0);
  assert.equal(state.status, 'running');
  assert.equal(view(state, 90000).progress, null);
});

test('arbitrary task lengths show current plus two recent stages and fold older history', () => {
  for (const length of [1, 3, 7, 20]) {
    const state = createState(0);
    for (let i = 1; i <= length; i++) start(state, i);
    const displayed = view(state, length * 1000);
    assert.equal(state.steps.length, length);
    assert.equal(displayed.currentId, `s${length}`);
    assert.deepEqual(ids(displayed.recentIds), Array.from({ length: Math.min(3, length) }, (_, i) => `s${Math.max(1, length - 2) + i}`));
    assert.deepEqual(ids(displayed.historyIds), Array.from({ length: Math.max(0, length - 3) }, (_, i) => `s${i + 1}`));
    assert.equal(state.steps.filter(step => step.status === 'active').length, 1);
    assert.ok(state.steps.every(step => !['pending', 'future'].includes(step.status)));
  }
});

test('same-stage updates merge technical records without new rows or duplicate events', () => {
  const state = createState(0);
  start(state, 1, { eventId: 'first', technical: ['read photo', 'read photo'] });
  start(state, 1, { eventId: 'update', detail: '检查已上传照片的清晰度', technical: ['read photo', 'inspect dimensions'] });
  assert.equal(state.steps.length, 1);
  assert.equal(state.steps[0].detail, '检查已上传照片的清晰度');
  assert.deepEqual(ids(state.steps[0].technical), ['read photo', 'inspect dimensions']);
  assert.equal(start(state, 2, { eventId: 'update' }), false);
  assert.equal(state.steps.length, 1);
  start(state, 2);
  assert.equal(start(state, 1, { detail: '迟到的更新' }), false);
  assert.equal(view(state).currentId, 's2');
});

test('the clock never invents stages, percent or a completion for long tasks', () => {
  const state = createState(0);
  start(state, 1);
  const long = view(state, 62000);
  assert.equal(long.status, 'running');
  assert.equal(long.title, '检查细节 1');
  assert.equal(long.elapsedLabel, '1分 02秒');
  assert.equal(long.detail, '仍在处理当前环节，请稍候');
  assert.equal(long.progress, null);
  assert.equal(long.steps.length, 1);
  assert.equal(view(state, 3600000).elapsedLabel, '60分 00秒');
  applyEvent(state, { type: 'heartbeat' }, 62000);
  assert.equal(view(state, 63000).detail, '整理本次照片中的细节 1');
});

test('percentage is displayed only when explicitly supplied and cannot complete a task', () => {
  const state = createState(0);
  for (const value of [undefined, NaN, Infinity, -1, 101, '50']) assert.equal(applyEvent(state, { type: 'progress', value }, 1000), false);
  assert.equal(state.progress, null);
  applyEvent(state, { type: 'progress', value: 42.5 }, 2000);
  assert.equal(view(state, 3000).progress, 42.5);
  applyEvent(state, { type: 'progress', value: 100 }, 4000);
  assert.equal(state.progress, 99);
  assert.equal(state.status, 'running');
  applyEvent(state, { type: 'progress', value: null }, 5000);
  assert.equal(view(state).progress, null);
});

test('completion requires a result and freezes elapsed time; later events are ignored', () => {
  const state = createState(0);
  start(state, 1);
  for (const result of [null, undefined, '', ' ', {}, { title: ' ' }, { paragraphs: ['', ' '] }, []]) {
    assert.equal(applyEvent(state, { type: 'complete', result }, 40000), false);
    assert.equal(state.status, 'running');
  }
  assert.equal(applyEvent(state, { type: 'complete', result: { title: '检查结果', paragraphs: ['照片信息已整理'] } }, 62000), true);
  assert.equal(state.steps[0].status, 'done');
  assert.equal(view(state, 900000).elapsedLabel, '1分 02秒');
  assert.equal(view(state).title, '分析完成');
  assert.equal(start(state, 2), false);
  assert.equal(applyEvent(state, { type: 'error', message: '迟到错误' }), false);
  assert.equal(state.steps.length, 1);
});

test('failure and stop preserve finished records and do not manufacture a result', () => {
  for (const type of ['error', 'stop']) {
    const state = createState(0);
    start(state, 1); start(state, 2);
    applyEvent(state, { type, message: '连接中断，请重试', retryable: false }, 7000);
    assert.equal(state.steps[0].status, 'done');
    assert.equal(state.steps[1].status, type === 'stop' ? 'stopped' : 'error');
    assert.equal(state.result, null);
    assert.equal(state.retryable, false);
    assert.equal(view(state, 70000).elapsedLabel, '7 秒');
    assert.equal(applyEvent(state, { type: 'complete', result: '迟到结果' }), false);
  }
});

test('public summaries reject code, tool names, paths and prototype wording', () => {
  for (const raw of ['sandbox {"lifecycle":"turn"}', '阅读 skill 的第 1-127 行', '/private/path/file', '读取 skills/inspect', 'single-image.md', 'appraise_batch', 'mcp_call', '运行 const result = {}', '<img src=x>', '示例检查', '演示阶段', 'mock task']) {
    const state = createState(0);
    start(state, 1, { title: raw, detail: raw, technical: raw });
    assert.equal(state.steps[0].title, '正在处理任务', raw);
    assert.equal(state.steps[0].detail, '正在处理当前环节', raw);
    assert.equal(state.steps[0].technical[0], raw);
    assert.doesNotMatch(`${view(state, 1000).title} ${view(state, 1000).detail}`, /sandbox|skill|mcp|\.md|演示|示例|mock/iu);
  }
  const state = createState(0);
  applyEvent(state, { type: 'error', message: 'Error at /private/app.js' }, 1);
  assert.equal(view(state).detail, '暂时无法完成处理，请重试');
});

test('readable Unicode summaries survive and invalid events cannot claim an event id', () => {
  const state = createState(0);
  assert.equal(applyEvent(state, { type: 'step', id: '', status: 'active', eventId: 'reused' }, 1), false);
  start(state, 1, { title: '核对 YSL 包装细节', detail: '检查图片中的图案与文字', eventId: 'reused' });
  assert.equal(view(state, 1000).title, '核对 YSL 包装细节');
  assert.equal(view(state, 1000).detail, '检查图片中的图案与文字');
  assert.equal(state.seen.size, 1);
  const noPercent = createState(0);
  applyEvent(noPercent, { type: 'complete', result: '已完成本次处理' }, 100);
  assert.equal(view(noPercent).progress, null);
  const explicit = createState(0);
  applyEvent(explicit, { type: 'progress', value: 90 }, 1);
  applyEvent(explicit, { type: 'complete', result: { paragraphs: ['已完成本次处理'] } }, 100);
  assert.equal(view(explicit).progress, 100);
});
