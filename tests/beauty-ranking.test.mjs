import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { RANKING_SEEDS, RANKING_STORAGE_KEY, createRankingSeeds, rankRecords, rankingSnapshot, rankingPercentile, loadRankingScore, saveRankingScore } from '../public/beauty-ranking-model.js';
import { createReport } from '../public/beauty-model.js';

test('cold-start scores are reproducible, bounded and approximately normal without rerolling', () => {
  assert.equal(RANKING_SEEDS.length,1000);
  assert.deepEqual(createRankingSeeds(),RANKING_SEEDS);
  assert.notDeepEqual(createRankingSeeds(1000,7),RANKING_SEEDS);
  assert.equal(new Set(RANKING_SEEDS.map(row=>row.id)).size,1000);
  assert.equal(new Set(RANKING_SEEDS.map(row=>row.name)).size,1000);
  assert.ok(RANKING_SEEDS.every(row=>Number.isInteger(row.score)&&row.score>=0&&row.score<=100));
  const mean=RANKING_SEEDS.reduce((sum,row)=>sum+row.score,0)/1000;
  const deviation=Math.sqrt(RANKING_SEEDS.reduce((sum,row)=>sum+(row.score-mean)**2,0)/1000);
  assert.ok(mean>73&&mean<75);
  assert.ok(deviation>8&&deviation<10);
  assert.ok(RANKING_SEEDS.filter(row=>row.score>=65&&row.score<=83).length>600);
  assert.throws(()=>createRankingSeeds(0),RangeError);
});

test('ranks use competition ties, ignore duplicate ids and never mutate source records', () => {
  const input=[{id:'c',score:80},{id:'a',score:90},{id:'d',score:70},{id:'b',score:80},{id:'a',score:100},{id:'x',score:101}];
  const snapshot=JSON.stringify(input);
  assert.deepEqual(rankRecords(input).map(row=>[row.id,row.rank]),[['a',1],['b',2],['c',2],['d',4]]);
  assert.equal(JSON.stringify(input),snapshot);
});

test('new measurements replace one self record and use the same percentile as reports', () => {
  assert.equal(rankingSnapshot().me,null);
  for(const score of [0,52,68,80,90,97,100]) {
    const result=rankingSnapshot(score);
    assert.equal(result.total,1001);
    assert.equal(result.records.filter(row=>row.id==='self').length,1);
    assert.equal(result.me.rank,RANKING_SEEDS.filter(row=>row.score>score).length+1);
    assert.equal(result.percentile,createReport(score).percentile);
    assert.equal(result.bins.reduce((sum,bin)=>sum+bin.count,0),1001);
    assert.equal(result.records.find(row=>row.id==='self').score,score);
  }
  assert.equal(rankingSnapshot(100).bins[19].max,100);
  assert.equal(rankingPercentile(80,[{score:80},{score:90},{score:70}]),33.3,'ties are not surpassed');
  for(const value of [-1,101,NaN,Infinity,90.5,'90',{},undefined])assert.throws(()=>rankingPercentile(value),RangeError);
});

test('persistence stores only the latest score and rejects corrupt or incompatible records', () => {
  const items=new Map();const storage={getItem:key=>items.get(key)||null,setItem:(key,value)=>items.set(key,value)};
  assert.equal(loadRankingScore(storage),null);
  assert.equal(saveRankingScore(storage,90),true);
  assert.equal(loadRankingScore(storage),90);
  saveRankingScore(storage,68);assert.equal(loadRankingScore(storage),68);
  assert.deepEqual(JSON.parse(items.get(RANKING_STORAGE_KEY)),{version:1,score:68});
  for(const value of ['broken','null','{"version":2,"score":90}','{"version":1,"score":101}','{"version":1,"score":"90"}']){
    items.set(RANKING_STORAGE_KEY,value);assert.equal(loadRankingScore(storage),null);
  }
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
  assert.equal(loadRankingScore(blocked),null);assert.equal(saveRankingScore(blocked,80),false);
});

function harness(initialScore=null) {
  const handlers={},nodes=new Map(),items=new Map(),calls=[];let document;
  if(initialScore!==null)items.set(RANKING_STORAGE_KEY,JSON.stringify({version:1,score:initialScore}));
  function node(id){
    if(!nodes.has(id)){
      const attrs=new Map(),classes=new Set();
      nodes.set(id,{id,hidden:id==='beautyRanking'||id==='beautyReport',dataset:{},innerHTML:'',isConnected:true,
        addEventListener(type,fn){handlers[id+':'+type]=fn;},setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key),getAttribute:key=>attrs.get(key),
        classList:{add:key=>classes.add(key),remove:key=>classes.delete(key)},
        querySelector(selector){if(selector==='.beauty-hero-photo')return null;return node(id+':'+selector);},
        querySelectorAll(){return [];},focus(){document.activeElement=this;},closest(){return null;}});
    }
    return nodes.get(id);
  }
  document={getElementById:node,querySelector:node,activeElement:node('entry'),addEventListener(type,fn){handlers[type]=fn;}};
  const window={addEventListener(type,fn){handlers['window:'+type]=fn;},beautyExperience:{closePanel(){calls.push('closePanel');},upload(){calls.push('upload');},readAdvice(){calls.push('advice');}}};
  const history={state:null,pushState(value){this.state=value;},replaceState(value){this.state=value;},back(){this.state=null;handlers['window:popstate']({state:null});}};
  const source=readFileSync(new URL('../public/beauty-ranking.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
  runInNewContext(source,{document,window,history,rankingSnapshot,loadRankingScore,saveRankingScore,URLSearchParams,location:{search:''},localStorage:{getItem:key=>items.get(key)||null,setItem:(key,value)=>items.set(key,value)},URL:{revokeObjectURL(){}},CustomEvent:class{}});
  return {node,handlers,history,calls,window,items,click(action){handlers['beautyPage:click']({target:{closest(selector){return selector==='[data-rank]'?{dataset:{rank:action}}:null;}}});}};
}

test('rank page opens without a report, pages the list and restores the previous view on back', () => {
  const h=harness();h.window.beautyRankingExperience.open();
  assert.equal(h.node('beautyRanking').hidden,false);
  assert.equal(h.node('beautyRanking').dataset.active,'true');
  assert.equal(h.node('beautyScroll').getAttribute('inert'),'');
  assert.match(h.node('beautyRanking').innerHTML,/测测我的排位/);
  assert.doesNotMatch(h.node('beautyRanking').innerHTML,/我的附近|个人高光详情|data-product-buy|href=/);
  assert.equal((h.node('beautyRanking').innerHTML.match(/<li class="beauty-rank-row/g)||[]).length,17);
  h.click('more');assert.equal((h.node('beautyRanking:.beauty-rank-list').innerHTML.match(/<li /g)||[]).length,47);
  h.click('back');
  assert.equal(h.node('beautyRanking').hidden,true);
  assert.equal(h.node('beautyScroll').getAttribute('inert'),undefined);
  assert.equal(h.node('beautyRanking').innerHTML,'');
});

test('completed reports update rank and persistent score without storing photographs', () => {
  const h=harness(52);
  h.handlers['beauty:report-ready']({detail:{score:97,afterScore:100,photo:'blob:private-photo'}});
  h.window.beautyRankingExperience.open();
  assert.match(h.node('beautyRanking').innerHTML,/分享我的排名/);
  assert.match(h.node('beautyRanking').innerHTML,/>97<small> 分/);
  assert.deepEqual(JSON.parse(h.items.get(RANKING_STORAGE_KEY)),{version:1,score:97});
  assert.ok(!h.items.get(RANKING_STORAGE_KEY).includes('photo'));
  h.click('test');assert.equal(h.node('beautyRanking').hidden,true);assert.ok(h.calls.includes('upload'));
  assert.ok(!h.history.state.beautyRanking);
});
