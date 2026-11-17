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
const groupAt = (directoryList, letter) => directoryList.groups.find(group => group.letter === letter)?.items ?? [];

test('expanded demo directories have useful same-letter groups and retain selection indices', () => {
  const bags = category('bags');
  const brands = directory.brands(bags);
  assert.ok(brands.groups.length >= 8);
  assert.ok(groupAt(brands, 'B').length >= 3);
  assert.ok(groupAt(brands, 'C').length >= 4);
  assert.equal(bags.groups[0].name, '香奈儿 Chanel');
  assert.equal(bags.groups[0].styles[0], 'Classic Flap');
  assert.equal(bags.groups[1].name, '路易威登 Louis Vuitton');
  assert.equal(bags.groups[1].styles[0], 'Speedy');
  assert.ok(groupAt(directory.series(bags.groups[0]), 'C').length >= 4);
  assert.ok(groupAt(directory.series(bags.groups[1]), 'N').length >= 3);
  assert.ok(groupAt(directory.series(category('footwear').groups[0]), 'A').length >= 6);
  assert.ok(directory.series(category('electronics-appliances').groups[0], 'macbook').groups[0].items.length >= 2);
});

test('every display name maps to a single choice within its own directory level', () => {
  for (const entry of catalog) {
    assert.equal(new Set(entry.groups.map(brand => brand.name)).size, entry.groups.length, entry.id);
    for (const brand of entry.groups) {
      const series = brand.styles.map(style => typeof style === 'string' ? style : style.name);
      assert.ok(series.length > 0, `${entry.id}: ${brand.name}`);
      assert.equal(new Set(series).size, series.length, `${entry.id}: ${brand.name}`);
    }
  }
});
