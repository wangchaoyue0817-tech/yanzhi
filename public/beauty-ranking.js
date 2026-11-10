import { beijingDay, freshRankingState, currentRankingState, beginMeasurement, finishMeasurement, cancelMeasurement, authorizeRanking, mayRevealRanking, dailyRankingSnapshot, loadDailyRanking, saveDailyRanking } from './beauty-ranking-model.js?v=3201';
const $=id=>document.getElementById(id), page=$('beautyPage'),root=$('beautyRanking');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const back=svg('<path d="m14 5-7 7 7 7"/>'),arrow=svg('<path d="M5 12h14m-6-6 6 6-6 6"/>'),crown=svg('<path d="m3 7 5 4 4-7 4 7 5-4-3 12H6Z"/><path d="M7 16h10"/>'),info=svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>');
let state=freshRankingState(),storage=null,userId='JX'+Math.floor(10000000+Math.random()*90000000);
try{storage=sessionStorage;state=loadDailyRanking(storage);const saved=localStorage.getItem('jianx-beauty-user-id');if(/^JX\d{8}$/.test(saved))userId=saved;else localStorage.setItem('jianx-beauty-user-id',userId);}catch{}
let visible=false,returnFocus=null,posterUrl='',dialogFocus=null,shareToken=0,midnightTimer=null;
const hasReport=()=>!$('beautyReport').hidden;
const active=()=>visible&&!page.hidden;
function persist(){if(storage&&!saveDailyRanking(storage,state))window.beautyExperience?.notify('本次状态可用，暂时无法保存在设备');}
function announce(){document.dispatchEvent(new CustomEvent('beauty:ranking-privacy',{detail:{allowed:mayRevealRanking(state),pending:state.pending,day:state.day}}));}
function syncDay(){const next=currentRankingState(state);if(next!==state){state=next;persist();closeDialog();announce();if(visible)render();}return state;}
function snapshot(){syncDay();return dailyRankingSnapshot(state,userId);}
function avatar(row,large=false){return `<button type="button" class="beauty-rank-avatar tone-${row.tone}${large?' is-large':''}${row.sheet?' is-sheet':''}" data-rank="photo" data-record="${esc(row.id)}" aria-label="查看用户${esc(row.userId)}的照片大图" aria-haspopup="dialog"><img src="${esc(row.photo)}" alt="" draggable="false"></button>`;}
function personalRanking(snapshot) {
 if (snapshot.allowed) {
  return {
   card: `<div class="beauty-rank-self-top"><span>我的名次</span><span>${snapshot.me.score}<small> 分</small></span></div>
    <div class="beauty-rank-self-main"><strong><small>第</small> ${snapshot.me.rank} <small>名</small></strong><span>超过 <b>${snapshot.percentile}%</b> 的上榜成绩</span></div>`,
   footer: `<button type="button" class="beauty-rank-secondary" data-rank="${hasReport()?'advice':'test'}">${hasReport()?'我的变美思路':'再测一次'}</button>
    <button type="button" class="beauty-rank-primary" data-rank="share">分享我的排名 ${arrow}</button>`
  };
 }
 if (!state.pending && state.bestScore === null) {
  return {
   card: `<div class="beauty-rank-self-guest"><div><span>我的名次</span><strong>今日尚未鉴定</strong></div>
    <button type="button" class="beauty-rank-primary" data-rank="test">去鉴颜值 ${arrow}</button></div>`,
   footer: ''
  };
 }
 const mask = '<span class="beauty-rank-mask" aria-hidden="true">••••</span>';
 if (state.pending) {
  return {
   card: `<div class="beauty-rank-self-locked"><span>我的名次</span><div>${mask}<span>报告生成中</span></div></div>`,
   footer: '<button type="button" class="beauty-rank-primary" data-rank="back">返回报告生成页</button>'
  };
 }
 const action = state.bestPhoto ? 'consent' : 'test';
 const cardLabel = state.bestPhoto ? '授权查看我的排名' : '重新上传，授权展示';
 const label = state.bestPhoto ? '授权展示，查看排名' : '重新上传，授权展示';
 return {
  card: `<div class="beauty-rank-self-locked"><span>我的名次</span><div>${mask}<span>待授权展示形象</span></div>
   <button type="button" data-rank="${action}">${cardLabel} ${arrow}</button></div>`,
  footer: `<button type="button" class="beauty-rank-primary" data-rank="${action}">${label} ${arrow}</button>`
 };
}
function header(){return `<header class="beauty-rank-header"><button type="button" data-rank="back" aria-label="返回鉴颜值">${back}</button><h1 id="beautyRankingTitle" tabindex="-1">颜值上分榜</h1><details class="beauty-rank-rules"><summary aria-label="查看排名规则">${info}</summary><div><strong>今日上榜规则</strong><p>每天北京时间 00:00 开启新榜，参与排名需当天鉴定并授权。每位用户取当天最高有效分，同分按首次达到该分数的先后排序。前十个展示位公开原照片和用户ID，妆后预计分不入榜。</p>${state.authorized?'<button type="button" data-rank="withdraw">撤回形象展示授权</button>':''}</div></details></header>`;}
function render(){
 const s=snapshot();
 const personal = personalRanking(s);
 const podium=[s.topTen[1],s.topTen[0],s.topTen[2]],chartBins=s.bins.filter(bin=>bin.min>=25),max=Math.max(...chartBins.map(bin=>bin.count),1);
 const chartX=score=>Number(((score-25)/75*100).toFixed(3)),markerScore=s.allowed&&s.me.score>=25?s.me.score:null;
 root.innerHTML=header()+`<div class="beauty-rank-scroll"><div class="beauty-rank-date">${s.day.slice(5).replace('-','月')}日 · 今日榜</div>
 <section class="beauty-rank-podium" aria-label="今日榜单前三个展示位">${podium.filter(Boolean).map((row,index)=>`<article class="beauty-rank-winner place-${index===1?1:index===0?2:3}"><span class="beauty-rank-medal">${index===1?crown:''}<span>第${row.rank}名</span></span>${avatar(row,true)}<div class="beauty-rank-winner-info"><strong>${esc(row.userId)}</strong><b>${row.score}<small>分</small></b></div></article>`).join('')}</section>
 <section class="beauty-rank-self" aria-label="我的名次">${personal.card}</section>
 <section class="beauty-rank-distribution" aria-label="得分分布"><div class="beauty-rank-section-heading"><h2>得分分布</h2>${s.allowed?`<span>你在 <b>${s.me.score}</b> 分</span>`:''}</div><div class="beauty-rank-chart" role="img" aria-label="今日得分分布，显示25至100分${s.allowed?`，你的得分为${s.me.score}分${markerScore===null?'，低于显示范围':''}`:''}"><div class="beauty-rank-bars">${chartBins.map(bin=>`<i style="--bar-height:${Math.max(3,bin.count/max*100)}%"${s.allowed&&s.me.score>=bin.min&&s.me.score<=bin.max?' class="is-current"':''}></i>`).join('')}</div>${markerScore!==null?`<span class="beauty-rank-marker" style="--marker:${chartX(markerScore)}%"><i></i></span>`:''}</div><div class="beauty-rank-axis">${[25,50,75,100].map(score=>`<span style="--tick:${chartX(score)}%">${score}${score===100?' 分':''}</span>`).join('')}</div></section>
 <section class="beauty-rank-list-section"><div class="beauty-rank-section-heading"><h2>今日十强</h2><span>每日 00:00 更新</span></div><ol class="beauty-rank-list" start="4">${s.topTen.slice(3).map(row=>`<li class="beauty-rank-row${row.id==='self'?' is-me':''}" aria-label="第${row.rank}名，用户${esc(row.userId)}，${row.score}分"><span class="beauty-rank-number">${row.rank}</span>${avatar(row)}<span class="beauty-rank-person"><strong>${esc(row.userId)}${row.id==='self'?'<small>我</small>':''}</strong></span><b class="beauty-rank-score">${row.score}<small>分</small></b></li>`).join('')}</ol></section></div>
 ${personal.footer ? `<footer class="beauty-rank-footer">${personal.footer}</footer>` : ''}<div class="beauty-rank-share" hidden></div><span class="beauty-rank-status" role="status" aria-live="polite"></span>`;
}
function setUnderlyingInert(value){for(const node of [$('beautyScroll'),document.querySelector('.beauty-header'),$('beautyComposer')]){if(value)node.setAttribute('inert','');else node.removeAttribute('inert');}}
function open({push=true}={}){
 syncDay();if(visible)return;
 returnFocus=document.activeElement;window.beautyExperience?.closePanel();visible=true;
 if(push)history.pushState({...history.state,beautyRanking:true},'');
 render();root.hidden=false;root.dataset.active='true';page.classList.add('is-ranking');setUnderlyingInert(true);$('beautyRankingTitle').focus({preventScroll:true});
}
function close({restore=true,cleanHistory=false}={}){
 if(!visible)return;closeDialog();visible=false;root.hidden=true;root.dataset.active='false';root.innerHTML='';page.classList.remove('is-ranking');setUnderlyingInert(false);
 if(cleanHistory&&history.state?.beautyRanking){const value={...history.state};delete value.beautyRanking;history.replaceState(value,'');}
 if(restore&&returnFocus?.isConnected&&!returnFocus.closest('[hidden],[inert]'))returnFocus.focus({preventScroll:true});
}
function goBack(){if(history.state?.beautyRanking)history.back();else close();}
function closeDialog(){shareToken++;const panel=root.querySelector('.beauty-rank-share');if(panel){panel.hidden=true;panel.innerHTML='';}for(const node of root.querySelectorAll('.beauty-rank-header,.beauty-rank-scroll,.beauty-rank-footer'))node.removeAttribute('inert');if(posterUrl)URL.revokeObjectURL(posterUrl);posterUrl='';if(dialogFocus?.isConnected)dialogFocus.focus({preventScroll:true});}
function dialog(html){dialogFocus=document.activeElement;const panel=root.querySelector('.beauty-rank-share');panel.innerHTML=html;panel.hidden=false;for(const node of root.querySelectorAll('.beauty-rank-header,.beauty-rank-scroll,.beauty-rank-footer'))node.setAttribute('inert','');panel.querySelector('button').focus({preventScroll:true});}
function consent(){syncDay();if(state.pending)return;if(!state.bestPhoto){close({restore:false,cleanHistory:true});window.beautyExperience?.upload();return;}
 dialog(`<section class="beauty-rank-consent" role="dialog" aria-modal="true" aria-labelledby="beautyRankConsentTitle"><header><h2 id="beautyRankConsentTitle">授权展示形象</h2><button type="button" data-rank="dialog-close" aria-label="关闭授权面板">×</button></header><img src="${esc(state.bestPhoto)}" alt="将用于今日榜单展示的原照片"><strong>${esc(userId)}</strong><p>授权后，你将参与今日排名；进入前十时，你当天最高分对应的原照片和用户ID将展示在榜单中。你可以随时撤回授权。</p><button type="button" class="beauty-rank-primary" data-rank="authorize">同意展示，查看排名</button><button type="button" class="beauty-rank-consent-skip" data-rank="dialog-close">暂不授权，先看看</button></section>`);
}
function photoPreview(id){
 const row=snapshot().topTen.find(item=>item.id===id);if(!row)return;
 const photo=`<img${row.sheet?'':' class="beauty-rank-original-photo"'} src="${esc(row.photo)}" alt="用户${esc(row.userId)}上传的原照片" draggable="false">`;
 dialog(`<section class="beauty-rank-photo-viewer" role="dialog" aria-modal="true" aria-labelledby="beautyRankPhotoTitle"><header><div><h2 id="beautyRankPhotoTitle">${esc(row.userId)}</h2><p>第${row.rank}名 · ${row.score}分</p></div><button type="button" data-rank="dialog-close" aria-label="关闭照片大图">×</button></header>${row.sheet?`<div class="beauty-rank-original-crop">${photo}</div>`:photo}</section>`);
}
async function share(){
 const s=snapshot();if(!s.allowed)return;
 const token=++shareToken,canvas=document.createElement('canvas');canvas.width=720;canvas.height=920;const ctx=canvas.getContext('2d');
 const bg=ctx.createLinearGradient(0,0,720,920);bg.addColorStop(0,'#171c3a');bg.addColorStop(1,'#080c1d');ctx.fillStyle=bg;ctx.fillRect(0,0,720,920);
 ctx.textAlign='center';ctx.fillStyle='#eeeefe';ctx.font='600 40px "PingFang SC", sans-serif';ctx.fillText('颜值上分榜',360,110);ctx.fillStyle='#adb6cc';ctx.font='25px "PingFang SC", sans-serif';ctx.fillText(s.day+' · 今日榜',360,168);
 ctx.fillStyle='#d4b7ff';ctx.font='600 154px "PingFang SC", sans-serif';ctx.fillText(String(s.me.score),360,370);ctx.fillStyle='#adb6cc';ctx.font='28px "PingFang SC", sans-serif';ctx.fillText('今日最高得分',360,430);
 ctx.fillStyle='#e6cca0';ctx.font='600 70px "PingFang SC", sans-serif';ctx.fillText(`第 ${s.me.rank} 名`,360,590);ctx.fillStyle='#adb6cc';ctx.font='27px "PingFang SC", sans-serif';ctx.fillText(`超过 ${s.percentile}% 的上榜成绩`,360,660);ctx.fillStyle='#c4c6df';ctx.font='24px "PingFang SC", sans-serif';ctx.fillText('AI 鉴颜值',360,824);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 if(!active()||!blob||token!==shareToken||!mayRevealRanking(syncDay())||state.day!==s.day)return;
 if(posterUrl)URL.revokeObjectURL(posterUrl);posterUrl=URL.createObjectURL(blob);
 dialog(`<section role="dialog" aria-modal="true" aria-labelledby="beautyRankShareTitle"><header><h2 id="beautyRankShareTitle">我的上分海报</h2><button type="button" data-rank="dialog-close" aria-label="关闭上分海报">×</button></header><img src="${posterUrl}" alt="${s.day}，${s.me.score}分，第${s.me.rank}名"><a class="beauty-rank-primary" href="${posterUrl}" download="颜值上分榜-${s.day}.png">保存海报</a></section>`);
}
page.addEventListener('click',event=>{
 if(event.target.closest('[data-action="ranking"]'))return open();
 if(active()&&event.target===root.querySelector('.beauty-rank-share'))return closeDialog();
 const control=event.target.closest('[data-rank]'),action=control?.dataset.rank;if(!active()||!action)return;
 syncDay();
 if(action==='back')return goBack();if(action==='dialog-close')return closeDialog();if(action==='consent')return consent();if(action==='photo')return photoPreview(control.dataset.record);
 if(action==='authorize'){try{state=authorizeRanking(state,true);persist();closeDialog();announce();render();$('beautyRankingTitle').focus({preventScroll:true});}catch{closeDialog();window.beautyExperience?.notify('请先完成今日鉴定');}return;}
 if(action==='withdraw'){state=authorizeRanking(state,false);persist();closeDialog();announce();render();$('beautyRankingTitle').focus({preventScroll:true});return;}
 if(action==='test'||action==='advice'){close({restore:false,cleanHistory:true});if(action==='advice')window.beautyExperience?.readAdvice();else window.beautyExperience?.upload();return;}
 if(action==='share')share().catch(()=>{if(active())root.querySelector('.beauty-rank-status').textContent='海报生成失败，请重试';});
});
document.addEventListener('beauty:measurement-start',event=>{syncDay();state=beginMeasurement(state,event.detail.id);persist();closeDialog();announce();});
document.addEventListener('beauty:scan-cancel',()=>{state=cancelMeasurement(state);persist();announce();});
document.addEventListener('beauty:report-ready',event=>{state=finishMeasurement(state,{id:event.detail.id,score:event.detail.score,photo:event.detail.photo});persist();announce();if(visible){render();$('beautyRankingTitle').focus({preventScroll:true});}});
document.addEventListener('keydown',event=>{
 if(!active())return;syncDay();
 if(event.key==='Escape'){event.preventDefault();const panel=root.querySelector('.beauty-rank-share');if(panel&&!panel.hidden)return closeDialog();const rules=root.querySelector('details');if(rules?.open){rules.open=false;rules.querySelector('summary').focus();return;}return goBack();}
 if(event.key!=='Tab')return;const items=[...root.querySelectorAll('button:not([disabled]),a,summary')].filter(node=>!node.closest('[hidden],[inert]')&&node.getClientRects().length);if(!items.length)return;const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
window.addEventListener('popstate',event=>{if(event.state?.beautyRanking&&!page.hidden)open({push:false});else close();});
function scheduleMidnight(){clearTimeout(midnightTimer);const now=Date.now(),next=Date.parse(beijingDay(now)+'T00:00:00+08:00')+86400000;midnightTimer=setTimeout(()=>{syncDay();scheduleMidnight();},Math.max(1,next-now+30));}
window.addEventListener('focus',syncDay);document.addEventListener('visibilitychange',()=>{syncDay();scheduleMidnight();});
window.beautyRankingExperience={open,close,canReveal:()=>mayRevealRanking(syncDay()),hasUploaded:()=>syncDay().uploaded};
scheduleMidnight();
if(new URLSearchParams(location.search).get('beauty')==='ranking'){window.beautyExperience.open();open({push:!history.state?.beautyRanking});}
