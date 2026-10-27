import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const source = read('public/assets/icons/face-sparkle.svg');
const exported = read('deliverables/icons/beauty-blue.svg');
const paths = svg => [...svg.matchAll(/<path\s+d="([^"]+)"/g)].map(match => match[1]);

test('beauty icon matches the family grid and regular line weight', () => {
  for (const svg of [source, exported]) {
    assert.match(svg, /viewBox="0 0 256 256"/);
    assert.match(svg, /stroke-width="16"/);
    assert.match(svg, /stroke-linecap="round"/);
    assert.match(svg, /stroke-linejoin="round"/);
    assert.match(svg, /fill="none"/);
  }
  assert.equal(16 / 256 * 24, 1.5);
});

test('blue export preserves the application icon geometry', () => {
  assert.equal(paths(source).length, 3, 'face, expression and one sparkle');
  assert.deepEqual(paths(exported), paths(source));
  assert.equal(exported.match(/transform="([^"]+)"/)[1], source.match(/transform="([^"]+)"/)[1]);
});

test('blue export is transparent and self-contained with the homepage blue palette', () => {
  const style = read('public/spectral.css').toLowerCase();
  const stops = [...exported.matchAll(/<stop offset="([^"]+)" stop-color="([^"]+)"/g)];
  assert.deepEqual(stops.map(stop => stop[1]), ['0', '0.32', '0.72', '1']);
  assert.deepEqual(stops.map(stop => stop[2]), ['#F2EFFF', '#C1C6FF', '#65AAFF', '#E5D5FF']);
  for (const stop of stops) assert.ok(style.includes(stop[2].toLowerCase()));
  assert.match(exported, /gradientUnits="userSpaceOnUse"/);
  for (const [, id] of exported.matchAll(/url\(#([^)]*)\)/g)) {
    assert.ok(exported.includes(`id="${id}"`));
  }
  assert.doesNotMatch(exported, /currentColor|var\(|(?:href|style)=|<(?:image|script|text|rect|foreignObject)\b/i);
});
