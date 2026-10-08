import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = name => readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('beauty-entry-v16.css');
const entry = html.slice(html.indexOf('<section class="beauty-entry'), html.indexOf('<section class="beauty-scanning'));
const page = html.slice(html.indexOf('<section class="beauty-page'), html.indexOf('<input id="photoInput"'));

function elementById(id) {
  return [...page.matchAll(/<([a-z][\w-]*)\b([^>]+)>/g)]
    .find(([, , attributes]) => attributes.includes(`id="${id}"`));
}

test('the skin-derived entry retains all three orbital layers, five moving lights and four reticle corners', () => {
  const orbits = [...entry.matchAll(/<div class="spectrum-orbit orbit-(one|two|three)">([\s\S]*?)<\/div>/g)];
  assert.deepEqual(orbits.map(match => match[1]), ['one', 'two', 'three']);
  assert.equal(orbits.reduce((count, match) => count + (match[2].match(/<i>/g) ?? []).length, 0), 5);
  assert.equal((entry.match(/class="spectrum-ring /g) ?? []).length, 2);
  const reticle = entry.match(/class="spectrum-reticle">([\s\S]*?)<\/div>/)?.[1];
  assert.equal((reticle?.match(/<i>/g) ?? []).length, 4);
  assert.ok(entry.includes('class="spectrum-scan"'));
  assert.ok(entry.includes('<b>BEAUTY</b><small>颜值解析</small>'));
  assert.ok(!entry.includes('beauty-orbit'), 'the earlier simplified orbit must be replaced');
});

test('the entry follows the reference content order without an extra selected-photo block', () => {
  const ordered = ['skin-hero-main', 'skin-hero-description', 'feature-pills', 'id="beautyUpload"', 'skin-hero-stats', 'privacy-note'];
  const positions = ordered.map(name => entry.indexOf(name));
  assert.ok(positions.every(index => index >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(entry.includes('发现你的<br><span>每一面高光</span>'));
  assert.ok(!elementById('beautyStart'));
  assert.ok(!elementById('beautyEntryPhoto'));
  assert.ok(!elementById('beautyBack'));
  assert.ok(!elementById('beautyScenes'));
  assert.equal(elementById('beautyMenu')?.[1], 'button');
  assert.ok(elementById('beautyMenu')[2].includes('aria-label='));
});

test('the composer exposes the four controller interfaces outside the scroll content', () => {
  assert.equal(elementById('beautyPrompt')?.[1], 'input');
  assert.ok(elementById('beautyPrompt')[2].includes('maxlength="250"'));
  assert.ok(elementById('beautyPrompt')[2].includes('aria-label='));
  for (const id of ['beautyComposerUpload', 'beautyComposerSkill', 'beautyComposerSend']) {
    assert.equal(elementById(id)?.[1], 'button');
    assert.ok(elementById(id)[2].includes('type="button"'));
  }
  assert.ok(page.indexOf('id="beautyComposer"') > page.indexOf('id="beautyReport"'));
  assert.ok(css.includes('.beauty-page:has(.beauty-entry[hidden]) .beauty-composer { display:none; }'));
});

test('entry resources load after the base styles and keep the source slow animation cadence with a motion opt-out', () => {
  const styles = [...html.matchAll(/href="(beauty[^\"]+\.css\?v=\d+)"/g)].map(match => match[1]);
  assert.deepEqual(styles, ['beauty-analysis.css?v=16', 'beauty-entry-v16.css?v=16', 'beauty-report-v16.css?v=16', 'beauty-report-v17.css?v=17', 'beauty-celebration.css?v=17']);
  assert.ok(html.includes('type="module" src="beauty-analysis.js?v=17"'));
  for (const [name, seconds] of [['beautyOrbitOne', 22], ['beautyOrbitTwo', 17], ['beautyOrbitThree', 14], ['beautyCorePulse', 5.2], ['beautySpectrumBeam', 6.2]]) {
    assert.ok(css.includes(`animation:${name} ${seconds}s`), `${name} should use the supplied source's final cadence`);
    assert.ok(css.includes(`@keyframes ${name}`));
  }
  const reduced = css.slice(css.indexOf('@media(prefers-reduced-motion:reduce)'));
  assert.ok(reduced.includes('animation:none'));
  for (const selector of ['.skin-spectrum:after', '.spectrum-orbit', '.spectrum-core', '.spectrum-reticle']) assert.ok(reduced.includes(selector));
});
