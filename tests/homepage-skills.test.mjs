import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const dataSource = readFileSync(new URL('public/data.js', root), 'utf8');
const carouselSource = readFileSync(new URL('public/app.js', root), 'utf8');
const iconSource = readFileSync(new URL('public/assets/icon-map.js', root), 'utf8');

function evaluate(source, expose) {
  const context = vm.createContext({});
  vm.runInContext(`${source}\n;globalThis.result = ${expose};`, context);
  return context.result;
}

test('鉴颜值 is available in the carousel and the skill picker', () => {
  const { ALL } = evaluate(dataSource, '{ ALL }');
  const orderDeclaration = carouselSource.match(/const order = \[[^\]]+\];/);
  assert.ok(orderDeclaration, 'carousel skill order is declared');
  const carouselSkills = evaluate(orderDeclaration[0], 'order');

  assert.equal(ALL.filter(skill => skill.label === '鉴颜值').length, 1);
  assert.equal(carouselSkills.filter(skill => skill === '鉴颜值').length, 1);
});

test('鉴颜值 uses its own existing local icon asset', () => {
  const iconMap = evaluate(iconSource, 'ICON_FILES');
  assert.equal(iconMap['鉴颜值'], 'face-sparkle.svg');
  assert.equal(existsSync(new URL(`public/assets/icons/${iconMap['鉴颜值']}`, root)), true);
});
