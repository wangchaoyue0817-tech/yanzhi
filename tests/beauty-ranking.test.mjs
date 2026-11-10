import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as model from '../public/beauty-ranking-model.js';
const {createRankingSeeds,rankRecords,rankingPercentile,beijingDay,freshRankingState,beginMeasurement,finishMeasurement,cancelMeasurement,authorizeRanking,mayRevealRanking,dailyRankingSnapshot,loadDailyRanking,saveDailyRanking,RANKING_STORAGE_KEY}=model;
const now=Date.parse('2026-11-05T15:59:00Z'),tomorrow=Date.parse('2026-11-05T16:00:00Z');
const photo='data:image/jpeg;base64,YWJj';
const completed=(score=90)=>finishMeasurement(beginMeasurement(freshRankingState(now),1,now),{id:1,score,photo},now);

test('daily seeds are reproducible, bounded and approximately normal, and change on a new day',()=>{
 const rows=createRankingSeeds();assert.equal(rows.length,1000);assert.deepEqual(createRankingSeeds(),rows);
 const mean=rows.reduce((sum,r)=>sum+r.score,0)/1000,deviation=Math.sqrt(rows.reduce((sum,r)=>sum+(r.score-mean)**2,0)/1000);
 assert.ok(mean>73&&mean<75&&deviation>8&&deviation<10);
 assert.equal(new Set(rows.map(row=>row.id)).size,1000);assert.ok(rows.every(row=>row.score>=0&&row.score<=100));
 assert.deepEqual(model.dailyRankingSeeds('2026-11-05'),model.dailyRankingSeeds('2026-11-05'));
 assert.notDeepEqual(model.dailyRankingSeeds('2026-11-05'),model.dailyRankingSeeds('2026-11-06'));
 assert.throws(()=>createRankingSeeds(0),RangeError);
});
test('tied scores have unique deterministic positions while percentiles exclude equal scores',()=>{
 assert.deepEqual(rankRecords([{id:'c',score:80},{id:'a',score:90},{id:'d',score:70},{id:'b',score:80},{id:'a',score:100}]).map(r=>[r.id,r.rank]),[['a',1],['b',2],['c',3],['d',4]]);
 assert.deepEqual(rankRecords([{id:'late',score:90,measuredAt:20},{id:'early',score:90,measuredAt:10}]).map(r=>[r.id,r.rank]),[['early',1],['late',2]]);
 assert.equal(rankingPercentile(80,[{score:70},{score:80},{score:90}]),33.3);
 assert.equal(rankingPercentile(100,[{score:99}]),100,'a score above every record reaches the 100th percentile');
 assert.equal(rankingPercentile(0,[{score:0}]),0,'equal scores never count as surpassed');
 for(const invalid of [-1,101,NaN,90.5,'90'])assert.throws(()=>rankingPercentile(invalid),RangeError);
});
test('upload and report completion alone never reveal a ranking or insert a public record',()=>{
 const fresh=freshRankingState(now);assert.equal(fresh.uploaded,false);
 const pending=beginMeasurement(fresh,1,now);assert.equal(pending.uploaded,true);assert.equal(pending.pending,true);
 assert.throws(()=>authorizeRanking(pending,true,now),/今日鉴定/);
 const ready=completed(100);assert.equal(mayRevealRanking(ready,now),false);
 const board=dailyRankingSnapshot(ready,'JX12345678',now);assert.equal(board.me,null);assert.equal(board.percentile,null);assert.ok(!board.records.some(r=>r.id==='self'));
 assert.equal(cancelMeasurement(pending,now).uploaded,false);
});
test('explicit consent adds one self record with original photo; withdrawal removes it immediately',()=>{
 const ready=completed(100),allowed=authorizeRanking(ready,true,now);
 assert.equal(mayRevealRanking(allowed,now),true);
 const board=dailyRankingSnapshot(allowed,'JX12345678',now);
 assert.equal(board.total,1001);assert.equal(board.me.rank,1+model.dailyRankingSeeds(beijingDay(now)).filter(row=>row.score===100).length);assert.equal(board.me.photo,photo);assert.equal(board.me.userId,'JX12345678');
 assert.equal(board.topTen.length,10);assert.ok(board.topTen.every(r=>r.photo&&r.userId));
 const revoked=authorizeRanking(allowed,false,now),hidden=dailyRankingSnapshot(revoked,'JX12345678',now);
 assert.equal(hidden.total,1000);assert.equal(hidden.me,null);assert.ok(!hidden.topTen.some(r=>r.id==='self'));
});
test('same-day repeats use the highest score and its matching original photo, never the generated image',()=>{
 let state=authorizeRanking(completed(90),true,now);
 state=beginMeasurement(state,2,now);assert.equal(mayRevealRanking(state,now),false);
 state=finishMeasurement(state,{id:2,score:80,photo:'data:image/jpeg;base64,ZGVm',afterScore:100},now);
 assert.equal(state.bestScore,90);assert.equal(state.bestPhoto,photo);assert.equal(state.authorized,false);
 state=finishMeasurement(beginMeasurement(state,3,now),{id:3,score:97,photo:'data:image/jpeg;base64,ZGVm'},now);
 assert.equal(state.bestScore,97);assert.equal(state.bestPhoto,'data:image/jpeg;base64,ZGVm');
});
test('Beijing midnight expires scores and consent, and an old in-flight report cannot qualify for a new day',()=>{
 assert.equal(beijingDay(now),'2026-11-05');assert.equal(beijingDay(tomorrow),'2026-11-06');
 const allowed=authorizeRanking(completed(100),true,now);
 assert.equal(mayRevealRanking(allowed,tomorrow),false);assert.equal(model.currentRankingState(allowed,tomorrow).uploaded,false);
 const pending=beginMeasurement(freshRankingState(now),44,now);
 const crossed=finishMeasurement(pending,{id:44,score:100,photo},tomorrow);
 assert.equal(crossed.bestScore,null);assert.equal(crossed.uploaded,false);
 assert.equal(finishMeasurement(allowed,{id:999,score:100,photo},tomorrow).bestScore,null,'reopening an old report is not a fresh measurement');
});
test('session persistence never stores a face before consent and rejects old, corrupt or forged records',()=>{
 const items=new Map(),store={getItem:key=>items.get(key)||null,setItem:(key,value)=>items.set(key,value)};
 saveDailyRanking(store,completed(),now);assert.equal(JSON.parse(items.get(RANKING_STORAGE_KEY)).bestPhoto,null);
 let state=authorizeRanking(completed(),true,now);saveDailyRanking(store,state,now);
 assert.equal(mayRevealRanking(loadDailyRanking(store,now),now),true);
 assert.equal(loadDailyRanking(store,tomorrow).uploaded,false);
 saveDailyRanking(store,authorizeRanking(state,false,now),now);assert.ok(!items.get(RANKING_STORAGE_KEY).includes('YWJj'));
 for(const invalid of ['broken','null','{"version":1,"score":90}',JSON.stringify({...state,bestScore:101}),JSON.stringify({...state,bestPhoto:'javascript:alert(1)'})]){
  items.set(RANKING_STORAGE_KEY,invalid);assert.equal(mayRevealRanking(loadDailyRanking(store,now),now),false);
 }
 assert.equal(saveDailyRanking({setItem(){throw Error('quota');}},state,now),false);
});

function harness(search=''){
 const handlers={},nodes=new Map(),items=new Map(),calls=[];let document,time=now;
 function node(id){if(!nodes.has(id)){const attrs=new Map();nodes.set(id,{id,dataset:{},hidden:id==='beautyRanking'||id==='beautyReport',innerHTML:'',isConnected:true,
 addEventListener(type,fn){handlers[id+':'+type]=fn;},setAttribute:(key,val)=>attrs.set(key,val),removeAttribute:key=>attrs.delete(key),getAttribute:key=>attrs.get(key),classList:{add(){},remove(){}},querySelector:s=>node(id+':'+s),querySelectorAll:()=>[],focus(){document.activeElement=this;},closest(){return null;}});}return nodes.get(id);}
 document={getElementById:node,querySelector:node,activeElement:node('entry'),addEventListener:(t,fn)=>handlers[t]=fn,dispatchEvent(e){calls.push(e);}};
 const window={addEventListener:(t,fn)=>handlers['window:'+t]=fn,beautyExperience:{open(){calls.push('open');},closePanel(){},upload(){calls.push('upload');},readAdvice(){calls.push('advice');}}};
 const history={state:null,pushState(s){this.state=s;},replaceState(s){this.state=s;},back(){this.state=null;handlers['window:popstate']({state:null});}};
 const scope={document,window,history,URLSearchParams,location:{search},setTimeout:()=>0,clearTimeout(){},Date:{now:()=>time,parse:Date.parse},Math,URL:{revokeObjectURL(){}},CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}},sessionStorage:{getItem:key=>items.get(key)||null,setItem:(key,val)=>items.set(key,val)},localStorage:{getItem:()=>null,setItem(){}}};
 for(const name of ['freshRankingState','currentRankingState','beginMeasurement','finishMeasurement','cancelMeasurement','authorizeRanking','mayRevealRanking','dailyRankingSnapshot','loadDailyRanking','saveDailyRanking']){
  const arities={freshRankingState:0,currentRankingState:1,beginMeasurement:2,finishMeasurement:2,cancelMeasurement:1,authorizeRanking:2,mayRevealRanking:1,dailyRankingSnapshot:2,loadDailyRanking:1,saveDailyRanking:2};
  scope[name]=(...args)=>model[name](...args.slice(0,arities[name]),time);
 }
 scope.beijingDay=()=>beijingDay(time);
 runInNewContext(readFileSync(new URL('../public/beauty-ranking.js',import.meta.url),'utf8').replace(/^import .*;$/gm,''),scope);
 return {node,handlers,calls,items,window,history,advance(){time=tomorrow;handlers['window:focus']();},click(action,record){handlers['beautyPage:click']({target:{closest:s=>s==='[data-rank]'?{dataset:{rank:action,record}}:null}});}};
}
test('header and direct URL show the full daily board before a test, and only the personal card starts upload',()=>{
 for(const search of ['', '?beauty=ranking']) {
  const h=harness(search);
  if (!search) {
   h.handlers['beautyPage:click']({target:{closest:selector=>selector==='[data-action="ranking"]'?{}:null}});
  }
  const board=h.node('beautyRanking');
  assert.equal(board.hidden,false);
  assert.equal(h.calls.includes('upload'),false);
  assert.equal((board.innerHTML.match(/data-rank="photo"/g)||[]).length,10);
  assert.match(board.innerHTML,/今日尚未鉴定/);
  assert.match(board.innerHTML,/<section class="beauty-rank-self"[^>]*>[\s\S]*?data-rank="test">去鉴颜值/);
  assert.doesNotMatch(board.innerHTML,/beauty-rank-marker|分享我的排名|超过 <b>|data-rank="consent"/);
  h.click('test');
  assert.equal(board.hidden,true);
  assert.ok(h.calls.includes('upload'));
  assert.equal(h.window.beautyRankingExperience.hasUploaded(),false);
 }
});
test('while generating a report the daily board hides the personal score and chart marker',()=>{
 const h=harness();
 h.handlers['beauty:measurement-start']({detail:{id:1}});h.window.beautyRankingExperience.open();
 const html=h.node('beautyRanking').innerHTML;assert.match(html,/报告生成中/);assert.doesNotMatch(html,/beauty-rank-marker|分享我的排名|超过 <b>|去鉴颜值/);
 assert.equal((html.match(/<li class="beauty-rank-row/g)||[]).length,7);assert.doesNotMatch(html,/查看更多|我的附近|个人高光详情/);
});
test('daily consent dialog explains the public portrait and user ID; reject, consent and revoke change visibility',()=>{
 const h=harness();h.handlers['beauty:measurement-start']({detail:{id:1}});h.handlers['beauty:report-ready']({detail:{id:1,score:100,photo}});h.window.beautyRankingExperience.open();
 assert.doesNotMatch(h.node('beautyRanking').innerHTML,/分享我的排名|beauty-rank-marker/);
 h.click('consent');assert.match(h.node('beautyRanking:.beauty-rank-share').innerHTML,/原照片和用户ID/);assert.match(h.node('beautyRanking:.beauty-rank-share').innerHTML,/暂不授权，先看看/);
 h.click('dialog-close');assert.equal(h.window.beautyRankingExperience.canReveal(),false);
 h.click('authorize');assert.equal(h.window.beautyRankingExperience.canReveal(),true);assert.match(h.node('beautyRanking').innerHTML,/分享我的排名/);
 assert.ok(h.items.get(RANKING_STORAGE_KEY).includes('YWJj'));
 h.click('withdraw');assert.equal(h.window.beautyRankingExperience.canReveal(),false);assert.ok(!h.items.get(RANKING_STORAGE_KEY).includes('YWJj'));
 h.advance();
 const tomorrowBoard=h.node('beautyRanking').innerHTML;
 assert.match(tomorrowBoard,/今日尚未鉴定/);assert.match(tomorrowBoard,/去鉴颜值/);
 assert.equal((tomorrowBoard.match(/data-rank="photo"/g)||[]).length,10);
 assert.doesNotMatch(tomorrowBoard,/beauty-rank-marker|超过 <b>|分享我的排名/);
});
test('distribution expands 25–100 across the chart without changing ranking calculations',()=>{
 for(const [score,position] of [[25,0],[50,33.333],[75,66.667],[90,86.667],[100,100],[24,null]]){
  const h=harness();h.handlers['beauty:measurement-start']({detail:{id:1}});h.handlers['beauty:report-ready']({detail:{id:1,score,photo}});h.window.beautyRankingExperience.open();h.click('authorize');
  const html=h.node('beautyRanking').innerHTML,chart=html.match(/<section class="beauty-rank-distribution"[\s\S]*?<\/section>/)[0];
  assert.equal((chart.match(/--bar-height:/g)||[]).length,15);
  assert.match(chart,/显示25至100分/);assert.doesNotMatch(chart,/<span>0<\/span>/);
  assert.equal((chart.match(/--tick:/g)||[]).length,4);
  if(position===null){assert.doesNotMatch(chart,/beauty-rank-marker|is-current/);assert.match(chart,/低于显示范围/);}
  else {assert.match(chart,new RegExp('--marker:'+String(position).replace('.','\\.')+'%'));assert.equal((chart.match(/class="is-current"/g)||[]).length,1);}
  const expected=dailyRankingSnapshot(authorizeRanking(completed(score),true,now),'unused',now);
  assert.ok(html.includes('第</small> '+expected.me.rank+' <small>名'));
  assert.ok(html.includes('超过 <b>'+expected.percentile+'%</b>'));
 }
});

test('the podium names first, second and third, with ten accessible full-photo actions',()=>{
 const h=harness();h.handlers['beauty:measurement-start']({detail:{id:1}});h.window.beautyRankingExperience.open();
 const html=h.node('beautyRanking').innerHTML,podium=html.match(/<section class="beauty-rank-podium"[\s\S]*?<\/section>/)[0];
 assert.deepEqual([...podium.matchAll(/<span>第(\d)名<\/span>/g)].map(m=>m[1]),['2','1','3']);
 assert.equal((html.match(/data-rank="photo"/g)||[]).length,10);assert.equal((html.match(/aria-haspopup="dialog"/g)||[]).length,10);
});
test('large photos stay limited to today’s visible top ten and show the original portrait',()=>{
 const h=harness();h.window.beautyRankingExperience.open();
 const first=dailyRankingSnapshot(freshRankingState(now),'unused',now).topTen[0];
 h.click('photo',first.id);const panel=h.node('beautyRanking:.beauty-rank-share');
 assert.equal(panel.hidden,false);assert.match(panel.innerHTML,/role="dialog"/);assert.match(panel.innerHTML,/关闭照片大图/);
 assert.ok(panel.innerHTML.includes(first.userId));assert.ok(panel.innerHTML.includes(first.photo));assert.match(panel.innerHTML,/beauty-rank-original-crop/);
 h.handlers.keydown({key:'Escape',preventDefault(){}});assert.equal(panel.hidden,true);
 h.click('photo','self');assert.equal(panel.hidden,true,'unapproved self record has no public photo');
 h.click('photo','seed-does-not-exist');assert.equal(panel.hidden,true);
 h.handlers['beauty:measurement-start']({detail:{id:1}});
 h.handlers['beauty:report-ready']({detail:{id:1,score:100,photo}});h.click('authorize');h.click('photo','self');
 assert.equal(panel.hidden,false);assert.ok(panel.innerHTML.includes(photo));assert.match(panel.innerHTML,/beauty-rank-original-photo/);assert.doesNotMatch(panel.innerHTML,/beauty-rank-original-crop/);
 h.click('withdraw');assert.equal(panel.hidden,true);h.click('photo','self');assert.equal(panel.hidden,true);
 h.click('photo',first.id);h.advance();assert.equal(panel.hidden,true,'a new day closes the old photo viewer');
});
