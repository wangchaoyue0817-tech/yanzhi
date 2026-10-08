import { TIERS, PRODUCTS, createReport } from './beauty-model.js?v=18';
import { renderBeautyPoster } from './beauty-poster.js?v=18';
import { startBeautyCelebration } from './beauty-celebration.js?v=17';

const $ = id => document.getElementById(id);
const page = $('beautyPage');
const scroll = $('beautyScroll');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const star = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 3 3.1 9.9L29 16l-9.9 3.1L16 29l-3.1-9.9L3 16l9.9-3.1Z" stroke="currentColor" stroke-width="1.2"/><path d="m16 9 1.7 5.3L23 16l-5.3 1.7L16 23l-1.7-5.3L9 16l5.3-1.7Z" fill="currentColor"/></svg>';
const crown = '<svg viewBox="0 0 120 84" fill="none" aria-hidden="true"><defs><linearGradient id="beautyCrownMetal" x1="16" y1="10" x2="105" y2="80" gradientUnits="userSpaceOnUse"><stop stop-color="#fff7d6"/><stop offset=".25" stop-color="#e0af5f"/><stop offset=".48" stop-color="#fff4c7"/><stop offset=".75" stop-color="#b486d5"/><stop offset="1" stop-color="#ffe09b"/></linearGradient></defs><path d="m14 29 24 16L60 9l22 36 24-16-12 39H26Z" fill="url(#beautyCrownMetal)" stroke="#ffe9ba" stroke-width="1.2"/><path d="m38 45 22-36-7 48-27 11Zm44 0-22 12 34 11Z" fill="#fff7d5" opacity=".4"/><path d="m60 9 7 48-14 0Z" fill="#7a5689" opacity=".45"/><path d="M28 74h64" stroke="url(#beautyCrownMetal)" stroke-width="5" stroke-linecap="round"/><path d="m60 45 7 9-7 9-7-9Z" fill="#9276d8" stroke="#fff5db"/><circle cx="14" cy="25" r="3" fill="#fff0c3"/><circle cx="60" cy="7" r="3" fill="#fff0c3"/><circle cx="106" cy="25" r="3" fill="#fff0c3"/></svg>';
const ranks = ['I', 'II', 'III', 'IV', 'V'];
const regions = { hair:[0,0,1,.7], brows:[.28,.23,.25,.14], eyes:[.27,.27,.25,.14], skin:[.29,.34,.45,.20], lips:[.38,.43,.25,.12], style:[.06,.16,.88,.84] };
let selectedScore = 90;
let copyVariant = 0;
let stopCelebration = () => {};
let currentReport = null;
let reader = { open:false, visited:false, tab:'overview', area:'hair', coverTop:0, positions:{} };
let readerSequence=0, readerToken='', readerBackPending=false, swipeStart=null;
let photos = null;
let uploadedUrl = '';
let returnFocus = null;
let sheetFocus = null;
let observer = null;
let generation = 0;
let overlayGeneration = 0;
let toastTimer = 0;
const fixtureCache = new Map();
const portraitPaths = [
  'assets/beauty-portrait-natural-v2.png',
  'assets/beauty-portrait-fresh-v2.png',
  'assets/beauty-portrait-radiant-v2.png',
  'assets/beauty-portrait-spotlight-v2.png',
  'assets/beauty-portrait-icon-v2.png',
];
let posterCache = null;
let posterPreviewUrl = '';
let modalKind = '';
const timers = new Set();
const frames = new Set();
const order = { product:null, submitted:false };

function later(fn, delay) {
  const id = setTimeout(() => { timers.delete(id); fn(); }, delay);
  timers.add(id);
  return id;
}
function cancelPresentation() {
  stopCelebration();
  stopCelebration = () => {};
  generation++;
  for (const id of timers) clearTimeout(id);
  timers.clear();
  for (const id of frames) cancelAnimationFrame(id);
  frames.clear();
  observer?.disconnect();
  observer = null;
}
function inert(el, value) {
  if (!el) return;
  el.inert = value;
}
function toast(message) {
  clearTimeout(toastTimer);
  $('beautyToast').textContent = message;
  $('beautyToast').hidden = false;
  toastTimer = setTimeout(() => { $('beautyToast').hidden = true; }, 3000);
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error('照片加载超时，请重试')), 12000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('照片未能读取，请换一张照片')); };
    img.src = src;
  });
}
function crop(image, box = [0,0,1,1], filter = 'none') {
  const [x,y,w,h] = box;
  const canvas = document.createElement('canvas');
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, 1000 / Math.max(sourceWidth * w, sourceHeight * h));
  canvas.width = Math.max(1, Math.round(sourceWidth * w * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法处理照片');
  ctx.filter = filter;
  ctx.drawImage(image, sourceWidth*x, sourceHeight*y, sourceWidth*w, sourceHeight*h, 0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg', .94);
}
async function fixture(index) {
  if (!fixtureCache.has(index)) {
    const task = loadImage(portraitPaths[index]).then(image => ({
      before:crop(image,[0,0,.5,1]),
      after:crop(image,[.5,0,.5,1])
    })).catch(error => { fixtureCache.delete(index); throw error; });
    fixtureCache.set(index,task);
  }
  return fixtureCache.get(index);
}
async function preparePhotos(score) {
  let pair;
  if (uploadedUrl) {
    const own = await loadImage(uploadedUrl);
    // Local upload placeholder for future image-edit endpoint; never swaps the user's identity.
    pair = { before:crop(own), after:crop(own,[0,0,1,1],'brightness(1.035) saturate(1.06) contrast(1.015)') };
  } else {
    pair = await fixture(TIERS.findIndex(tier => score >= tier.min && score <= tier.max));
  }
  const [beforeImage, afterImage] = await Promise.all([loadImage(pair.before),loadImage(pair.after)]);
  const parts = Object.fromEntries(Object.entries(regions).map(([id,box]) => [id,{before:crop(beforeImage,box),after:crop(afterImage,box)}]));
  return {...pair,parts};
}
function clearUpload() {
  if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
  uploadedUrl = '';
}
function resetEntry() {
  clearReader();
  copyVariant = 0;
  cancelPresentation();
  closeSheet(false);
  currentReport = null;
  posterCache = null;
  photos = null;
  $('beautyEntry').hidden = false;
  $('beautyScanning').hidden = true;
  $('beautyReport').hidden = true;
  $('beautyReport').innerHTML = '';
  $('beautyPhotoInput').value = '';
  scroll.scrollTop = 0;
  if (!page.hidden) $('beautyUpload').focus({preventScroll:true});
  page.classList.add('is-entry');
  $('beautyComposer').hidden = false;
}
function open() {
  returnFocus = document.activeElement;
  $('menuPanel').hidden = true;
  $('conversationPanel').hidden = true;
  $('skillPopup').classList.remove('show');
  $('sheetMask').classList.remove('show');
  page.hidden = false;
  $('app').classList.add('is-beauty');
  [$('pageScroll'),$('inputArea'),document.querySelector('.navbar-content')].forEach(el => inert(el,true));
  resetEntry();
  $('beautyMenu').focus({preventScroll:true});
}
function close() {
  resetEntry();
  clearUpload();
  page.hidden = true;
  $('app').classList.remove('is-beauty');
  [$('pageScroll'),$('inputArea'),document.querySelector('.navbar-content')].forEach(el => inert(el,false));
  clearTimeout(toastTimer);
  $('beautyToast').hidden = true;
  if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
}
async function start(score = selectedScore, scan = true) {
  clearReader();
  closeSheet(false);
  cancelPresentation();
  const token = generation;
  selectedScore = score;
  currentReport = null;
  photos = null;
  posterCache = null;
  const nextReport = createReport(score, copyVariant);
  $('beautyEntry').hidden = true;
  page.classList.remove('is-entry');
  $('beautyComposer').hidden = true;
  $('beautyReport').hidden = true;
  $('beautyScanning').hidden = false;
  const scanHeading = $('beautyScanning').querySelector('h1');
  scanHeading.tabIndex = -1;
  scanHeading.focus({preventScroll:true});
  scroll.scrollTop = 0;
  $('beautyScanStep').textContent = '识别五官轮廓与比例';
  $('beautyProgressBar').style.width = '0%';
  $('beautyProgressText').textContent = '0%';
  $('beautyProgress').setAttribute('aria-valuenow','0');
  try {
    const readyPhotos = await preparePhotos(score);
    if (token !== generation || page.hidden) return;
    $('beautyScanImage').src = readyPhotos.before;
    if (!scan || motion.matches) { showReport(nextReport,readyPhotos); return; }
    const steps = ['识别五官轮廓与比例','解读眉眼与肌肤表现','规划你的专属妆发方向','整理适合你的美妆单品','你的高光，即将揭晓'];
    const tick = value => {
      if (token !== generation) return;
      $('beautyProgressBar').style.width = value+'%';
      $('beautyProgressText').textContent = value+'%';
      $('beautyProgress').setAttribute('aria-valuenow',String(value));
      $('beautyScanStep').textContent = steps[Math.min(4,Math.floor(value/21))];
      if (value === 100) later(() => showReport(nextReport,readyPhotos),350);
      else later(() => tick(Math.min(100,value+8)),220);
    };
    tick(4);
  } catch (error) {
    if (token !== generation) return;
    resetEntry();
    toast(error.message);
  }
}
function heading(number, title, caption = '') {
  return '<header class="beauty-section-heading"><div><small>'+number+' / YOUR BEAUTY</small><h2>'+title+'</h2></div><span>'+caption+'</span></header>';
}
function productImage(product, more = '') {
  return '<span class="beauty-product-image '+more+'" role="img" aria-label="'+esc(product.name)+'" style="--product-position:'+product.atlasPosition+'"></span>';
}
function productCard(product) {
  return '<article class="beauty-product beauty-product-compact">'+
    '<button type="button" class="beauty-product-link" data-product-detail="'+product.id+'" aria-label="查看'+esc(product.name)+'详情">'+productImage(product)+
    '<span class="beauty-product-copy"><small>'+esc(product.brand)+' · '+esc(product.shade)+'</small><strong>'+esc(product.shortName || product.name)+'</strong><span class="beauty-product-features">'+(product.shortFeatures || product.features.slice(0,2)).map(feature=>'<span>'+esc(feature)+'</span>').join('')+'</span></span>'+
    '<span class="beauty-product-prices"><span class="beauty-price" aria-label="现价'+product.price+'元"><small>¥</small>'+product.price+'</span><del aria-label="原价'+product.originalPrice+'元">¥'+product.originalPrice+'</del></span>'+
    '<span class="beauty-product-reason"><b>推荐理由</b><span>'+esc(product.shortReason || product.reason)+'</span><i aria-hidden="true">↗</i></span></button></article>';
}
function resultCopy(copy) {
  const split=copy.search(/[。！？]/);
  if(split<0 || split===copy.length-1)return '<span class="beauty-copy-body">'+esc(copy)+'</span>';
  return '<strong class="beauty-copy-lead">'+esc(copy.slice(0,split+1))+'</strong><span class="beauty-copy-body">'+esc(copy.slice(split+1))+'</span>';
}
function radar(dimensions) {
  const point = (index, radius) => {
    const angle = index*Math.PI*2/5-Math.PI/2;
    return [120+Math.cos(angle)*radius,116+Math.sin(angle)*radius];
  };
  const palette=['#BBA9FF','#EEADDA','#83DEEC','#A0B7FF','#EFCD9F'];
  const polygon = radius => dimensions.map((_,i) => point(i,radius).join(',')).join(' ');
  const values = dimensions.map((d,i) => point(i,d.score*.76).join(',')).join(' ');
  return '<svg class="beauty-radar" viewBox="0 0 240 230" role="img" aria-label="五官表现五维图">'+
    '<defs><linearGradient id="beautyRadarFill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#A591FF" stop-opacity=".7"/><stop offset=".52" stop-color="#748EFF" stop-opacity=".3"/><stop offset="1" stop-color="#EEB4D6" stop-opacity=".6"/></linearGradient><linearGradient id="beautyRadarStroke" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#BAABFF"/><stop offset=".48" stop-color="#9ADAF5"/><stop offset="1" stop-color="#F0C5DC"/></linearGradient><radialGradient id="beautyRadarAura"><stop stop-color="#AA8CFF" stop-opacity=".24"/><stop offset="1" stop-color="#776BE3" stop-opacity="0"/></radialGradient></defs>'+
    '<circle class="beauty-radar-aura" cx="120" cy="116" r="102" fill="url(#beautyRadarAura)"/>'+
    '<g class="beauty-radar-grid">'+[19,38,57,76].map(r => '<polygon points="'+polygon(r)+'"/>').join('')+
    dimensions.map((_,i) => '<line x1="120" y1="116" x2="'+point(i,76)[0]+'" y2="'+point(i,76)[1]+'"/>').join('')+'</g>'+
    '<polygon class="beauty-radar-value" points="'+values+'"/>'+
    dimensions.map((d,i) => '<circle class="beauty-radar-node" style="--node-color:'+palette[i]+'" cx="'+point(i,d.score*.76)[0]+'" cy="'+point(i,d.score*.76)[1]+'" r="3.4"/><text x="'+point(i,99)[0]+'" y="'+(point(i,99)[1]+4)+'" text-anchor="middle">'+esc(d.label.slice(0,2))+'</text>').join('')+'</svg>';
}
function areaHTML(area,index) {
  const parts = photos.parts[area.id];
  return '<article class="beauty-area is-visible" id="beautyArea-'+area.id+'" role="tabpanel" aria-labelledby="beautyAreaTab-'+area.id+'" data-area="'+area.id+'" '+(area.id===reader.area?'':'hidden')+'><header class="beauty-area-heading"><span>0'+(index+1)+'</span><h3>'+esc(area.title)+'</h3><i aria-hidden="true">'+star+'</i></header>'+
    '<div class="beauty-area-pair"><figure><img draggable="false" loading="lazy" src="'+parts.before+'" alt="'+esc(area.title)+'调整前"><figcaption>原来 · '+esc(area.beforeLabel || '自然状态')+'</figcaption></figure><figure><img draggable="false" loading="lazy" src="'+parts.after+'" alt="'+esc(area.title)+'调整后"><figcaption>之后 · '+esc(area.afterLabel || '精致妆发')+'</figcaption></figure></div>'+
    '<div class="beauty-advice-inline"><p class="beauty-area-summary">'+esc(area.summary || area.after)+'</p><ol class="beauty-inline-steps">'+area.steps.map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol></div>'+
    area.productIds.map(id => productCard(PRODUCTS.find(product => product.id === id))).join('')+'</article>';
}
const areaNames={hair:'发型',brows:'眉形',eyes:'眼妆',skin:'底妆',lips:'唇妆',style:'整体风格'};
function priorityArea(report){return {natural:'brows',fresh:'eyes',radiant:'hair',spotlight:'hair',icon:'style'}[report.tier.id] || 'hair';}
function coverCopy(copy){const end=copy.search(/[。！？]/);return end<0?copy:copy.slice(0,end+1);}
function previewCard(report){
  return '<button type="button" class="beauty-preview-card" id="beautyOpenReport" data-action="open-report" aria-controls="beautyDetail"><span class="beauty-preview-photo"><img draggable="false" src="'+photos.after+'" alt="变美后的你，点击查看完整对比"></span><span class="beauty-preview-copy"><small>你的下一幕</small><strong>'+(report.score>=85?'看看你的封面状态':'看看更出彩的我')+'</strong><span class="beauty-preview-score">'+report.score+' <i aria-hidden="true">→</i> <b>预计 '+report.afterScore+' 分</b></span><span>从'+esc(areaNames[reader.area])+'开始，发现更多可能</span></span><i aria-hidden="true">↗</i></button>';
}
function readerNav(){
  return '<div class="beauty-reader-nav"><header class="beauty-reader-toolbar"><button type="button" data-action="report-back" aria-label="返回颜值结果">‹</button><h2>你的变美报告</h2><button type="button" data-action="poster" aria-label="分享颜值海报">分享</button></header><div class="beauty-reader-tabs" role="tablist" aria-label="报告章节">'+[['overview','更出彩的你','beautyOverview'],['advice','变美思路','beautyAdvice']].map(([id,label,panel])=>'<button type="button" id="beautyTab-'+id+'" role="tab" aria-selected="'+(id==='overview')+'" aria-controls="'+panel+'" tabindex="'+(id==='overview'?'0':'-1')+'" data-report-tab="'+id+'">'+label+'</button>').join('')+'</div></div>';
}
function areaTabs(report){
  return '<div class="beauty-area-tabs" role="tablist" aria-label="选择变美部位">'+report.areas.map(area=>'<button type="button" id="beautyAreaTab-'+area.id+'" role="tab" aria-controls="beautyArea-'+area.id+'" aria-selected="'+(area.id===reader.area)+'" tabindex="'+(area.id===reader.area?'0':'-1')+'" data-area-tab="'+area.id+'"><b>'+esc(areaNames[area.id])+'</b>'+(area.id===priorityArea(report)?'<small>建议先看</small>':'')+'</button>').join('')+'</div>';
}
function readerPositionKey(){return reader.tab==='overview'?'overview':'advice:'+reader.area;}
function clearReader(){
  if(typeof history!=='undefined' && history.state?.beautyReader){const next={...history.state};delete next.beautyReader;history.replaceState(next,'');}
  reader={open:false,visited:false,tab:'overview',area:'hair',coverTop:0,positions:{}};
  readerToken='';readerBackPending=false;swipeStart=null;
  page.classList.remove('is-reading');
}
function openReader(withHistory=true){
  if(!currentReport || reader.open || readerBackPending)return;
  reader.coverTop=scroll.scrollTop;reader.open=true;reader.visited=true;
  $('beautyReport').classList.add('has-read-details');
  stopCelebration();
  $('beautyCover').hidden=true;$('beautyDetail').hidden=false;page.classList.add('is-reading');
  scroll.scrollTop=reader.positions[readerPositionKey()] || 0;
  $('beautyTab-'+reader.tab).focus({preventScroll:true});
  if(withHistory && typeof history!=='undefined')history.pushState({...history.state,beautyReader:readerToken},'');
}
function closeReader(fromHistory=false){
  if(!reader.open)return;
  if(!fromHistory && typeof history!=='undefined' && history.state?.beautyReader===readerToken){
    if(!readerBackPending){readerBackPending=true;history.back();}return;
  }
  reader.positions[readerPositionKey()]=scroll.scrollTop;reader.open=false;swipeStart=null;
  closeSheet(false);$('beautyDetail').hidden=true;$('beautyCover').hidden=false;page.classList.remove('is-reading');
  scroll.scrollTop=reader.coverTop;$('beautyOpenReport').focus({preventScroll:true});
}
function selectChapter(tab,{focus=true,reset=false}={}){
  if(!reader.open || !['overview','advice'].includes(tab))return;
  reader.positions[readerPositionKey()]=scroll.scrollTop;
  reader.tab=tab;
  for(const id of ['overview','advice']){
    const active=id===tab,control=$('beautyTab-'+id);
    control.setAttribute('aria-selected',String(active));control.tabIndex=active?0:-1;
    $(id==='overview'?'beautyOverview':'beautyAdvice').hidden=!active;
  }
  scroll.scrollTop=reset?0:reader.positions[readerPositionKey()] || 0;
  $('beautyReaderProgress').textContent=(tab==='overview'?'01':'02')+' / 02 · 左右滑动切换章节';
  if(focus)$('beautyTab-'+tab).focus({preventScroll:true});
}
function selectArea(id,{focus=true}={}){
  if(!reader.open || reader.tab!=='advice' || !currentReport.areas.some(area=>area.id===id))return;
  reader.positions[readerPositionKey()]=scroll.scrollTop;reader.area=id;
  for(const area of currentReport.areas){
    const active=area.id===id,control=$('beautyAreaTab-'+area.id);
    control.setAttribute('aria-selected',String(active));control.tabIndex=active?0:-1;
    $('beautyArea-'+area.id).hidden=!active;
  }
  scroll.scrollTop=reader.positions[readerPositionKey()] || 0;
  if(focus)$('beautyAreaTab-'+id).focus({preventScroll:true});
}
function showReport(report,readyPhotos,{celebrate=true}={}) {
  if (page.hidden) return;
  clearReader();
  readerToken='beauty-'+(++readerSequence);
  reader.area=priorityArea(report);
  currentReport = report;
  photos = readyPhotos;
  posterCache = null;
  const tierIndex = TIERS.findIndex(tier => tier.id === report.tier.id);
  const sparkleCount = [4,8,14,26,42][tierIndex];
  const honorCaption = report.tier.name;
  const sparks = Array.from({length:sparkleCount},(_,i) => '<i style="--x:'+((i*37+7)%100)+'%;--y:'+((i*23+8)%96)+'%;--wait:'+(i%11)*.37+'s;--life:'+(3+i%5)+'s"></i>').join('');
  $('beautyScanning').hidden = true;
  $('beautyEntry').hidden = true;
  const container = $('beautyReport');
  container.hidden = false;
  container.dataset.tier = report.tier.id;
  container.classList.remove('has-scrolled','has-read-details');
  container.innerHTML =
    '<div id="beautyCover"><div class="beauty-report-intro"><span>你的专属颜值档案</span><small>BEAUTY / '+ranks[tierIndex]+'</small></div>'+
    '<section class="beauty-result-hero" aria-label="当前颜值 '+report.score+' 分，'+report.tier.name+'">'+
      '<div class="beauty-hero-grid" aria-hidden="true"></div><div class="beauty-aurora" aria-hidden="true"><i></i><i></i><i></i></div><div class="beauty-reveal-halo" aria-hidden="true"></div>'+
      '<div class="beauty-sparkles" aria-hidden="true">'+sparks+'</div><div class="beauty-coronation" aria-label="'+report.tier.name+'等级徽章">'+(tierIndex===4?crown:star)+'</div>'+
      '<div class="beauty-portrait-stage"><div class="beauty-portrait-orbits" aria-hidden="true"><i></i><i></i><i></i></div><div class="beauty-portrait-window"><img draggable="false" class="beauty-hero-photo" src="'+photos.before+'" alt="你的当前照片"></div><span class="beauty-portrait-seal">'+honorCaption+'</span></div>'+
      '<div class="beauty-hero-content"><div class="beauty-title-group"><h1 tabindex="-1">'+esc(report.title)+'</h1></div><div class="beauty-score-row"><span class="beauty-score-caption">综合<br>颜值</span><div class="beauty-score-value"><strong data-count="'+report.score+'">'+report.score+'</strong><small>/ 100</small></div>'+star+'</div>'+
      '<div class="beauty-percentile"><span>超过 <b data-count="'+report.percentile+'">'+report.percentile+'</b><b>%</b> 的人</span><i aria-hidden="true"><span style="width:'+report.percentile+'%"></span></i></div></div>'+
      '<p class="beauty-result-copy"><strong class="beauty-copy-lead">'+esc(coverCopy(report.copy))+'</strong></p>'+
      '<div class="beauty-hero-bottom-glow" aria-hidden="true"></div></section>'+
    previewCard(report)+
    '<button type="button" class="beauty-cover-share" data-action="poster">'+star+'分享我的颜值海报</button></div>'+
    '<div id="beautyDetail" class="beauty-reader" hidden>'+readerNav()+
    '<section class="beauty-section beauty-overview is-visible" id="beautyOverview" role="tabpanel" aria-labelledby="beautyTab-overview">'+heading('01','更出彩的你','从现在，到更上镜')+
      '<div class="beauty-comparison"><div class="beauty-compare-grid">'+
      '<figure class="beauty-compare-before"><div class="beauty-compare-photo"><img draggable="false" id="beautyBefore" src="'+photos.before+'" alt="现在的照片"><span>现在的你</span></div></figure>'+
      '<figure class="beauty-compare-after"><div class="beauty-compare-photo"><img draggable="false" id="beautyAfter" src="'+photos.after+'" alt="变美后的照片"><span>'+star+'变美后的你</span></div></figure></div>'+
      '<div class="beauty-compare-transition" aria-label="预计增加 '+(report.afterScore-report.score)+' 分"><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></i><span>预计增加 <b>'+(report.afterScore-report.score)+'</b> 分</span></div>'+
      '<div class="beauty-compare-scores"><div><div class="beauty-compare-score"><strong>'+report.score+'<small>分</small></strong><span>'+report.tier.name+'</span></div><p>超过 <b>'+report.percentile+'%</b> 的人</p></div>'+
      '<div><div class="beauty-compare-score"><strong>'+report.afterScore+'<small>分</small></strong><span>'+report.afterTier.name+'</span></div><p>超过 <b>'+report.afterPercentile+'%</b> 的人</p></div></div></div>'+
      '<div class="beauty-features-heading"><h3>五官表现</h3><span>你的优势，逐一看清</span></div>'+
      '<div class="beauty-radar-wrap">'+radar(report.dimensions)+'<div class="beauty-dimensions">'+report.dimensions.map((d,index) => '<div class="beauty-dimension" data-dimension="'+index+'"><span>'+esc(d.label)+'</span><b>'+d.score+'</b><i><span style="width:'+d.score+'%"></span></i></div>').join('')+'</div></div>'+
      '<div class="beauty-insights"><div class="beauty-insight beauty-insight-strength"><small><i aria-hidden="true">'+star+'</i>你的优势</small><p>'+esc(report.strength)+'</p></div><div class="beauty-insight beauty-insight-focus"><small><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m5 18 6-6m-3-5 3-3m4 4 3-3m-4 9 6-6M5 21l-2-2 9-9 2 2Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></i>优先调整</small><p>'+esc(report.focus)+'</p></div></div><p class="beauty-reader-copy">'+resultCopy(report.copy)+'</p><button type="button" class="beauty-next-chapter" data-action="read-advice"><span><strong>从'+esc(areaNames[reader.area])+'开始，看看具体怎么做</strong><small>前后变化 · 三步建议 · 适合你的单品</small></span><i aria-hidden="true">→</i></button></section>'+
    '<section class="beauty-advice-panel" id="beautyAdvice" role="tabpanel" aria-labelledby="beautyTab-advice" hidden><div class="beauty-advice-intro"><h2>你的变美思路</h2><p>选一个部位，照着做就很好看。</p></div>'+areaTabs(report)+report.areas.map(areaHTML).join('')+'</section>'+
    '<p class="beauty-reader-progress" id="beautyReaderProgress" aria-live="polite">01 / 02 · 左右滑动切换章节</p></div>' ;
  scroll.scrollTop = 0;
  animateReport(celebrate);
  container.querySelector('h1').focus({preventScroll:true});
}
function countTo(el,value) {
  if (motion.matches) { el.textContent=String(value); return; }
  let started = null;
  const tick = time => {
    if (started === null) started = time;
    const t = Math.min(1,(time-started)/1200);
    const number = value*(1-Math.pow(1-t,3));
    el.textContent = t===1 ? String(value) : Number.isInteger(value) ? String(Math.round(number)) : number.toFixed(1);
    if (t<1) {
      const id=requestAnimationFrame(now => { frames.delete(id); tick(now); });
      frames.add(id);
    }
  };
  const id=requestAnimationFrame(time => { frames.delete(id); tick(time); });
  frames.add(id);
}
function animateReport(celebrate=true) {
  $('beautyReport').querySelectorAll('[data-count]').forEach(el => countTo(el,Number(el.dataset.count)));
  if(celebrate && !motion.matches) later(()=>{
    if(page.hidden || reader.visited || !currentReport || scroll.scrollTop>60)return;
    stopCelebration=startBeautyCelebration({host:$('beautyReport').querySelector('.beauty-result-hero'),score:currentReport.score,reducedMotion:motion.matches});
  },1200);
}
function cycleCopy() {
  if(!currentReport || !photos)return;
  const readyPhotos=photos;
  const score=currentReport.score;
  copyVariant=(currentReport.copyVariant+1)%5;
  closeSheet(false);cancelPresentation();
  showReport(createReport(score,copyVariant),readyPhotos,{celebrate:false});
  toast('换了一条，看看这句怎么样');
}
function openSheet(title,body,kind) {
  if ($('beautyOverlay').hidden) sheetFocus=document.activeElement;
  overlayGeneration++;
  modalKind=kind;
  $('beautySheetTitle').textContent=title;
  $('beautySheetBody').innerHTML=body;
  $('beautyOverlay').hidden=false;
  inert(scroll,true);
  inert(document.querySelector('.beauty-header'),true);
  inert($('beautyComposer'),true);
  $('beautySheet').scrollTop=0;
  $('beautySheet').querySelector('[data-beauty-close]').focus({preventScroll:true});
}
function closeSheet(restore=true) {
  overlayGeneration++;
  modalKind='';
  $('beautyOverlay').hidden=true;
  inert(scroll,false);
  inert(document.querySelector('.beauty-header'),false);
  inert($('beautyComposer'),false);
  if(posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
  posterPreviewUrl='';
  if(restore && sheetFocus?.isConnected) sheetFocus.focus({preventScroll:true});
}
function menuSheet() {
  openSheet('AI 鉴颜值','<nav class="beauty-menu-list" aria-label="鉴颜值导航"><button type="button" data-action="new">开启新的颜值解析 <span>↗</span></button><button type="button" data-action="scenes" id="beautyScenes">场景切换 <span>↗</span></button><button type="button" data-action="replay">重播揭晓动画 <span>↻</span></button><button type="button" data-action="home" id="beautyBack">返回鉴X首页 <span>↗</span></button></nav>','menu');
}
async function uploadSheet() {
  const prompt=$('beautyPrompt').value.trim();
  openSheet('开启你的颜值解析','<p class="beauty-sheet-description">'+(prompt?'想尝试：'+esc(prompt)+'<br>':'')+'选择清晰正面照，让五官自然呈现。</p><button type="button" class="beauty-primary" data-action="choose-photo">从相册选择照片</button><div class="beauty-upload-preset"><div class="beauty-preset-image" aria-busy="true">'+star+'<img draggable="false" id="beautyPresetPhoto" alt="已选正面照片" hidden></div><div><strong>从这张照片开始</strong><small>发现妆发带来的改变</small><button type="button" id="beautyPresetStart" data-action="use-photo" disabled>正在读取照片</button></div></div>','upload');
  const token=overlayGeneration;
  try{
    const pair=await fixture(3);
    if(token!==overlayGeneration)return;
    $('beautyPresetPhoto').src=pair.before;
    $('beautyPresetPhoto').hidden=false;
    $('beautyPresetPhoto').parentElement.setAttribute('aria-busy','false');
    $('beautyPresetStart').disabled=false;
    $('beautyPresetStart').textContent='解析这张照片 ↗';
  }catch{if(token===overlayGeneration)$('beautyPresetStart').textContent='照片暂不可用';}
}
function sceneSheet() {
  const list=TIERS.map(tier => '<button type="button" class="beauty-scene-option" style="--scene-accent:'+tier.accent+'" data-score="'+tier.sampleScore+'" aria-pressed="'+(currentReport?.tier.id===tier.id)+'"><b>'+tier.sampleScore+'</b><span><strong>'+tier.name+'</strong><small>'+tier.min+'–'+tier.max+' 分</small></span><i>↗</i></button>').join('');
  openSheet('场景切换','<p class="beauty-sheet-description">选择一个分数，查看对应的颜值报告与高光时刻。</p><div class="beauty-scene-list">'+list+'</div>'+
    '<form id="beautyCustomScore" class="beauty-custom-score"><label for="beautyScoreInput">指定分数</label><input id="beautyScoreInput" type="number" min="0" max="100" step="1" required value="'+selectedScore+'"><button type="submit">查看结果</button></form>'+
    '<div class="beauty-scene-tools"><button type="button" class="beauty-inline-button" data-action="replay">重播揭晓动画</button><button type="button" class="beauty-inline-button" data-action="copy-next" '+(currentReport?'':'disabled')+'>换条评价</button><button type="button" class="beauty-inline-button" data-action="poster" '+(currentReport?'':'disabled')+'>预览本档海报</button></div>','scenes');
}
function detailSheet(product) {
  openSheet('为你甄选', productImage(product,'beauty-detail-image')+
    '<div class="beauty-detail-title"><h3>'+esc(product.name)+'</h3><p>'+esc(product.brand)+' · '+esc(product.shade)+'</p></div>'+
    '<div class="beauty-detail-block"><h4>推荐理由</h4><p>'+esc(product.reason)+'</p></div>'+
    '<div class="beauty-detail-block"><h4>产品特点</h4><p>'+product.features.map(esc).join(' · ')+'</p></div>'+
    '<div class="beauty-detail-block"><h4>这样用，更适合你</h4><p>'+esc(product.usage)+'</p></div>'+
    '<div class="beauty-detail-footer"><span class="beauty-price"><small>¥</small>'+product.price+'</span><button type="button" class="beauty-primary" data-product-buy="'+product.id+'">立即购买</button></div>','product');
}
function orderSheet(product) {
  order.product=product;order.submitted=false;
  openSheet('确认订单','<div class="beauty-product-top">'+productImage(product)+'<div><h4>'+esc(product.name)+'</h4><p>'+esc(product.shade)+'</p><span class="beauty-price"><small>¥</small>'+product.price+'</span></div></div>'+
    '<form id="beautyOrderForm"><div class="beauty-order-fields"><div class="beauty-order-row"><label for="beautyQuantity">购买数量</label><input id="beautyQuantity" name="quantity" type="number" min="1" max="9" step="1" value="1" required></div>'+
    '<label>收货人<input name="name" autocomplete="name" placeholder="请输入姓名" required maxlength="30"></label>'+
    '<label>手机号码<input name="mobile" autocomplete="tel" inputmode="tel" placeholder="请输入手机号码" pattern="1[3-9][0-9]{9}" maxlength="11" required></label>'+
    '<label>收货地址<textarea name="address" autocomplete="street-address" rows="2" placeholder="省市区、街道与详细门牌号" minlength="8" maxlength="120" required></textarea></label></div>'+
    '<p class="beauty-form-error" id="beautyOrderError" role="alert" hidden></p><button type="submit" class="beauty-primary" id="beautySubmitOrder">提交订单 · ¥'+product.price+'</button></form>','order');
}
async function posterSheet() {
  if(!currentReport||!photos) return;
  const report=currentReport;
  const imagePair=photos;
  openSheet('你的专属高光海报','<p class="beauty-sheet-description">正在为你定格高光时刻…</p>','poster');
  const token=overlayGeneration;
  const task=posterCache || renderBeautyPoster({report,beforeSrc:imagePair.before,afterSrc:imagePair.after,parts:imagePair.parts});
  posterCache=task;
  try {
    const {blob}=await task;
    if(token!==overlayGeneration || currentReport!==report || page.hidden) return;
    posterPreviewUrl=URL.createObjectURL(blob);
    $('beautySheetBody').innerHTML='<img draggable="false" class="beauty-poster-image" src="'+posterPreviewUrl+'" alt="'+esc(report.title)+' · '+report.score+' 分分享海报">'+
      '<button type="button" class="beauty-primary" data-action="download">下载海报，分享高光</button><p class="beauty-poster-status" id="beautyPosterStatus" role="status">已为你生成专属海报</p>';
  }catch(error){
    if(posterCache===task)posterCache=null;
    if(token!==overlayGeneration)return;
    $('beautySheetBody').innerHTML='<p class="beauty-sheet-description">'+esc(error.message)+'</p><button type="button" class="beauty-primary" data-action="poster">重新生成海报</button>';
  }
}
async function downloadPoster() {
  if(!posterCache || !currentReport)return;
  const report=currentReport;
  try {
    const {blob}=await posterCache;
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='鉴颜值-'+report.title+'-'+report.score+'分.png';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    if($('beautyPosterStatus'))$('beautyPosterStatus').textContent='已发起海报下载，可在下载列表查看并分享。';
  }catch{toast('海报保存失败，请重新生成后再试');}
}
page.addEventListener('click',event=>{
  const target=event.target.closest('button');
  if(!target)return;
  if(target.hasAttribute('data-beauty-close'))return closeSheet();
  if(target.dataset.reportTab)return selectChapter(target.dataset.reportTab);
  if(target.dataset.areaTab)return selectArea(target.dataset.areaTab);
  if(target.dataset.score){copyVariant=0;clearUpload();return start(Number(target.dataset.score),false);}
  const productId=target.dataset.productDetail||target.dataset.productBuy;
  if(productId){
    const product=PRODUCTS.find(item=>item.id===productId);
    if(product)return target.dataset.productBuy?orderSheet(product):detailSheet(product);
  }
  switch(target.dataset.action){
    case 'open-report':return openReader();
    case 'report-back':return closeReader();
    case 'read-advice':
      selectChapter('advice');
      selectArea(priorityArea(currentReport),{focus:false});
      scroll.scrollTop=0;return;
    case 'home':return close();
    case 'new':clearUpload();return resetEntry();
    case 'scenes':return sceneSheet();
    case 'choose-photo':return $('beautyPhotoInput').click();
    case 'use-photo':clearUpload();return start(90);
    case 'copy-next':return cycleCopy();
    case 'poster':return posterSheet();
    case 'download':return downloadPoster();
    case 'restart':clearUpload();return resetEntry();
    case 'replay':return start(selectedScore,false);
    case 'continue':return closeSheet();
  }
});
page.addEventListener('input',event=>{
  if(event.target.id==='beautyQuantity'&&order.product){
    const quantity=Number(event.target.value);
    $('beautySubmitOrder').textContent=Number.isInteger(quantity)&&quantity>=1&&quantity<=9?'提交订单 · ¥'+(quantity*order.product.price):'提交订单';
  }
});
page.addEventListener('submit',event=>{
  if(event.target.id==='beautyCustomScore'){
    event.preventDefault();
    const score=Number($('beautyScoreInput').value);
    try{createReport(score);}catch{return toast('请输入 0–100 的整数分数');}
    copyVariant=0;clearUpload();start(score,false);
  }
  if(event.target.id==='beautyOrderForm'){
    event.preventDefault();
    if(order.submitted||!order.product)return;
    const data=new FormData(event.target);
    const name=String(data.get('name')||'').trim();
    const mobile=String(data.get('mobile')||'').trim();
    const address=String(data.get('address')||'').trim();
    const quantity=Number(data.get('quantity'));
    if(!name||!/^1[3-9]\d{9}$/.test(mobile)||address.length<8||!Number.isInteger(quantity)||quantity<1||quantity>9){
      $('beautyOrderError').textContent='请填写完整的收货信息与正确的购买数量。';$('beautyOrderError').hidden=false;return;
    }
    order.submitted=true;
    openSheet('订单详情','<div class="beauty-order-success">'+star+'<h3>下单成功</h3><p>'+esc(order.product.name)+' × '+quantity+'<br>订单金额 ¥'+quantity*order.product.price+'</p><p>收货人 '+esc(name.slice(0,1))+'**<br>'+mobile.slice(0,3)+'****'+mobile.slice(-4)+'</p><button type="button" class="beauty-primary" data-action="continue">继续查看我的变美方案</button></div>','success');
  }
});
scroll.addEventListener('scroll',()=>{
  const moved=scroll.scrollTop>40;
  if(moved)stopCelebration();
},{passive:true});
$('beautyMenu').addEventListener('click',menuSheet);
$('beautyUpload').addEventListener('click',uploadSheet);
$('beautyComposerUpload').addEventListener('click',uploadSheet);
$('beautyComposerSkill').addEventListener('click',uploadSheet);
$('beautyComposerSend').addEventListener('click',uploadSheet);
$('beautyPrompt').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();uploadSheet();}});
$('beautyCancel').addEventListener('click',resetEntry);
$('beautyPhotoInput').addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  event.target.value='';
  if(!file)return;
  if(!file.type.startsWith('image/'))return toast('请选择图片文件');
  if(file.size>12*1024*1024)return toast('请选择 12MB 以内的照片');
  clearUpload();uploadedUrl=URL.createObjectURL(file);
  start(selectedScore);
});
document.addEventListener('keydown',event=>{
  if(page.hidden)return;
  if(event.key==='Escape'){
    event.preventDefault();
    if(!$('beautyOverlay').hidden)closeSheet();
    else if(reader.open)closeReader();
    else if(!$('beautyScanning').hidden)resetEntry();
    else close();
    return;
  }
  if(reader.open && $('beautyOverlay').hidden && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    const target=event.target;
    const chapter=target?.dataset?.reportTab,area=target?.dataset?.areaTab;
    if(chapter || area){
      event.preventDefault();
      const ids=chapter?['overview','advice']:currentReport.areas.map(item=>item.id);
      const index=ids.indexOf(chapter || area);
      const next=event.key==='Home'?0:event.key==='End'?ids.length-1:(index+(event.key==='ArrowRight'?1:-1)+ids.length)%ids.length;
      if(chapter)selectChapter(ids[next]);else selectArea(ids[next]);
      return;
    }
  }
  if(event.key!=='Tab')return;
  const root=$('beautyOverlay').hidden?page:$('beautySheet');
  const controls=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type=file]),textarea')].filter(el=>!el.closest('[hidden],[inert]')&&el.getClientRects().length);
  if(!controls.length)return;
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
motion.addEventListener('change',()=>{
  if(!page.hidden&&!$('beautyReport').hidden&&currentReport){cancelPresentation();$('beautyReport').querySelectorAll('[data-count]').forEach(el=>{el.textContent=el.dataset.count;});}
});
// One horizontal gesture layer for chapters; area selection remains tap-only.
page.addEventListener('pointerdown',event=>{
  swipeStart=null;
  if(!reader.open || !$('beautyOverlay').hidden || event.isPrimary===false || (event.pointerType==='mouse' && event.button!==0))return;
  if(!event.target.closest('#beautyDetail') || event.target.closest('button,input,textarea,a'))return;
  const bounds=page.getBoundingClientRect();
  if(event.clientX-bounds.left<24 || bounds.right-event.clientX<24)return;
  swipeStart={id:event.pointerId,x:event.clientX,y:event.clientY,time:Date.now(),scrollTop:scroll.scrollTop};
});
page.addEventListener('pointercancel',()=>{swipeStart=null;});
page.addEventListener('pointerup',event=>{
  const start=swipeStart;swipeStart=null;
  if(!start || event.pointerId!==start.id || !reader.open || !$('beautyOverlay').hidden)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(Math.abs(dx)<64 || Math.abs(dx)<Math.abs(dy)*1.6 || Math.abs(scroll.scrollTop-start.scrollTop)>20 || Date.now()-start.time>900)return;
  if(dx<0 && reader.tab==='overview')selectChapter('advice',{focus:false});
  else if(dx>0 && reader.tab==='advice')selectChapter('overview',{focus:false});
});
window.addEventListener?.('popstate',event=>{
  if(page.hidden || !currentReport)return;
  if(reader.open || readerBackPending || event.state?.beautyReader===readerToken){
    event.stopImmediatePropagation?.();readerBackPending=false;
    if(reader.open && !$('beautyOverlay').hidden && event.state?.beautyReader!==readerToken){
      closeSheet();
      history.pushState({...event.state,beautyReader:readerToken},'');
      return;
    }
    if(event.state?.beautyReader===readerToken)openReader(false);else closeReader(true);
  }
},{capture:true});
window.beautyExperience={open,close};
// The query opens only the development scene selector; it never changes exported posters.
if(new URLSearchParams(location.search).get('beauty')==='scenes'){open();sceneSheet();}
