import { TIERS, PRODUCTS, createReport } from './beauty-model.js';
import { renderBeautyPoster } from './beauty-poster.js';

const $ = id => document.getElementById(id);
const page = $('beautyPage');
const scroll = $('beautyScroll');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const star = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 3 3.1 9.9L29 16l-9.9 3.1L16 29l-3.1-9.9L3 16l9.9-3.1Z" stroke="currentColor" stroke-width="1.2"/><path d="m16 9 1.7 5.3L23 16l-5.3 1.7L16 23l-1.7-5.3L9 16l5.3-1.7Z" fill="currentColor"/></svg>';
const ranks = ['I', 'II', 'III', 'IV', 'V'];
const regions = { hair:[0,0,1,.7], brows:[.23,.255,.56,.13], eyes:[.22,.30,.56,.17], skin:[.29,.39,.45,.23], lips:[.35,.485,.32,.13], style:[.06,.16,.88,.84] };
let selectedScore = 90;
let currentReport = null;
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
  const token = generation;
  fixture(3).then(pair => {
    if (generation === token) $('beautyEntryPhoto').src = pair.before;
  }).catch(() => {});
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
  $('beautyBack').focus({preventScroll:true});
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
  closeSheet(false);
  cancelPresentation();
  const token = generation;
  selectedScore = score;
  currentReport = null;
  photos = null;
  posterCache = null;
  const nextReport = createReport(score);
  $('beautyEntry').hidden = true;
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
  return '<article class="beauty-product">'+
    '<div class="beauty-product-top">'+productImage(product)+'<div><small>'+esc(product.brand)+' · 为你甄选</small><h4>'+esc(product.name)+'</h4><p>'+esc(product.shade)+'</p></div></div>'+
    '<p class="beauty-product-reason"><b>为什么适合你</b>'+esc(product.reason)+'</p>'+
    '<div class="beauty-product-features">'+product.features.map(feature => '<span>'+esc(feature)+'</span>').join('')+'</div>'+
    '<div class="beauty-product-footer"><span class="beauty-price"><small>¥</small>'+product.price+'</span><div class="beauty-product-actions"><button type="button" data-product-detail="'+product.id+'">查看详情</button><button type="button" class="beauty-buy" data-product-buy="'+product.id+'">立即购买</button></div></div></article>';
}
function radar(dimensions) {
  const point = (index, radius) => {
    const angle = index*Math.PI*2/5-Math.PI/2;
    return [100+Math.cos(angle)*radius,100+Math.sin(angle)*radius];
  };
  const polygon = radius => dimensions.map((_,i) => point(i,radius).join(',')).join(' ');
  const values = dimensions.map((d,i) => point(i,Math.max(2,d.score*.7)).join(',')).join(' ');
  return '<svg class="beauty-radar" viewBox="0 0 200 200" role="img" aria-label="五官表现五维图">'+
    [17.5,35,52.5,70].map(r => '<polygon points="'+polygon(r)+'"/>').join('')+
    dimensions.map((_,i) => '<line x1="100" y1="100" x2="'+point(i,70)[0]+'" y2="'+point(i,70)[1]+'"/>').join('')+
    '<polygon class="beauty-radar-value" points="'+values+'"/>'+
    dimensions.map((d,i) => '<circle cx="'+point(i,Math.max(2,d.score*.7))[0]+'" cy="'+point(i,Math.max(2,d.score*.7))[1]+'" r="2.5"/><text x="'+point(i,86)[0]+'" y="'+(point(i,86)[1]+3)+'" text-anchor="middle">'+esc(d.label.slice(0,2))+'</text>').join('')+'</svg>';
}
function areaHTML(area,index) {
  const parts = photos.parts[area.id];
  return '<article class="beauty-area beauty-reveal" data-area="'+area.id+'" data-reveal><header class="beauty-area-heading"><span>0'+(index+1)+'</span><div><h3>'+esc(area.title)+'</h3><small>保留你的特点，细化每一处光彩</small></div></header>'+
    '<div class="beauty-area-pair"><figure><img loading="lazy" src="'+parts.before+'" alt="'+esc(area.title)+'调整前"><figcaption>现在的你</figcaption></figure><figure><img loading="lazy" src="'+parts.after+'" alt="'+esc(area.title)+'调整后"><figcaption>变美后的你</figcaption></figure></div>'+
    '<div class="beauty-change-labels"><p>'+esc(area.before)+'</p><p>'+esc(area.after)+'</p></div><p class="beauty-area-reason">'+esc(area.reason)+'</p>'+
    '<ol class="beauty-steps">'+area.steps.map(step => '<li>'+esc(step)+'</li>').join('')+'</ol>'+
    area.productIds.map(id => productCard(PRODUCTS.find(product => product.id === id))).join('')+'</article>';
}
function showReport(report,readyPhotos) {
  if (page.hidden) return;
  currentReport = report;
  photos = readyPhotos;
  posterCache = null;
  const tierIndex = TIERS.findIndex(tier => tier.id === report.tier.id);
  const sparkleCount = [0,0,8,20,30][tierIndex];
  const honorCaption = tierIndex >= 3 ? 'TOP '+Number((100-report.percentile).toFixed(1))+'%' : 'YOUR MOMENT';
  const sparks = Array.from({length:sparkleCount},(_,i) => '<i style="--x:'+((i*37+7)%100)+'%;--y:'+((i*23+18)%88)+'%;--wait:'+(0.7+(i%9)*.09)+'s"></i>').join('');
  $('beautyScanning').hidden = true;
  $('beautyEntry').hidden = true;
  const container = $('beautyReport');
  container.hidden = false;
  container.dataset.tier = report.tier.id;
  container.innerHTML =
    '<div class="beauty-report-intro"><span>你的专属颜值档案</span><small>BEAUTY / '+ranks[tierIndex]+'</small></div>'+
    '<section class="beauty-result-hero" aria-label="当前颜值 '+report.score+' 分，'+report.tier.name+'">'+
      '<img class="beauty-hero-photo" src="'+photos.before+'" alt="你的当前照片"><div class="beauty-hero-shade"></div><div class="beauty-aurora" aria-hidden="true"></div>'+
      '<span class="beauty-hero-label"><i></i>此刻的你，独一无二</span><div class="beauty-emblem" aria-label="'+report.tier.name+'等级徽章">'+star+'<small>'+ranks[tierIndex]+'</small></div>'+
      '<div class="beauty-light-arcs" aria-hidden="true"></div><div class="beauty-sparkles" aria-hidden="true">'+sparks+'</div>'+
      '<div class="beauty-hero-content"><span class="beauty-score-caption">综合颜值</span><div class="beauty-score-row"><div class="beauty-score-value"><strong data-count="'+report.score+'">'+report.score+'</strong><small>/ 100</small></div><div class="beauty-title-group"><h1 tabindex="-1">'+report.tier.name+'</h1><p>'+honorCaption+'</p></div></div>'+
      '<div class="beauty-percentile"><span>超过 <b data-count="'+report.percentile+'">'+report.percentile+'</b><b>%</b> 的人</span><i aria-hidden="true"><span style="width:'+report.percentile+'%"></span></i></div></div></section>'+
    '<p class="beauty-result-copy beauty-reveal" data-reveal>'+esc(report.copy)+'</p>'+
    '<section class="beauty-section beauty-reveal" data-reveal>'+heading('01','更出彩的你','让改变，看得见')+
      '<div class="beauty-compare-grid"><figure><div class="beauty-compare-photo"><img id="beautyBefore" src="'+photos.before+'" alt="现在的照片"><span>现在的你</span></div><figcaption><strong>'+report.score+'<small>分</small></strong><span>'+report.tier.name+'</span></figcaption><p>超过 '+report.percentile+'% 的人</p></figure>'+
      '<figure><div class="beauty-compare-photo"><img id="beautyAfter" src="'+photos.after+'" alt="变美后的照片"><span>变美后的你</span></div><figcaption><strong>'+report.afterScore+'<small>分</small></strong><span>'+report.afterTier.name+'</span></figcaption><p>超过 '+report.afterPercentile+'% 的人</p></figure></div>'+
      '<div class="beauty-lift-line"><span>颜值提升 <b>+'+(report.afterScore-report.score)+'</b> 分</span><button type="button" class="beauty-inline-button" data-action="compare">放大对比 ↗</button></div></section>'+
    '<section class="beauty-section beauty-reveal" data-reveal>'+heading('02','你的五官表现','找到专属优势')+
      '<div class="beauty-radar-wrap">'+radar(report.dimensions)+'<div>'+report.dimensions.map(d => '<div class="beauty-dimension"><span>'+esc(d.label)+'</span><b>'+d.score+'</b><i><span style="width:'+d.score+'%"></span></i></div>').join('')+'</div></div>'+
      '<div class="beauty-insights"><div><small>你的优势</small><p>'+esc(report.strength)+'</p></div><div><small>优先调整</small><p>'+esc(report.focus)+'</p></div></div></section>'+
    '<section class="beauty-section">'+heading('03','变美思路 · 按部位拆解','6 个方向')+'<p class="beauty-areas-intro">从细节开始，让每一处改变都有依据。<br>按你的五官特点，找到适合的妆发与单品。</p>'+report.areas.map(areaHTML).join('')+'</section>'+
    '<section class="beauty-share-panel beauty-reveal" data-reveal>'+star+'<h2>把高光，留给此刻</h2><p>'+esc(report.tier.name)+' · '+report.score+' 分<br>记录你的独特，也分享你的光彩。</p>'+
      '<button type="button" class="beauty-primary" id="beautyPoster" data-action="poster">'+report.tier.share+'</button><small>生成专属海报 · 保存后即可分享</small></section>'+
    '<button type="button" class="beauty-text-button" data-action="restart">换张照片，发现另一面的你</button><p class="beauty-report-footer">图灵鉴X · 每一种美，都有自己的表达</p>';
  scroll.scrollTop = 0;
  animateReport();
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
function animateReport() {
  observer?.disconnect();
  const reveals=[...$('beautyReport').querySelectorAll('[data-reveal]')];
  if (motion.matches) reveals.forEach(el => { el.classList.add('is-visible'); inert(el,false); });
  else {
    observer=new IntersectionObserver(entries => {
      for (const entry of entries) if(entry.isIntersecting) {
        const el=entry.target;
        el.classList.add('is-visible');
        inert(el,false);
        observer.unobserve(el);
      }
    },{root:scroll,threshold:.07,rootMargin:'0px 0px -12px 0px'});
    reveals.forEach(el => { inert(el,true); observer.observe(el); });
  }
  $('beautyReport').querySelectorAll('[data-count]').forEach(el => countTo(el,Number(el.dataset.count)));
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
  $('beautySheet').scrollTop=0;
  $('beautySheet').querySelector('[data-beauty-close]').focus({preventScroll:true});
}
function closeSheet(restore=true) {
  overlayGeneration++;
  modalKind='';
  $('beautyOverlay').hidden=true;
  inert(scroll,false);
  inert(document.querySelector('.beauty-header'),false);
  if(posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
  posterPreviewUrl='';
  if(restore && sheetFocus?.isConnected) sheetFocus.focus({preventScroll:true});
}
function sceneSheet() {
  const list=TIERS.map(tier => '<button type="button" class="beauty-scene-option" style="--scene-accent:'+tier.accent+'" data-score="'+tier.sampleScore+'" aria-pressed="'+(currentReport?.tier.id===tier.id)+'"><b>'+tier.sampleScore+'</b><span><strong>'+tier.name+'</strong><small>'+tier.min+'–'+tier.max+' 分</small></span><i>↗</i></button>').join('');
  openSheet('场景切换','<p class="beauty-sheet-description">选择一个分数，查看对应的颜值报告与高光时刻。</p><div class="beauty-scene-list">'+list+'</div>'+
    '<form id="beautyCustomScore" class="beauty-custom-score"><label for="beautyScoreInput">指定分数</label><input id="beautyScoreInput" type="number" min="0" max="100" step="1" required value="'+selectedScore+'"><button type="submit">查看结果</button></form>'+
    '<div class="beauty-scene-tools"><button type="button" class="beauty-inline-button" data-action="replay">重播揭晓动画</button><button type="button" class="beauty-inline-button" data-action="poster" '+(currentReport?'':'disabled')+'>预览本档海报</button></div>','scenes');
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
function compareSheet() {
  openSheet('看看你的改变','<div class="beauty-comparison-view" id="beautyCompareView"><img src="'+photos.before+'" alt="现在的你"><img class="beauty-swipe-after" src="'+photos.after+'" alt="变美后的你"><i></i></div>'+
    '<input class="beauty-compare-range" id="beautyCompareRange" type="range" min="0" max="100" value="50" aria-label="前后照片对比位置"><div class="beauty-compare-legend"><span>现在 · '+currentReport.score+' 分</span><span>变美后 · '+currentReport.afterScore+' 分</span></div>','compare');
}
async function posterSheet() {
  if(!currentReport||!photos) return;
  const report=currentReport;
  const imagePair=photos;
  openSheet('你的专属高光海报','<p class="beauty-sheet-description">正在为你定格高光时刻…</p>','poster');
  const token=overlayGeneration;
  const task=posterCache || renderBeautyPoster({report,beforeSrc:imagePair.before,afterSrc:imagePair.after});
  posterCache=task;
  try {
    const {blob}=await task;
    if(token!==overlayGeneration || currentReport!==report || page.hidden) return;
    posterPreviewUrl=URL.createObjectURL(blob);
    $('beautySheetBody').innerHTML='<img class="beauty-poster-image" src="'+posterPreviewUrl+'" alt="'+report.tier.name+' · '+report.score+' 分分享海报">'+
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
    link.href=url;link.download='鉴颜值-'+report.tier.name+'-'+report.score+'分.png';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    if($('beautyPosterStatus'))$('beautyPosterStatus').textContent='已发起海报下载，可在下载列表查看并分享。';
  }catch{toast('海报保存失败，请重新生成后再试');}
}
page.addEventListener('click',event=>{
  const target=event.target.closest('button');
  if(!target)return;
  if(target.hasAttribute('data-beauty-close'))return closeSheet();
  if(target.dataset.score){clearUpload();return start(Number(target.dataset.score),false);}
  const productId=target.dataset.productDetail||target.dataset.productBuy;
  if(productId){
    const product=PRODUCTS.find(item=>item.id===productId);
    if(product)return target.dataset.productBuy?orderSheet(product):detailSheet(product);
  }
  switch(target.dataset.action){
    case 'compare':return compareSheet();
    case 'poster':return posterSheet();
    case 'download':return downloadPoster();
    case 'restart':clearUpload();return resetEntry();
    case 'replay':return start(selectedScore,false);
    case 'continue':return closeSheet();
  }
});
page.addEventListener('input',event=>{
  if(event.target.id==='beautyCompareRange')$('beautyCompareView').style.setProperty('--split',event.target.value+'%');
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
    clearUpload();start(score,false);
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
$('beautyBack').addEventListener('click',close);
$('beautyScenes').addEventListener('click',sceneSheet);
$('beautyUpload').addEventListener('click',()=>$('beautyPhotoInput').click());
$('beautyStart').addEventListener('click',()=>{clearUpload();start(90);});
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
    else if(!$('beautyScanning').hidden)resetEntry();
    else close();
    return;
  }
  if(event.key!=='Tab')return;
  // Reveal every section before keyboard traversal so offscreen controls stay in order.
  if($('beautyOverlay').hidden && !$('beautyReport').hidden){
    observer?.disconnect();
    $('beautyReport').querySelectorAll('[data-reveal]').forEach(el=>{
      el.classList.add('is-visible');
      inert(el,false);
    });
  }
  const root=$('beautyOverlay').hidden?page:$('beautySheet');
  const controls=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type=file]),textarea')].filter(el=>!el.closest('[hidden],[inert]')&&el.getClientRects().length);
  if(!controls.length)return;
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
motion.addEventListener('change',()=>{
  if(!page.hidden&&!$('beautyReport').hidden&&currentReport){cancelPresentation();animateReport();}
});
window.beautyExperience={open,close};
// The query opens only the development scene selector; it never changes exported posters.
if(new URLSearchParams(location.search).get('beauty')==='scenes'){open();sceneSheet();}
