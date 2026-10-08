import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {getBeautyCelebrationConfig, startBeautyCelebration} from '../public/beauty-celebration.js';

function environment(reducedMotion = false) {
  const timers = new Map();
  let nextTimer = 0;
  let created = 0;
  let now = 0;
  const document = {
    defaultView:{
      matchMedia:() => ({matches:reducedMotion}),
      setTimeout(callback, delay) {const id = ++nextTimer; timers.set(id, {callback, at:now + delay}); return id;},
      clearTimeout(id) {timers.delete(id);},
    },
    createElement(tag) {
      created++;
      return {
        tag, ownerDocument:document, children:[], attributes:{}, clientWidth:350,
        style:{values:{},setProperty(name, value) {this.values[name] = value;}},
        setAttribute(name, value) {this.attributes[name] = value;},
        appendChild(child) {this.children.push(child); child.parent = this;},
        remove() {if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null;},
      };
    },
  };
  const host = document.createElement('section');
  created = 0;
  return {host, timers, get created() {return created;}, tick(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= now) {timers.delete(id); timer.callback();}
  }};
}

function allNodes(root) {return [root, ...root.children.flatMap(allNodes)];}

test('the five score intervals produce progressively richer finite celebrations', () => {
  const cases = [[0,'natural'],[59,'natural'],[60,'fresh'],[74,'fresh'],[75,'radiant'],[84,'radiant'],[85,'spotlight'],[94,'spotlight'],[95,'icon'],[100,'icon']];
  for (const [score, tier] of cases) assert.equal(getBeautyCelebrationConfig(score).tier, tier);
  const configs = [52,68,80,90,97].map(getBeautyCelebrationConfig);
  assert.deepEqual(configs.map(config => config.bursts.length), [0,0,1,2,4]);
  assert.deepEqual(configs.map(config => config.confetti), [0,0,12,26,38]);
  assert.equal(configs[0].scan, true);
  assert.ok(configs.every(config => config.duration >= 1000 && config.duration <= 3000));
  assert.ok(configs.every(config => config.nodeCount <= 140), 'mobile animation never exceeds 140 DOM nodes');
  assert.ok(configs.slice(1).every((config, index) => config.nodeCount > configs[index].nodeCount));
});

test('configuration is deterministic, bounded, immutable and independent between calls', () => {
  assert.deepEqual(getBeautyCelebrationConfig(97), getBeautyCelebrationConfig(97));
  assert.equal(getBeautyCelebrationConfig(-30).score, 0);
  assert.equal(getBeautyCelebrationConfig(140).score, 100);
  assert.equal(getBeautyCelebrationConfig(NaN).tier, 'natural');
  assert.equal(getBeautyCelebrationConfig('90').tier, 'spotlight');
  const config = getBeautyCelebrationConfig(97);
  assert.throws(() => config.bursts[0].rays = 999, TypeError);
  assert.throws(() => config.colors.push('red'), TypeError);
  assert.equal(getBeautyCelebrationConfig(97).bursts[0].rays, 20);
});

test('missing hosts and reduced-motion preferences create no elements or timers', () => {
  assert.doesNotThrow(() => startBeautyCelebration()());
  assert.doesNotThrow(() => startBeautyCelebration({host:{}})());
  for (const systemReduced of [false,true]) {
    const env = environment(systemReduced);
    const cleanup = startBeautyCelebration({host:env.host,score:97,reducedMotion:!systemReduced});
    assert.equal(env.created, 0);
    assert.equal(env.timers.size, 0);
    cleanup();
  }
  const env = environment(true);
  startBeautyCelebration({host:env.host,score:97,reducedMotion:false});
  assert.equal(env.created, 0, 'system preference wins over an explicit false');
});

test('all generated nodes are decorative and match the resource budget at every tier', () => {
  for (const score of [52,68,80,90,97]) {
    const env = environment();
    const config = getBeautyCelebrationConfig(score);
    const cleanup = startBeautyCelebration({host:env.host,score});
    assert.equal(env.host.children.length, 1);
    const layer = env.host.children[0];
    assert.equal(layer.attributes['aria-hidden'], 'true');
    assert.equal(layer.attributes.inert, '');
    assert.equal(layer.attributes['data-celebration-tier'], config.tier);
    assert.equal(allNodes(layer).length, config.nodeCount);
    assert.equal(env.created, config.nodeCount);
    assert.equal(env.timers.size, 1);
    assert.ok(allNodes(layer).every(node => node.className.startsWith('beauty-celebration')));
    cleanup();
  }
});

test('cancel removes its layer and timer immediately, without altering host content', () => {
  const env = environment();
  const content = env.host.ownerDocument.createElement('h1');
  env.host.appendChild(content);
  const cleanup = startBeautyCelebration({host:env.host,score:97});
  cleanup();
  cleanup();
  assert.deepEqual(env.host.children, [content]);
  assert.equal(env.timers.size, 0);
  env.tick(10000);
  assert.deepEqual(env.host.children, [content]);
});

test('completion removes all animation resources after the configured deadline', () => {
  for (const score of [52,68,80,90,97]) {
    const env = environment();
    const config = getBeautyCelebrationConfig(score);
    const cleanup = startBeautyCelebration({host:env.host,score});
    env.tick(config.duration - 1);
    assert.equal(env.host.children.length, 1);
    env.tick(1);
    assert.equal(env.host.children.length, 0);
    assert.equal(env.timers.size, 0);
    assert.doesNotThrow(cleanup);
  }
});

test('replay replaces the previous effect and an old cleanup cannot remove the new one', () => {
  const env = environment();
  const firstCleanup = startBeautyCelebration({host:env.host,score:97});
  const secondCleanup = startBeautyCelebration({host:env.host,score:68});
  assert.equal(env.timers.size, 1);
  assert.equal(env.host.children.length, 1);
  assert.equal(env.host.children[0].attributes['data-celebration-tier'], 'fresh');
  firstCleanup();
  assert.equal(env.host.children.length, 1);
  secondCleanup();
  assert.equal(env.host.children.length, 0);
});

test('switching a running effect to reduced-motion also clears its old resources', () => {
  const env = environment();
  startBeautyCelebration({host:env.host,score:97});
  startBeautyCelebration({host:env.host,score:97,reducedMotion:true});
  assert.equal(env.host.children.length, 0);
  assert.equal(env.timers.size, 0);
});

test('fireworks radiate in every direction and confetti travels upward then falls', () => {
  const env = environment();
  const cleanup = startBeautyCelebration({host:env.host,score:97});
  const nodes = allNodes(env.host.children[0]);
  const rays = nodes.filter(node => node.className === 'beauty-celebration-ray');
  const values = key => rays.map(node => parseFloat(node.style.values[key]));
  assert.ok(values('--x').some(value => value < -50) && values('--x').some(value => value > 50));
  assert.ok(values('--y').some(value => value < -50) && values('--y').some(value => value > 50));
  assert.ok(rays.every(node => parseFloat(node.style.values['--end-y']) > parseFloat(node.style.values['--y'])));
  const confetti = nodes.filter(node => node.className === 'beauty-celebration-confetti');
  assert.ok(confetti.every(node => parseFloat(node.style.values['--y']) < 0 && parseFloat(node.style.values['--fall']) > 0));
  assert.ok(nodes.some(node => node.className === 'beauty-celebration-rain'));
  cleanup();
});

test('CSS never loops, traps pointer events, or ignores reduced-motion fallback', () => {
  const css = readFileSync(new URL('../public/beauty-celebration.css', import.meta.url), 'utf8');
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /animation:none!important/);
  assert.doesNotMatch(css, /\binfinite\b/);
  const keyframes = [...css.matchAll(/@keyframes\s+([^\s{]+)/g)].map(match => match[1]);
  assert.equal(keyframes.length, 10);
  assert.ok(keyframes.every(name => name.startsWith('beauty-celebration-')));
});
