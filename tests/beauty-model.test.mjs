import assert from 'node:assert/strict';
import test from 'node:test';
import { AREAS, PRODUCTS, TIERS, createReport, getPercentile, getTier } from '../public/beauty-model.js';

test('tier boundaries cover every score without gaps and switch on the agreed thresholds', () => {
  const cases = [[0, 'natural'], [59, 'natural'], [60, 'fresh'], [74, 'fresh'], [75, 'radiant'], [84, 'radiant'], [85, 'spotlight'], [94, 'spotlight'], [95, 'icon'], [100, 'icon']];
  for (const [score, tier] of cases) assert.equal(getTier(score).id, tier);
  for (let score = 0; score <= 100; score++) {
    assert.equal(TIERS.filter(tier => score >= tier.min && score <= tier.max).length, 1);
    assert.ok(getTier(score));
  }
});

test('all public score functions reject invalid values instead of silently coercing them', () => {
  const invalid = [NaN, Infinity, -Infinity, -1, 101, 52.5, '90', null, true, {}, []];
  for (const operation of [getTier, getPercentile, createReport]) {
    for (const score of invalid) assert.throws(() => operation(score), RangeError);
  }
  assert.throws(() => getTier(), RangeError);
  assert.throws(() => getPercentile(), RangeError);
  assert.equal(createReport().score, 90);
});

test('the five preview scenarios have their agreed results and improvement scores', () => {
  const cases = [[52, 32, 70, 'natural'], [68, 58, 80, 'fresh'], [80, 82, 88, 'radiant'], [90, 96, 95, 'spotlight'], [97, 99.6, 99, 'icon']];
  for (const [score, percentile, afterScore, id] of cases) {
    const report = createReport(score);
    assert.equal(report.percentile, percentile);
    assert.equal(report.afterScore, afterScore);
    assert.equal(report.tier.id, id);
    assert.equal(report.afterTier.id, getTier(afterScore).id);
    assert.equal(report.afterPercentile, getPercentile(afterScore));
  }
});

test('ranks and improvements remain monotonic and bounded across all 101 scores', () => {
  let previousRank = -1;
  let previousAfterScore = -1;
  for (let score = 0; score <= 100; score++) {
    const report = createReport(score);
    assert.ok(report.percentile >= previousRank);
    assert.ok(report.percentile >= 0 && report.percentile < 100);
    assert.ok(report.afterScore >= score && report.afterScore <= 100);
    assert.ok(report.afterScore >= previousAfterScore);
    assert.ok(report.afterPercentile >= report.percentile);
    previousRank = report.percentile;
    previousAfterScore = report.afterScore;
  }
  assert.equal(createReport(100).afterScore, 100);
});

test('five integer dimension scores reproduce the overall score, including both extremes', () => {
  for (let score = 0; score <= 100; score++) {
    const { dimensions } = createReport(score);
    assert.equal(dimensions.length, 5);
    assert.equal(new Set(dimensions.map(item => item.label)).size, 5);
    assert.ok(dimensions.every(item => Number.isInteger(item.score) && item.score >= 0 && item.score <= 100));
    assert.equal(dimensions.reduce((total, item) => total + item.score, 0) / dimensions.length, score);
  }
  assert.ok(createReport(90).dimensions.some(item => item.score !== 90));
});

test('every facial area has actionable advice and valid individually purchasable recommendations', () => {
  const products = new Map(PRODUCTS.map(product => [product.id, product]));
  assert.equal(products.size, 6);
  assert.deepEqual(AREAS.map(area => area.id), ['hair', 'brows', 'eyes', 'skin', 'lips', 'style']);
  for (const tier of TIERS) {
    const report = createReport(tier.sampleScore);
    for (const area of report.areas) {
      for (const key of ['title', 'before', 'after', 'reason']) assert.ok(area[key].length > 1);
      assert.ok(area.steps.length >= 2);
      assert.ok(area.productIds.length >= 1);
      for (const productId of area.productIds) assert.ok(products.has(productId));
    }
    for (const product of report.products) {
      for (const key of ['brand', 'name', 'shade', 'reason', 'usage']) assert.ok(product[key]);
      assert.ok(Number.isFinite(product.price) && product.price > 0);
      assert.ok(product.features.length >= 2);
      assert.match(product.atlasPosition, /^(0|50|100)% (0|100)%$/);
    }
    assert.doesNotMatch(JSON.stringify(report), /演示|示意|模拟/);
  }
  assert.equal(new Set(PRODUCTS.map(product => product.atlasPosition)).size, 6);
});

test('guidance and honor copy change with the score tier, with clear low and high score priorities', () => {
  const reports = TIERS.map(tier => createReport(tier.sampleScore));
  for (const key of ['copy', 'strength', 'focus']) assert.equal(new Set(reports.map(report => report[key])).size, 5);
  assert.equal(new Set(reports.map(report => report.tier.share)).size, 5);
  assert.match(reports[0].focus, /先从/);
  assert.match(reports.at(-1).focus, /保持个人特点/);
  for (let index = 0; index < AREAS.length; index++) {
    assert.equal(new Set(reports.map(report => report.areas[index].before)).size, 5);
    assert.equal(new Set(reports.map(report => report.areas[index].reason)).size, 5);
  }
});

test('compact area previews fit the card limits and retain the complete advice', () => {
  const shortText = (value, limit, label) => {
    assert.equal(typeof value, 'string', label);
    assert.ok(value.trim().length > 0, label);
    assert.ok([...value].length <= limit, `${label}: ${[...value].length} exceeds ${limit}`);
  };
  for (let score = 0; score <= 100; score++) {
    const report = createReport(score);
    shortText(report.strength, 24, `${score} strength`);
    shortText(report.focus, 24, `${score} focus`);
    assert.equal(new Set(report.areas.map(area => area.summary)).size, AREAS.length);
    for (const [index, area] of report.areas.entries()) {
      const label = `${score} ${area.id}`;
      shortText(area.summary, 24, `${label} summary`);
      assert.equal(area.actions.length, 2, `${label} actions`);
      assert.equal(new Set(area.actions).size, 2, `${label} distinct actions`);
      area.actions.forEach(action => shortText(action, 10, `${label} action`));
      shortText(area.beforeLabel, 7, `${label} before label`);
      shortText(area.afterLabel, 7, `${label} after label`);
      assert.ok(area.reason.endsWith(AREAS[index].reason), `${label} full reason`);
      assert.deepEqual(area.steps, AREAS[index].steps, `${label} full steps`);
      assert.equal(area.after, AREAS[index].after, `${label} full after description`);
    }
  }
  const reports = TIERS.map(tier => createReport(tier.sampleScore));
  for (let index = 0; index < AREAS.length; index++) {
    assert.equal(new Set(reports.map(report => report.areas[index].summary)).size, TIERS.length);
    for (const report of reports.slice(-2)) assert.match(report.areas[index].summary, /保留/);
  }
});

test('compact product previews contain a reason and exactly two distinct features', () => {
  for (const tier of TIERS) {
    for (const product of createReport(tier.sampleScore).products) {
      assert.ok(product.shortReason.trim());
      assert.ok([...product.shortReason].length <= 24, `${product.id} short reason`);
      assert.ok(product.shortName.trim());
      assert.ok([...product.shortName].length <= 10, `${product.id} short name`);
      assert.equal(product.shortFeatures.length, 2);
      assert.equal(new Set(product.shortFeatures).size, 2);
      for (const feature of product.shortFeatures) {
        assert.ok(feature.trim());
        assert.ok([...feature].length <= 9, `${product.id} short feature`);
      }
      const original = PRODUCTS.find(item => item.id === product.id);
      assert.equal(product.reason, original.reason);
      assert.deepEqual(product.features, original.features);
      assert.equal(product.usage, original.usage);
    }
  }
});

test('a rendered report cannot mutate future reports or shared catalog values', () => {
  const original = createReport(90);
  const changed = createReport(90);
  changed.tier.name = 'changed';
  changed.afterTier.name = 'changed';
  changed.dimensions[0].score = 0;
  changed.areas[0].steps.push('changed');
  changed.areas[0].productIds.push('invalid');
  changed.areas[0].actions[0] = 'changed';
  changed.products[0].features[0] = 'changed';
  changed.products[0].shortFeatures[0] = 'changed';
  changed.keywords[0] = 'changed';
  assert.deepEqual(createReport(90), original);
  assert.ok(Object.isFrozen(TIERS[0]));
  assert.ok(Object.isFrozen(AREAS[0].steps));
  assert.ok(Object.isFrozen(AREAS[0].actions));
  assert.ok(Object.isFrozen(PRODUCTS[0].features));
  assert.ok(Object.isFrozen(PRODUCTS[0].shortFeatures));
});
