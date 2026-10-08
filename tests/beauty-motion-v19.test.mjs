import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../public/beauty-report-v16.css', import.meta.url), 'utf8');

function block(selector) {
  const start = css.indexOf(`${selector}{`);
  assert.ok(start >= 0, `${selector} must be defined`);
  const opening = css.indexOf('{', start);
  let depth = 1;
  let end = opening + 1;
  for (; depth && end < css.length; end++) {
    if (css[end] === '{') depth++;
    if (css[end] === '}') depth--;
  }
  assert.equal(depth, 0, `${selector} must have balanced braces`);
  return css.slice(opening + 1, end - 1);
}

test('the result arrival uses a non-interactive radial bloom behind the portrait and reading content', () => {
  const halo = block('.beauty-reveal-halo');
  assert.match(halo, /position:absolute/);
  assert.match(halo, /radial-gradient\(ellipse/);
  assert.match(halo, /z-index:-1/);
  assert.match(halo, /filter:blur\(17px\)/);
  assert.match(halo, /pointer-events:none/);
  assert.match(halo, /animation:beauty-arrival-bloom 1\.6s [^;]+ both/);
  assert.doesNotMatch(halo, /infinite/);
  for (const layer of ['.beauty-reveal-halo:before,.beauty-reveal-halo:after', '.beauty-reveal-halo:after']) {
    assert.match(block(layer), /radial-gradient/);
  }
});

test('the stationary arrival fades away with a small expansion and no sweep or bright rotating flare', () => {
  assert.doesNotMatch(css, /beauty-reveal-beam|beauty-arrival-flare|beauty-ring-turn|beauty-orbit-float|beauty-veil|conic-gradient/);
  const bloom = block('@keyframes beauty-arrival-bloom');
  assert.match(bloom, /0%\{opacity:0/);
  assert.match(bloom, /100%\{opacity:0/);
  assert.doesNotMatch(bloom, /rotate|translate|infinite/);
  for (const value of [...bloom.matchAll(/scale\(([\d.]+)\)/g)].map(match => Number(match[1]))) {
    assert.ok(value >= .95 && value <= 1.05, 'bloom expansion must remain subtle');
  }
  assert.doesNotMatch(block('@keyframes beauty-halo-layer'), /transform/);
});

test('portrait ellipses remain stationary with opacity-only breathing and a maximum of two rings', () => {
  const ring = block('.beauty-portrait-orbits i');
  assert.match(ring, /animation:beauty-orbit-breathe 16s ease-in-out infinite/);
  assert.match(block('.beauty-portrait-orbits i:before,.beauty-portrait-orbits i:after'), /content:none/);
  assert.match(block('.beauty-portrait-orbits i:nth-child(3)'), /display:none/);
  assert.doesNotMatch(block('@keyframes beauty-orbit-breathe'), /transform|translate|rotate/);
});

test('the crown enters by fading and rising five pixels without an overshoot', () => {
  const crown = block('@keyframes beauty-crown-arrive');
  assert.match(crown, /from\{opacity:0;transform:translateY\(5px\)\}/);
  assert.match(crown, /to\{opacity:1;transform:none\}/);
  assert.doesNotMatch(crown, /scale|blur|rotate|\d+%/);
});

test('tier hierarchy comes from soft color and intensity while ambient color stays still', () => {
  assert.match(block('.beauty-report[data-tier=natural] .beauty-reveal-halo'), /--beauty-halo-strength:\.24/);
  assert.match(css, /\n\.beauty-report\[data-tier=icon\] \.beauty-reveal-halo\{--beauty-halo-strength:\.9\}/);
  assert.match(block('.beauty-aurora i'), /animation:beauty-ambient-breathe 18s ease-in-out infinite/);
  assert.doesNotMatch(block('@keyframes beauty-ambient-breathe'), /transform|translate|rotate/);
  const icon = block('.beauty-report[data-tier=icon] .beauty-aurora');
  assert.match(icon, /background:none/);
  assert.match(icon, /animation:none/);
});

test('reduced motion disables the arrival bloom and every continuous decoration', () => {
  const reduced = block('@media(prefers-reduced-motion:reduce)');
  assert.match(reduced, /animation:none!important/);
  assert.match(reduced, /transition:none!important/);
  assert.match(reduced, /\.beauty-reveal-halo\{display:none\}/);
  assert.match(reduced, /\.beauty-coronation\{opacity:1;transform:none\}/);
});
