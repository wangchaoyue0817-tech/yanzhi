import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const markdown = read('docs/beauty-loading-knowledge-50.md');
const rows = markdown.split('\n')
  .filter(line => /^\| (skin|sun|base|hair|eyes|lips|health)-/.test(line))
  .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));

test('knowledge pool contains fifty unique cards using the current four loading fields', () => {
  const loading = read('public/beauty-loading.js');
  assert.match(loading, /const tip = \(id, category, title, body\)/);
  assert.match(markdown, /\| id \| category \| title \| body \| 核验来源（非卡片字段） \|/);
  assert.equal(rows.length, 50);
  assert.equal(new Set(rows.map(row => row[0])).size, 50);
  assert.equal(new Set(rows.map(row => row[2])).size, 50);
  for (const row of rows) {
    assert.equal(row.length, 5, 'four UI fields and one separate editorial source');
    assert.ok(row.every(Boolean));
    assert.match(row[0], /^[a-z]+(?:-[a-z]+)+$/);
    assert.ok([...row[2]].length <= 16, `title too long: ${row[0]}`);
    assert.ok([...row[3]].length >= 30 && [...row[3]].length <= 65, `body length: ${row[0]}`);
  }
});

test('every knowledge card cites a direct institutional source', () => {
  const allowed = new Set(['www.aad.org', 'www.fda.gov', 'www.skincancer.org',
    'www.canada.ca', 'www.nhs.uk', 'health.nih.gov', 'www.nhlbi.nih.gov',
    'www.cdc.gov', 'www.who.int']);
  const sources = new Set();
  for (const row of rows) {
    const match = row[4].match(/^\[[^\]]+\]\((https:\/\/[^)]+)\)$/);
    assert.ok(match, `missing source: ${row[0]}`);
    const source = new URL(match[1]);
    assert.ok(allowed.has(source.hostname), `non-institutional source: ${row[0]}`);
    assert.notEqual(source.pathname, '/', 'cite an article, not a homepage');
    sources.add(source.href);
  }
  assert.ok(sources.size >= 20, 'use multiple independently sourced topics');
});

test('qualified quantities and new-category integration notes are preserved', () => {
  const body = id => rows.find(row => row[0] === id)[3];
  assert.match(body('health-sleep-time'), /18—60 岁.*至少 7 小时/);
  assert.match(body('health-move-chunks'), /成年人.*150 分钟.*中等强度有氧/);
  assert.match(body('skin-acne-patience'), /六到八周.*一些改善/);
  assert.match(body('skin-product-trial'), /按说明局部试用，重复七到十天/);
  assert.match(body('sun-spf-time'), /户外.*每两小时/);
  assert.match(body('sun-window'), /部分 UVA.*普通窗玻璃/);
  assert.match(markdown, /新增“护肤”“防晒”“健康”分类/);
  assert.match(markdown, /未替换页面内容/);
});
