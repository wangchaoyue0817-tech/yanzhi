import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { TIERS, PRODUCTS, createReport } from '../public/beauty-model.js';
import { quoteOrder, getFoundationProducts } from '../public/beauty-commerce.js';

const controller = readFileSync(new URL('../public/beauty-analysis.js', import.meta.url), 'utf8');
const areaIds = ['hair', 'brows', 'eyes', 'skin', 'lips', 'style'];
const photoPair = () => ({ before: 'before-photo', after: 'after-photo', parts: Object.fromEntries(areaIds.map(id => [id, { before: `${id}-before`, after: `${id}-after` }])) });
const attrs = source => Object.fromEntries([...source.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(match => [match[1], match[2] ?? match[3] ?? match[4] ?? '']));
const tags = source => [...source.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*?)>/gi)].map(match => ({ tag: match[1], ...attrs(match[2]) }));

function readerHarness({ reducedMotion = false } = {}) {
  const nodes = new Map(), documentHandlers = new Map(), windowHandlers = new Map(), timers = new Map(), frames = new Map();
  const effects = { celebrations: [], stopped: 0, history: [], posterRequests: [], scrolls: [], preventedWheels: 0 };
  let document, timerSequence = 0, frameSequence = 0, now = 1000;
  const box = { detail:700, nav:62, areaNav:64, areaTop:850, areaHeight:500, overviewHeight:1900, adviceHeight:4000, viewport:700 };
  const contentTop = id => id === 'beautyDetail' || id === 'beautyReaderNav' ? box.detail : id === 'beautyOverview' ? box.detail+box.nav : id === 'beautyAdvice' ? box.detail+box.nav : id === 'beautyAreaTabs' ? box.detail+box.nav : id.startsWith('beautyArea-') ? box.areaTop+areaIds.indexOf(id.slice(11))*box.areaHeight : 0;
  const node = id => {
    if (!nodes.has(id)) {
      const attributes = {}, classes = new Set(), handlers = new Map(), listenerOptions = new Map();
      let markup = '';
      const el = {
        id, dataset: {}, hidden: true, inert: false, scrollTop: 0, scrollLeft:0, value: '', style: { setProperty(name,value){ this[name]=value; } }, textContent: '', isConnected: true, tabIndex: 0, handlers, listenerOptions, renderCount: 0,
        classList: {
          add(...values) { values.forEach(value => classes.add(value)); },
          remove(...values) { values.forEach(value => classes.delete(value)); },
          contains(value) { return classes.has(value); },
          toggle(value, force) { const add = force ?? !classes.has(value); if (add) classes.add(value); else classes.delete(value); return add; },
        },
        addEventListener(type, fn, options) { handlers.set(type, fn); listenerOptions.set(type,options); },
        setAttribute(name, value) { attributes[name] = String(value); },
        removeAttribute(name) { delete attributes[name]; },
        getAttribute(name) { return attributes[name]; },
        hasAttribute(name) { return Object.hasOwn(attributes, name); },
        querySelector(selector) {
          if(selector === '.beauty-reader-nav')return node('beautyReaderNav');
          if(selector === '.beauty-area-tabs')return node('beautyAreaTabs');
          if(selector.startsWith('#'))return node(selector.slice(1));
          return node(`${id}:${selector}`);
        },
        querySelectorAll(selector) {
          const source = id === 'beautyReport' ? markup : node('beautyReport').innerHTML;
          if (selector === '[data-count]') return tags(source).filter(tag => Object.hasOwn(tag, 'data-count')).map((tag, index) => {
            const counter = node(`counter-${index}`); counter.dataset.count = tag['data-count']; return counter;
          });
          if (selector.includes('[data-area-tab]')) return areaIds.map(id=>node('beautyAreaTab-'+id));
          if (selector.includes('[data-report-tab]')) return ['overview','advice'].map(id=>node('beautyTab-'+id));
          if (selector.includes('[data-area]') || selector === '.beauty-area') return areaIds.map(id=>node('beautyArea-'+id));
          return [];
        },
        getBoundingClientRect() {
          const scrollTop = nodes.get('beautyScroll')?.scrollTop || 0;
          let height = id === 'beautyReaderNav' ? box.nav+(nodes.get('beautyAdvice')?.hidden===false?box.areaNav:0) : id === 'beautyAreaTabs' ? box.areaNav : id.startsWith('beautyArea-') ? box.areaHeight : id === 'beautyOverview' ? box.overviewHeight-box.detail-box.nav : id === 'beautyAdvice' ? box.adviceHeight-box.detail-box.nav : box.viewport;
          let top = ['beautyScroll','beautyPage'].includes(id) ? 0 : contentTop(id)-scrollTop;
          if(id === 'beautyReaderNav')top=Math.max(0,top);
          if(id === 'beautyAreaTabs')top=Math.max(box.nav,top);
          return { top, bottom:top+height, left: 0, right: 390, width: 390, height };
        },
        focus(options) { document.activeElement = this; this.focusOptions = options; },
        scrollTo(options) { this.scrollTop = options.top; effects.scrolls.push({id, ...options}); },
        scrollIntoView(options) { effects.scrolls.push({id, ...options}); node('beautyScroll').scrollTop=contentTop(id); },
        closest() { return null; }, getClientRects() { return [{}]; },
      };
      Object.defineProperties(el, {
        clientHeight: { get(){ return id==='beautyScroll' ? box.viewport : el.getBoundingClientRect().height; } },
        offsetHeight: { get(){ return el.getBoundingClientRect().height; } },
        offsetTop: { get(){ return contentTop(id); } },
        scrollHeight: { get(){ return id==='beautyScroll' ? (nodes.get('beautyAdvice')?.hidden===false ? box.adviceHeight : box.overviewHeight) : el.getBoundingClientRect().height; } },
        innerHTML: {
          get() { return markup; },
          set(value) {
            markup = value; el.renderCount++;
            for (const tag of tags(value).filter(tag => tag.id)) {
              const child = node(tag.id);
              child.hidden = Object.hasOwn(tag, 'hidden');
              child.tabIndex = Number(tag.tabindex ?? 0);
              for (const [key, val] of Object.entries(tag)) {
                child.setAttribute(key, val);
                if (key.startsWith('data-')) child.dataset[key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = val;
              }
            }
          },
        },
      });
      nodes.set(id, el);
    }
    return nodes.get(id);
  };
  document = { getElementById: node, querySelector: selector => selector.startsWith('#')?node(selector.slice(1)):node(selector), addEventListener(type, fn) { documentHandlers.set(type, fn); }, activeElement: null };
  const history = {
    state: { homepage:'preserved' },
    pushState(){ effects.history.push('push'); }, replaceState(){ effects.history.push('replace'); }, back(){ effects.history.push('back'); },
  };
  const api = runInNewContext(controller.replace(/^import .*;$/gm, '') + `
    ({ show:showReport, selectChapter, selectArea, reset:resetEntry,
       openSheet, closeSheet, poster:posterSheet, detail:detailSheet,
       state(){ return { reader, currentReport, photos, frameCount:frames.size }; } });
  `, {
    document, TIERS, PRODUCTS, createReport, getFoundationProducts, quoteOrder, history, window: { addEventListener(type, fn) { windowHandlers.set(type, fn); } },
    location: { search: '' }, URLSearchParams,
    matchMedia: () => ({ matches: reducedMotion, addEventListener() {} }),
    Date: { now: () => now }, URL: { createObjectURL: () => 'blob:poster', revokeObjectURL() {} },
    setTimeout(fn, delay) { const id = ++timerSequence; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++frameSequence; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    startBeautyCelebration(options) { effects.celebrations.push(options); let stopped = false; return () => { if (!stopped) { effects.stopped++; stopped = true; } }; },
    renderBeautyPoster(options) { effects.posterRequests.push(options); return Promise.resolve({ blob: { type: 'image/png' } }); },
  });
  node('beautyPage').hidden = false;
  const dispatch = (type, event={}) => {
    if(type==='scroll')return node('beautyScroll').handlers.get(type)?.(event);
    return node('beautyPage').handlers.get(type)?.(event) ?? node('beautyScroll').handlers.get(type)?.(event);
  };
  const click = dataset => dispatch('click', { target: { closest: () => ({ dataset, hasAttribute: () => false }) } });
  const key = (key, target, extra = {}) => {
    const event = { key, target, prevented: false, preventDefault() { this.prevented = true; }, ...extra };
    documentHandlers.get('keydown')(event); return event;
  };
  const pointerTarget = ({ control = false, outside = false, areaNav=false } = {}) => ({ closest(selector) {
    if(selector==='#beautyDetail')return outside?null:node('beautyDetail');
    if(selector.includes('beauty-area-tabs') && areaNav)return node('beautyAreaTabs');
    if(selector.includes('button') && control)return node('some-button');
    return null;
  } });
  const swipe = ({ fromX = 260, toX = 110, fromY = 320, toY = 322, duration = 100, scrollDelta = 0, id = 1, endId = id, cancel = false, control = false, outside = false, areaNav=false, primary = true, pointerType = 'touch', button = 0 } = {}) => {
    const target = pointerTarget({ control, outside, areaNav });
    dispatch('pointerdown', { target, pointerId: id, clientX: fromX, clientY: fromY, isPrimary: primary, pointerType, button });
    now += duration;
    node('beautyScroll').scrollTop += scrollDelta;
    if(scrollDelta)dispatch('scroll');
    if (cancel) dispatch('pointercancel', {});
    dispatch('pointerup', { target, pointerId: endId, clientX: toX, clientY: toY });
  };
  const wheel = ({ deltaY=100, deltaX=0, wait=0, control=false, outside=false, areaNav=false, nativeScroll=false }={}) => {
    now+=wait;
    const event={deltaY,deltaX,deltaMode:0,target:pointerTarget({control,outside,areaNav}),defaultPrevented:false,preventDefault(){this.defaultPrevented=true;effects.preventedWheels++;}};
    dispatch('wheel',event);
    if(nativeScroll&&!event.defaultPrevented){node('beautyScroll').scrollTop=Math.max(0,Math.min(node('beautyScroll').scrollHeight-node('beautyScroll').clientHeight,node('beautyScroll').scrollTop+deltaY));dispatch('scroll');}
    return event;
  };
  const touch = ({ fromY=520, toY=320, fromX=190, toX=192, duration=150, scrollDelta=0, cancel=false, outside=false, control=false, areaNav=false }={}) => {
    const target=pointerTarget({outside,control,areaNav});
    dispatch('touchstart',{target,touches:[{clientX:fromX,clientY:fromY,identifier:1}]});
    now+=duration;
    node('beautyScroll').scrollTop+=scrollDelta;
    if(scrollDelta)dispatch('scroll');
    if(cancel)dispatch('touchcancel',{});
    dispatch('touchend',{target,changedTouches:[{clientX:toX,clientY:toY,identifier:1}],touches:[]});
  };
  const runDelay = delay => { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); } };
  const settleFrames = () => { const callbacks=[...frames]; frames.clear(); for(const [,fn] of callbacks)fn(now); };
  const scrollTo = top => {node('beautyScroll').scrollTop=top;dispatch('scroll');settleFrames();};
  const bottom = () => node('beautyScroll').scrollHeight-node('beautyScroll').clientHeight;
  return { api, node, box, effects, document, documentHandlers, windowHandlers, history, timers, frames, click, key, swipe, touch, wheel, dispatch, pointerTarget, runDelay, scrollTo, bottom, settleFrames, advance(ms){now+=ms;} };
}

function show(harness, score = 90) {
  const report = createReport(score), photos = photoPair();
  harness.api.show(report, photos);
  return { report, photos };
}
function assertVisibleAreas(harness, active) {
  for (const id of areaIds) {
    const button=harness.node(`beautyAreaTab-${id}`), area=harness.node(`beautyArea-${id}`);
    assert.equal(area.hidden, false, `${id}: all areas stay mounted for continuous reading`);
    assert.notEqual(area.getAttribute('role'),'tabpanel','areas are in-page sections rather than mutually exclusive tab panels');
    assert.notEqual(button.getAttribute('role'),'tab','area buttons are anchors within a chapter');
    const current=button.getAttribute('aria-current');
    assert.equal(current==='true'||current==='location',id===active,`${id}: current location is synchronized`);
  }
}

function assertChapter(harness, active) {
  assert.equal(harness.api.state().reader.tab,active);
  for(const [id,panel] of [['overview','beautyOverview'],['advice','beautyAdvice']]){
    assert.equal(harness.node(panel).hidden,id!==active);
    assert.equal(harness.node('beautyTab-'+id).getAttribute('aria-selected'),String(id===active));
    assert.equal(harness.node('beautyTab-'+id).tabIndex,id===active?0:-1);
  }
  assert.equal(harness.node('beautyCover').hidden,false,'the cover remains part of the same page');
  assert.equal(harness.node('beautyDetail').hidden,false,'details do not require a second-page entry');
}

test('all five tiers directly show the cover, prominent poster action and two report chapters', () => {
  for (const tier of TIERS) {
    const h=readerHarness({reducedMotion:true}); show(h,tier.sampleScore);
    const html=h.node('beautyReport').innerHTML;
    const cover=html.slice(0,html.indexOf('<div id="beautyDetail"'));
    assert.doesNotMatch(html,/beauty-preview-card|你的下一幕|data-action="open-report"|data-action="report-back"/);
    assert.match(cover,/查看我的颜值海报/);
    assert.equal((cover.match(/data-action="poster"/g)||[]).length,1);
    assert.equal(tags(html).filter(tag=>tag['data-report-tab']).length,2);
    assert.equal(tags(html).filter(tag=>tag['data-area-tab']).length,6);
    assert.match(html,/我的颜值报告/); assert.match(html,/我的变美思路/);
    const ids=tags(html).filter(tag=>tag.id).map(tag=>tag.id);
    assert.equal(new Set(ids).size,ids.length,'all IDs are unique');
    assertChapter(h,'overview');
    assertVisibleAreas(h,'hair');
  }
});

test('chapter switching preserves report DOM, facts, photos and each chapter reading position', () => {
  const h=readerHarness({reducedMotion:true}); const original=show(h);
  const renders=h.node('beautyReport').renderCount;
  h.scrollTo(950); h.click({reportTab:'advice'});
  assertChapter(h,'advice');
  const adviceStart=h.node('beautyScroll').scrollTop;
  assert.ok(adviceStart>=h.box.detail,'a chapter switch lands in details, not back on the score');
  h.scrollTo(2100); h.click({reportTab:'overview'});
  assertChapter(h,'overview');
  assert.equal(h.node('beautyScroll').scrollTop,950);
  h.click({reportTab:'advice'});
  assert.equal(h.node('beautyScroll').scrollTop,2100);
  assert.equal(h.node('beautyReport').renderCount,renders);
  assert.equal(h.api.state().currentReport,original.report);
  assert.equal(h.api.state().photos,original.photos);
  assert.deepEqual(h.effects.history,[],'chapter navigation never adds or mutates browser history');
  assert.equal(h.windowHandlers.has('popstate'),false,'the offline router retains ownership of browser navigation');
});

test('chapter and area controls reject invalid IDs and missing reports', () => {
  const h=readerHarness({reducedMotion:true});
  h.api.selectChapter('advice'); h.api.selectArea('eyes');
  assert.equal(h.api.state().currentReport,null);
  show(h);
  h.api.selectChapter('<script>'); assertChapter(h,'overview');
  h.api.selectArea('lips'); assert.equal(h.api.state().reader.area,'hair','an area link requires the advice chapter');
  h.api.selectChapter('advice'); h.api.selectArea('invalid');
  assertVisibleAreas(h,'hair');
});

test('each area button scrolls to its section below both sticky navigation rows without hiding other areas', () => {
  const h=readerHarness({reducedMotion:true}); show(h); h.api.selectChapter('advice');
  for(const id of areaIds){
    h.click({areaTab:id});
    assertVisibleAreas(h,id);
    const areaTop=h.node('beautyArea-'+id).getBoundingClientRect().top;
    assert.ok(areaTop>=h.box.nav+h.box.areaNav-2,`${id}: content clears sticky headers`);
    assert.ok(areaTop<h.box.nav+h.box.areaNav+90,`${id}: section heading stays near its anchor`);
    assert.equal(h.effects.scrolls.at(-1)?.behavior,'auto','reduced motion avoids animated anchor scrolling');
  }
  assert.ok(h.effects.scrolls.length>=6);
});

test('ordinary downward and upward reading automatically updates the area highlight', () => {
  const h=readerHarness({reducedMotion:true}); show(h); h.api.selectChapter('advice');
  for(const id of [...areaIds,...areaIds.slice().reverse()]){
    const i=areaIds.indexOf(id);
    h.scrollTo(h.box.areaTop+i*h.box.areaHeight-h.box.nav-h.box.areaNav+30);
    assertVisibleAreas(h,id);
  }
  assertChapter(h,'advice');
});

test('reaching the overview bottom by scrolling alone never switches chapters', () => {
  const h=readerHarness({reducedMotion:true}); show(h);
  h.scrollTo(h.bottom()-100); h.scrollTo(h.bottom()); h.scrollTo(h.bottom());
  h.advance(2000); h.dispatch('scroll'); h.settleFrames();
  assertChapter(h,'overview');
});

test('a gesture that first reaches the bottom cannot switch; a fresh upward reading gesture can', () => {
  const h=readerHarness({reducedMotion:true}); show(h);
  h.scrollTo(h.bottom()-160);
  h.touch({fromX:190,toX:190,fromY:560,toY:340,scrollDelta:160});
  assertChapter(h,'overview');
  h.advance(1000);
  h.touch({fromX:190,toX:190,fromY:560,toY:340});
  assertChapter(h,'advice');
  assert.equal(h.api.state().reader.area,'hair');
});

test('overview wheel inertia cannot trigger a chapter change until a fresh downward wheel burst', () => {
  const h=readerHarness({reducedMotion:true}); show(h);
  h.scrollTo(h.bottom()-120); h.wheel({deltaY:120}); h.scrollTo(h.bottom());
  for(let i=0;i<8;i++)h.wheel({deltaY:20,wait:35});
  assertChapter(h,'overview');
  h.wheel({deltaY:120,wait:1200});
  assertChapter(h,'advice');
});

test('automatic advance ignores cover gestures, reverse scrolling, diagonal intent and the final advice end', () => {
  for(const options of [{fromY:320,toY:560},{toX:365},{cancel:true},{duration:1600}]){
    const h=readerHarness({reducedMotion:true}); show(h); h.scrollTo(h.bottom());
    h.touch({fromX:190,toX:190,fromY:560,toY:340,...options});
    assertChapter(h,'overview');
  }
  const h=readerHarness({reducedMotion:true}); show(h);
  h.touch({outside:true}); assertChapter(h,'overview');
  h.api.selectChapter('advice'); h.scrollTo(h.bottom());
  h.touch({fromX:190,toX:190,fromY:560,toY:340}); h.wheel({wait:1200});
  assertChapter(h,'advice');
  assertVisibleAreas(h,'style');
});

test('horizontal gestures switch only the two main chapters and preserve the advice position', () => {
  const h=readerHarness({reducedMotion:true}); show(h); h.scrollTo(900);
  const focus=h.document.activeElement;
  h.swipe(); assertChapter(h,'advice');
  assert.equal(h.document.activeElement,focus,'pointer navigation does not move keyboard focus');
  h.scrollTo(2300); const area=h.api.state().reader.area;
  h.swipe({fromX:100,toX:260}); assertChapter(h,'overview');
  assert.equal(h.node('beautyScroll').scrollTop,900);
  h.swipe(); assertChapter(h,'advice');
  assert.equal(h.node('beautyScroll').scrollTop,2300); assertVisibleAreas(h,area);
  h.swipe(); assertChapter(h,'advice');
});

test('chapter swipes ignore area navigation, controls, cover, edges and cancelled or conflicting pointers', () => {
  const cases=[{toX:200},{toY:460},{duration:901},{scrollDelta:21},{fromX:23},{fromX:369},{control:true},{outside:true},{areaNav:true},{cancel:true},{primary:false},{pointerType:'mouse',button:2},{endId:2}];
  for(const options of cases){
    const h=readerHarness({reducedMotion:true}); show(h); h.scrollTo(850);
    h.swipe(options); assertChapter(h,'overview');
    h.dispatch('pointerup',{pointerId:1,clientX:60,clientY:320}); assertChapter(h,'overview');
  }
});

test('a product or poster modal blocks all background navigation and closing it retains the reading position', () => {
  for(const kind of ['product','poster']){
    const h=readerHarness({reducedMotion:true}); show(h); h.api.selectChapter('advice'); h.scrollTo(2370);
    const area=h.api.state().reader.area, markup=h.node('beautyReport').innerHTML;
    const opener=h.node(kind+'-opener'); h.document.activeElement=opener;
    h.api.openSheet(kind,'<p>Details</p>',kind);
    assert.equal(h.node('beautyScroll').inert,true);
    h.swipe({fromX:100,toX:260}); h.wheel({wait:1200});
    assertChapter(h,'advice'); assertVisibleAreas(h,area);
    h.key('Escape');
    assert.equal(h.node('beautyOverlay').hidden,true); assert.equal(h.node('beautyScroll').inert,false);
    assert.equal(h.node('beautyScroll').scrollTop,2370);
    assert.equal(h.node('beautyReport').innerHTML,markup);
    assert.equal(h.document.activeElement,opener);
  }
});

test('main chapter keyboard navigation remains accessible and ordinary keys do not change content', () => {
  const h=readerHarness({reducedMotion:true}); show(h); h.scrollTo(850);
  assert.equal(h.key('ArrowRight',h.node('beautyTab-overview')).prevented,true); assertChapter(h,'advice');
  assert.equal(h.document.activeElement.id,'beautyTab-advice');
  h.key('Home',h.node('beautyTab-advice')); assertChapter(h,'overview');
  h.key('End',h.node('beautyTab-overview')); assertChapter(h,'advice');
  assert.equal(h.key('ArrowLeft',{dataset:{}}).prevented,false); assertChapter(h,'advice');
  h.api.openSheet('product','<p>Details</p>','product');
  assert.equal(h.key('ArrowLeft',h.node('beautyTab-advice')).prevented,false); assertChapter(h,'advice');
});

test('scrolling away cancels late celebration and chapter changes never replay the initial score reveal', () => {
  for(const timing of ['before-reveal','after-reveal']){
    const h=readerHarness(); show(h,97);
    if(timing==='after-reveal')h.runDelay(1200);
    h.scrollTo(850); h.api.selectChapter('advice'); h.api.selectChapter('overview'); h.scrollTo(0);
    h.runDelay(1200);
    assert.equal(h.effects.celebrations.length,timing==='after-reveal'?1:0);
    assert.equal(h.effects.stopped,timing==='after-reveal'?1:0);
  }
});

test('sharing anywhere exports the complete original report and all six pairs', async () => {
  for(const scope of ['cover','overview','advice']){
    const h=readerHarness({reducedMotion:true}); const {report,photos}=show(h,80);
    if(scope!=='cover')h.scrollTo(850);
    if(scope==='advice'){h.api.selectChapter('advice');h.api.selectArea('eyes');}
    const before=h.node('beautyScroll').scrollTop;
    await h.click({action:'poster'});
    const request=h.effects.posterRequests[0];
    assert.equal(h.effects.posterRequests.length,1); assert.equal(request.report,report); assert.equal(request.parts,photos.parts);
    assert.equal(Object.keys(request.parts).length,6); assert.equal(request.beforeSrc,photos.before); assert.equal(request.afterSrc,photos.after);
    h.api.closeSheet(); assert.equal(h.node('beautyScroll').scrollTop,before);
    assertChapter(h,scope==='advice'?'advice':'overview');
  }
});

test('switching score scenes resets reading state without introducing history entries', () => {
  const h=readerHarness({reducedMotion:true}); show(h,97); h.api.selectChapter('advice'); h.scrollTo(2500);
  show(h,52); assertChapter(h,'overview'); assertVisibleAreas(h,'hair');
  assert.equal(h.node('beautyScroll').scrollTop,0);
  assert.deepEqual(h.effects.history,[]);
  assert.equal(h.api.state().currentReport.score,52);
});

test('an open sheet prevents bottom auto-advance and releasing a gesture after opening it is harmless', () => {
  for(const kind of ['product','poster']){
    const h=readerHarness({reducedMotion:true}); show(h); h.scrollTo(h.bottom());
    h.api.openSheet(kind,'<p>Details</p>',kind);
    h.touch(); h.wheel({deltaY:150,wait:1200});
    assertChapter(h,'overview');
    h.api.closeSheet();
    h.dispatch('touchstart',{target:h.pointerTarget(),touches:[{clientX:180,clientY:550}]});
    h.api.openSheet(kind,'<p>Details</p>',kind);
    h.dispatch('touchend',{target:h.pointerTarget(),changedTouches:[{clientX:180,clientY:300}],touches:[]});
    assertChapter(h,'overview');
  }
});

test('area keyboard anchors keep every section visible and focus their corresponding location control', () => {
  const h=readerHarness({reducedMotion:true}); show(h); h.api.selectChapter('advice');
  h.key('End',h.node('beautyAreaTab-hair')); assertVisibleAreas(h,'style');
  assert.equal(h.document.activeElement.id,'beautyAreaTab-style');
  h.key('ArrowRight',h.node('beautyAreaTab-style')); assertVisibleAreas(h,'hair');
  h.key('ArrowLeft',h.node('beautyAreaTab-hair')); assertVisibleAreas(h,'style');
  h.key('Home',h.node('beautyAreaTab-style')); assertVisibleAreas(h,'hair');
});

test('smooth anchor navigation avoids transient highlighting of intervening areas, then follows user reading', () => {
  const h=readerHarness(); show(h); h.api.selectChapter('advice');
  h.api.selectArea('lips');
  assert.equal(h.effects.scrolls.at(-1).behavior,'smooth');
  h.scrollTo(h.box.areaTop+h.box.areaHeight-h.box.nav-h.box.areaNav+20);
  assertVisibleAreas(h,'lips','the selected destination remains active while the smooth scroll crosses other areas');
  h.advance(1000); h.dispatch('scroll');
  assertVisibleAreas(h,'brows');
});

test('wheel detection runs before native scrolling and prevents default only when advancing the chapter', () => {
  const h=readerHarness({reducedMotion:true}); show(h);
  assert.equal(h.node('beautyScroll').listenerOptions.get('wheel').passive,false,'a cancelable handler reads the position before default scrolling');
  h.scrollTo(h.bottom()-120);
  const arriving=h.wheel({deltaY:120,nativeScroll:true});
  assert.equal(arriving.defaultPrevented,false,'normal page scrolling remains native');
  assertChapter(h,'overview'); assert.equal(h.node('beautyScroll').scrollTop,h.bottom());
  for(let i=0;i<5;i++)assert.equal(h.wheel({deltaY:40,wait:30,nativeScroll:true}).defaultPrevented,false,'the arriving burst is not consumed or treated as a new gesture');
  assertChapter(h,'overview');
  const belowThreshold=h.wheel({deltaY:40,wait:1000,nativeScroll:true});
  assert.equal(belowThreshold.defaultPrevented,false); assertChapter(h,'overview');
  const advancing=h.wheel({deltaY:40,wait:30,nativeScroll:true});
  assert.equal(advancing.defaultPrevented,true,'the transition delta cannot scroll the newly visible chapter');
  assert.equal(h.effects.preventedWheels,1); assertChapter(h,'advice');
  assert.equal(h.node('beautyScroll').scrollTop,h.box.detail,'the next chapter starts at its top');
  h.wheel({deltaY:90,wait:1000,nativeScroll:true});
  assert.equal(h.effects.preventedWheels,1,'ordinary advice reading is not prevented');
});

test('opening and closing a sheet discards incomplete wheel, touch and horizontal gestures', () => {
  const h=readerHarness({reducedMotion:true}); show(h); h.scrollTo(h.bottom());
  h.wheel({deltaY:50});
  h.api.openSheet('poster','<p>Poster</p>','poster'); h.api.closeSheet();
  h.wheel({deltaY:30,wait:30});
  assertChapter(h,'overview'); assert.equal(h.effects.preventedWheels,0,'pre-modal wheel distance is discarded');
  const target=h.pointerTarget();
  h.dispatch('touchstart',{target,touches:[{clientX:180,clientY:550}]});
  h.dispatch('pointerdown',{target,pointerId:1,clientX:260,clientY:320,isPrimary:true,pointerType:'touch',button:0});
  h.api.openSheet('product','<p>Product</p>','product'); h.api.closeSheet();
  h.dispatch('touchend',{target,changedTouches:[{clientX:180,clientY:300}],touches:[]});
  h.dispatch('pointerup',{target,pointerId:1,clientX:110,clientY:320});
  assertChapter(h,'overview');
});
