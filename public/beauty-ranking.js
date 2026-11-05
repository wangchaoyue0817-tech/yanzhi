import { rankingSnapshot, loadRankingScore, saveRankingScore } from './beauty-ranking-model.js?v=2901';

const $ = id => document.getElementById(id);
const page = $('beautyPage'), root = $('beautyRanking');
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const back = svg('<path d="m14 5-7 7 7 7"/>');
const arrow = svg('<path d="M5 12h14m-6-6 6 6-6 6"/>');
const crown = svg('<path d="m3 7 5 4 4-7 4 7 5-4-3 12H6Z"/><path d="M7 16h10"/>');
const info = svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>');
let score = null;
try { score = loadRankingScore(localStorage); } catch {}
let visible = false, returnFocus = null, shown = 20, posterUrl = '', shareFocus = null, shareToken = 0;
const active = () => !page.hidden && visible;
const photo = () => $('beautyReport').querySelector('.beauty-hero-photo')?.getAttribute('src');
const hasReport = () => !$('beautyReport').hidden && !!photo();
const avatar = (row, large=false) => `<span class="beauty-rank-avatar tone-${row.tone}${large?' is-large':''}" aria-hidden="true">${row.id==='self'&&hasReport()?`<img src="${esc(photo())}" alt="">`:esc([...row.name][0])}</span>`;

function renderRows(snapshot) {
  return snapshot.records.slice(3,shown).map(row=>`<li class="beauty-rank-row${row.id==='self'?' is-me':''}" aria-label="并列规则下第${row.rank}名，${esc(row.name)}，${row.score}分"><span class="beauty-rank-number">${row.rank}</span>${avatar(row)}<span class="beauty-rank-person"><strong>${esc(row.name)}${row.id==='self'?'<small>我</small>':''}</strong><span>${esc(row.tag)}</span></span><b class="beauty-rank-score">${row.score}<small>分</small></b></li>`).join('');
}

function render() {
  const snapshot = rankingSnapshot(score);
  const podium = [snapshot.records[1],snapshot.records[0],snapshot.records[2]];
  const max = Math.max(...snapshot.bins.map(bin=>bin.count),1);
  root.innerHTML = `<header class="beauty-rank-header"><button type="button" data-rank="back" aria-label="返回鉴颜值">${back}</button><h1 id="beautyRankingTitle" tabindex="-1">颜值上分榜</h1><details class="beauty-rank-rules"><summary aria-label="查看排名规则">${info}</summary><div><strong>排名规则</strong><p>按综合得分降序排列，同分并列。每台设备保留一条最新成绩，妆后预计分不参与排名。</p></div></details></header>
    <div class="beauty-rank-scroll">
      <section class="beauty-rank-podium" aria-label="榜单前三位">${podium.map((row,index)=>`<article class="beauty-rank-winner place-${index===1?1:index===0?2:3}"><span class="beauty-rank-medal">${index===1?crown:''}<span>${row.rank}</span></span>${avatar(row,true)}<strong>${esc(row.name)}</strong><b>${row.score}<small>分</small></b><span class="beauty-rank-plinth" aria-hidden="true"></span></article>`).join('')}</section>
      <section class="beauty-rank-self" aria-label="我的名次">${snapshot.me?`<div class="beauty-rank-self-top"><span>我的名次</span><span>${snapshot.me.score}<small> 分</small></span></div><div class="beauty-rank-self-main"><strong><small>第</small> ${snapshot.me.rank} <small>名</small></strong><span>超过 <b>${snapshot.percentile}%</b> 的上榜成绩</span></div>`:`<div class="beauty-rank-before"><span class="beauty-rank-before-icon">${crown}</span><div><h2>你的高光，排在第几？</h2><button type="button" data-rank="test">测测我的排位 ${arrow}</button></div></div>`}</section>
      <section class="beauty-rank-distribution" aria-label="得分分布"><div class="beauty-rank-section-heading"><h2>得分分布</h2>${snapshot.me?`<span>你在 <b>${snapshot.me.score}</b> 分</span>`:''}</div><div class="beauty-rank-chart" role="img" aria-label="${snapshot.me?`你的得分为${snapshot.me.score}分。`:''}榜单成绩的分数分布"><div class="beauty-rank-bars">${snapshot.bins.map((bin,index)=>`<i style="--bar-height:${Math.max(3,bin.count / max * 100)}%"${snapshot.me&&Math.min(19,Math.floor(snapshot.me.score/5))===index?' class="is-current"':''}></i>`).join('')}</div>${snapshot.me?`<span class="beauty-rank-marker" style="--marker:${Math.max(1,Math.min(99,snapshot.me.score))}%"><i></i></span>`:''}</div><div class="beauty-rank-axis"><span>0</span><span>25</span><span>50</span><span>75</span><span>100 分</span></div></section>
      <section class="beauty-rank-list-section"><div class="beauty-rank-section-heading"><h2>上分榜单</h2><span>${snapshot.total.toLocaleString('en-US')} 条成绩</span></div><ol class="beauty-rank-list" start="4">${renderRows(snapshot)}</ol><button type="button" class="beauty-rank-more" data-rank="more"${shown>=snapshot.total?' hidden':''}>查看更多 ${svg('<path d="m7 10 5 5 5-5"/>')}</button></section>
    </div><footer class="beauty-rank-footer">${snapshot.me?`<button type="button" class="beauty-rank-secondary" data-rank="${hasReport()?'advice':'test'}">${hasReport()?'我的变美思路':'再测一次'}</button><button type="button" class="beauty-rank-primary" data-rank="share">分享我的排名 ${arrow}</button>`:`<button type="button" class="beauty-rank-primary" data-rank="test">测测我的排位 ${arrow}</button>`}</footer><div class="beauty-rank-share" hidden></div><span class="beauty-rank-status" role="status" aria-live="polite"></span>`;
}

function setUnderlyingInert(value) {
  for(const node of [$('beautyScroll'),document.querySelector('.beauty-header'),$('beautyComposer')]) {
    if(value)node.setAttribute('inert','');else node.removeAttribute('inert');
  }
}

function open({push=true}={}) {
  if(visible)return;
  window.beautyExperience?.closePanel();
  returnFocus=document.activeElement;shown=20;visible=true;
  if(push)history.pushState({...history.state,beautyRanking:true},'');
  render();root.hidden=false;root.dataset.active='true';page.classList.add('is-ranking');setUnderlyingInert(true);
  $('beautyRankingTitle').focus({preventScroll:true});
}

function close({restore=true,cleanHistory=false}={}) {
  if(!visible)return;
  closeShare();visible=false;root.hidden=true;root.dataset.active='false';root.innerHTML='';page.classList.remove('is-ranking');setUnderlyingInert(false);
  if(cleanHistory&&history.state?.beautyRanking){const state={...history.state};delete state.beautyRanking;history.replaceState(state,'');}
  if(restore&&returnFocus?.isConnected&&!returnFocus.closest('[hidden],[inert]'))returnFocus.focus({preventScroll:true});
}

function goBack(){ if(history.state?.beautyRanking)history.back();else close(); }

function closeShare() {
  shareToken++;
  const panel=root.querySelector('.beauty-rank-share');
  if(panel){panel.hidden=true;panel.innerHTML='';}
  for(const node of root.querySelectorAll('.beauty-rank-header,.beauty-rank-scroll,.beauty-rank-footer'))node.removeAttribute('inert');
  if(posterUrl)URL.revokeObjectURL(posterUrl);posterUrl='';
  if(shareFocus?.isConnected)shareFocus.focus({preventScroll:true});
}

async function share() {
  if(score===null)return;
  const token=++shareToken;
  shareFocus=document.activeElement;
  const me=rankingSnapshot(score).me;
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=920;
  const ctx=canvas.getContext('2d');
  const bg=ctx.createLinearGradient(0,0,720,920);bg.addColorStop(0,'#171c3a');bg.addColorStop(1,'#080c1d');ctx.fillStyle=bg;ctx.fillRect(0,0,720,920);
  const glow=ctx.createRadialGradient(360,280,5,360,280,350);glow.addColorStop(0,'#7569ed55');glow.addColorStop(1,'#7569ed00');ctx.fillStyle=glow;ctx.fillRect(0,0,720,920);
  ctx.textAlign='center';ctx.fillStyle='#eeeefe';ctx.font='600 40px "PingFang SC", sans-serif';ctx.fillText('颜值上分榜',360,110);
  ctx.fillStyle='#d4b7ff';ctx.font='600 154px "PingFang SC", sans-serif';ctx.fillText(String(score),360,340);
  ctx.fillStyle='#adb6cc';ctx.font='28px "PingFang SC", sans-serif';ctx.fillText('我的颜值得分',360,402);
  ctx.strokeStyle='#8d9abb44';ctx.beginPath();ctx.moveTo(120,472);ctx.lineTo(600,472);ctx.stroke();
  ctx.fillStyle='#e6cca0';ctx.font='600 70px "PingFang SC", sans-serif';ctx.fillText(`第 ${me.rank} 名`,360,590);
  ctx.fillStyle='#adb6cc';ctx.font='27px "PingFang SC", sans-serif';ctx.fillText(`超过 ${rankingSnapshot(score).percentile}% 的上榜成绩`,360,660);
  ctx.fillStyle='#c4c6df';ctx.font='24px "PingFang SC", sans-serif';ctx.fillText('AI 鉴颜值',360,824);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!active()||!blob||token!==shareToken)return;
  if(posterUrl)URL.revokeObjectURL(posterUrl);
  posterUrl=URL.createObjectURL(blob);
  const panel=root.querySelector('.beauty-rank-share');
  panel.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="beautyRankShareTitle"><header><h2 id="beautyRankShareTitle">我的上分海报</h2><button type="button" data-rank="share-close" aria-label="关闭上分海报">×</button></header><img src="${posterUrl}" alt="我的颜值上分榜海报：${score}分，第${me.rank}名"><a class="beauty-rank-primary" href="${posterUrl}" download="颜值上分榜-${score}分.png">保存海报</a></section>`;
  panel.hidden=false;
  for(const node of root.querySelectorAll('.beauty-rank-header,.beauty-rank-scroll,.beauty-rank-footer'))node.setAttribute('inert','');
  panel.querySelector('button').focus({preventScroll:true});
}

page.addEventListener('click',event=>{
  if(event.target.closest('[data-action="ranking"]'))return open();
  const action=event.target.closest('[data-rank]')?.dataset.rank;
  if(!active()||!action)return;
  if(action==='back')return goBack();
  if(action==='share-close')return closeShare();
  if(action==='more'){
    shown+=30;const snapshot=rankingSnapshot(score);root.querySelector('.beauty-rank-list').innerHTML=renderRows(snapshot);
    root.querySelector('[data-rank="more"]').hidden=shown>=snapshot.total;
    root.querySelector('.beauty-rank-status').textContent=`已显示 ${Math.min(shown,snapshot.total)} 条成绩`;
  }
  if(action==='test'||action==='advice'){
    close({restore:false,cleanHistory:true});
    if(action==='advice')window.beautyExperience?.readAdvice();else window.beautyExperience?.upload();
  }
  if(action==='share')share().catch(()=>{root.querySelector('.beauty-rank-status').textContent='海报生成失败，请重试';});
});
document.addEventListener('beauty:report-ready',event=>{
  score=event.detail.score;let saved=false;
  try{saved=saveRankingScore(localStorage,score);}catch{}
  if(!saved)window.beautyExperience?.notify('本次排名可查看，暂时无法保存到设备');
});
document.addEventListener('keydown',event=>{
  if(!active())return;
  if(event.key==='Escape'){
    event.preventDefault();const panel=root.querySelector('.beauty-rank-share');
    if(!panel.hidden)return closeShare();
    const rules=root.querySelector('details');if(rules.open){rules.open=false;rules.querySelector('summary').focus();return;}
    return goBack();
  }
  if(event.key!=='Tab')return;
  const items=[...root.querySelectorAll('button:not([disabled]),a,summary')].filter(node=>!node.closest('[hidden],[inert]')&&node.getClientRects().length);
  if(!items.length)return;
  const first=items[0],last=items.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
window.addEventListener('popstate',event=>{
  if(event.state?.beautyRanking&&!page.hidden)open({push:false});else close();
});
window.beautyRankingExperience={open,close};
if(new URLSearchParams(location.search).get('beauty')==='ranking'){
  window.beautyExperience.open();open({push:!history.state?.beautyRanking});
}
