import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const readPublic = file => readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(readPublic('expert-directory.js'), context);
const catalog = vm.runInContext(`${readPublic('expert-catalog.js')}\nEXPERT_CATALOG`, context);
const directory = context.ExpertDirectory;
const category = id => catalog.find(entry => entry.id === id);
const letters = directoryList => Array.from(directoryList.groups, group => group.letter);
const names = directoryList => Array.from(directoryList.groups.flatMap(group => group.items), item => item.name);

test('bilingual brand names use their English initials with original selection indices', () => {
  const bags = category('bags');
  const list = directory.brands(bags);
  assert.deepEqual(letters(list).filter(letter => ['C', 'D', 'G', 'L'].includes(letter)), ['C', 'D', 'G', 'L']);
  for (const [letter, name] of [['C', '香奈儿 Chanel'], ['D', '迪奥 Dior'], ['G', '古驰 Gucci'], ['L', '路易威登 Louis Vuitton']]) {
    assert.ok(list.groups.find(group => group.letter === letter).items.some(item => item.name === name));
  }
  for (const { items } of list.groups) {
    for (const { index, name } of items) assert.equal(bags.groups[index].name, name);
  }
  assert.deepEqual(Array.from(list.popular, item => item.index), [0, 1, 2]);
});

test('brand search matches brand labels and series search matches only the active brand’s series names', () => {
  const bags = category('bags');
  assert.deepEqual(names(directory.brands(bags, '奈儿')), ['香奈儿 Chanel']);
  assert.deepEqual(names(directory.brands(bags, 'louisvuitton')), ['路易威登 Louis Vuitton']);
  assert.deepEqual(names(directory.brands(bags, 'Classic Flap')), []);
  assert.deepEqual(names(directory.brands(bags, ' Chanel 2.55 ')), []);
  assert.equal(directory.brands(bags, 'Chanel').popular.length, 0);
  assert.deepEqual(names(directory.series(bags.groups[0], 'classic flap')), ['Classic Flap']);
  assert.deepEqual(names(directory.series(bags.groups[0], 'Chanel 2.55')), []);
  assert.deepEqual(names(directory.brands(category('beauty'), 'lancome')), ['Lancôme']);
  assert.deepEqual(names(directory.brands(category('beauty'), 'MAC')), ['M·A·C']);
  assert.deepEqual(letters(directory.brands(bags, 'Alpine')), []);
});

test('Chinese names group by pinyin, including category types without a brand', () => {
  const spirits = directory.brands(category('spirits'));
  assert.deepEqual(letters(spirits), ['H', 'L', 'M', 'W']);
  assert.deepEqual(names(spirits), ['Hennessy', '泸州老窖', '茅台', '五粮液']);
  const porcelain = directory.brands(category('porcelain'));
  assert.deepEqual(letters(porcelain), ['C', 'D', 'F', 'Q']);
  assert.equal(porcelain.popular.length, 0);
});

test('series groups put numeric models last and retain catalog metadata', () => {
  const chanel = category('bags').groups[0];
  const chanelSeries = directory.series(chanel);
  assert.equal(letters(chanelSeries).at(-1), '#');
  for (const [letter, name] of [['B', 'Boy Chanel'], ['C', 'Classic Flap'], ['#', '2.55']]) {
    assert.ok(chanelSeries.groups.find(group => group.letter === letter).items.some(item => item.name === name));
  }
  const compact = directory.series(chanel, '２.５５');
  assert.equal(compact.groups[0].items[0].index, 1);
  const cpb = category('beauty').groups[0];
  assert.equal(letters(directory.series(cpb)).at(-1), '#');
  const item = directory.series(cpb, '通用瓶').groups[0].items[0];
  assert.equal(item.index, 0);
  assert.equal(item.name, '全品牌通用瓶鉴定');
  assert.equal(item.ai, true);
  assert.equal(item.badge, '无损');
  assert.deepEqual(letters(directory.series(cpb, '无关款式')), []);
});

test('missing catalog levels yield empty directory sections', () => {
  assert.deepEqual(letters(directory.brands(null)), []);
  assert.deepEqual(letters(directory.series(null)), []);
});
