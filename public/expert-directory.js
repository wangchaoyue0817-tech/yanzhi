'use strict';

(function (root) {
  const alphabet = 'ABCDEFGHJKLMNOPQRSTWXYZ';
  const pinyinStarts = '阿八嚓哒妸发旮哈讥喀垃妈拿噢啪期然撒塌挖夕丫匝';
  const pinyinOrder = new Intl.Collator('zh-Hans-CN-u-co-pinyin', { sensitivity: 'base', numeric: true });
  const latinOrder = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

  function fold(value) {
    return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase();
  }

  function searchKey(value) {
    return fold(value).replace(/[^\p{L}\p{N}]/gu, '');
  }

  function searchTerms(query) {
    return String(query ?? '').trim().split(/\s+/u).map(searchKey).filter(Boolean);
  }

  function matches(name, terms) {
    if (!terms.length) return true;
    const key = searchKey(name);
    return terms.every(term => key.includes(term));
  }

  function pinyinInitial(name) {
    // The collator sorts isolated 长 as zhǎng. These catalog prefixes use cháng.
    if (/^长[管袖短]/u.test(name)) return 'C';
    const first = Array.from(name)[0];
    if (!first || !/\p{Script=Han}/u.test(first)) return '#';
    for (let index = pinyinStarts.length - 1; index > 0; index -= 1) {
      if (pinyinOrder.compare(first, pinyinStarts[index]) >= 0) return alphabet[index];
    }
    return 'A';
  }

  function sortKey(name, brand) {
    const label = fold(name).trim();
    if (/^\p{N}/u.test(label)) return { letter: '#', label, latin: false };
    const latinIndex = label.search(brand ? /[A-Z]/u : /^[A-Z]/u);
    if (latinIndex !== -1) return { letter: label[latinIndex], label: label.slice(latinIndex), latin: true };
    return { letter: pinyinInitial(label), label, latin: false };
  }

  function groupEntries(items, brand) {
    const sorted = items.map(item => ({ item, key: sortKey(item.name, brand) }));
    sorted.sort(({ key: a }, { key: b }) => {
      if (a.letter !== b.letter) {
        if (a.letter === '#') return 1;
        if (b.letter === '#') return -1;
        return latinOrder.compare(a.letter, b.letter);
      }
      if (a.latin !== b.latin) return a.latin ? -1 : 1;
      return (a.latin ? latinOrder : pinyinOrder).compare(a.label, b.label);
    });
    const groups = new Map();
    for (const { item, key } of sorted) {
      if (!groups.has(key.letter)) groups.set(key.letter, { letter: key.letter, items: [] });
      groups.get(key.letter).items.push(item);
    }
    return [...groups.values()];
  }

  const styleInfo = entry => typeof entry === 'string' ? { name: entry } : entry;

  function brands(category, query = '') {
    const terms = searchTerms(query);
    const isBrandCategory = category?.groupLabel === '品牌';
    const items = [];
    for (const [index, entry] of (category?.groups ?? []).entries()) {
      if (matches(entry.name, terms)) {
        items.push({ index, name: entry.name, ...(entry.ai ? { ai: true } : {}) });
      }
    }
    const popular = isBrandCategory && !String(query ?? '').trim() ? items.slice(0, 3) : [];
    return { groups: groupEntries(items, isBrandCategory), popular };
  }

  function series(brand, query = '') {
    const terms = searchTerms(query);
    const items = (brand?.styles ?? []).map((entry, index) => ({ ...styleInfo(entry), index }));
    return { groups: groupEntries(items.filter(item => matches(item.name, terms)), false) };
  }

  root.ExpertDirectory = Object.freeze({ brands, series });
})(typeof window === 'undefined' ? globalThis : window);
