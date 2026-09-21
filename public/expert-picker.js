'use strict';
(() => {
 const app=document.getElementById('app');
 const e=id=>document.getElementById(id);
 const html=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const glyph=file=>`<span class="ep-icon" aria-hidden="true" style="--ep-icon:url('assets/icons/${file}.svg')"></span>`;
 const styleInfo=s=>typeof s==='string'?{name:s}:s;
 const price=c=>`¥${(c.price/100).toFixed(2)}`;
 const picker={open:false,view:'categories',category:null,group:null,style:null,categoryScroll:0,focusReturn:null,inert:[],confirmed:false,feedback:''};
 const root=document.createElement('div');
 root.id='expertPickerRoot';root.className='expert-picker-root';root.hidden=true;
 root.innerHTML=`<div class="ep-backdrop" data-ep-close aria-hidden="true"></div>
 <section class="expert-picker" id="expertPicker" role="dialog" aria-modal="true" aria-labelledby="epTitle" tabindex="-1">
  <div class="ep-handle" aria-hidden="true"></div><img class="ep-category-art" src="assets/banner-expert.webp" alt="" aria-hidden="true">
  <header class="ep-header">
   <div class="ep-heading"><button class="ep-icon-button ep-back" id="epBack" aria-label="返回品类列表" hidden>${glyph('caret-left')}</button><div><p class="ep-eyebrow">${glyph('seal-check')} 专家在线鉴定</p><div class="ep-title-line"><h2 id="epTitle">选择鉴定品类</h2><span class="ep-title-chip">品类 / 品牌 / 系列</span></div></div></div>
   <button class="ep-icon-button" id="epClose" aria-label="关闭专家鉴定">${glyph('x')}</button>
  </header>
  <p class="ep-subtitle" id="epSubtitle">从日常好物，到珍藏之选</p>
  <div class="ep-category-view" id="epCategoryView">
   <div class="ep-category-meta"><span>全部品类 <b>28</b></span><span>${glyph('shield-check')} 专家一对一</span></div>
   <div class="ep-category-scroll" id="epCategoryScroll"><div class="ep-category-grid" id="epCategoryGrid"></div><p class="ep-list-end">每一份珍藏，都值得认真对待</p></div>
   <div class="ep-category-footer">选择品类，查看品牌与款式 ${glyph('arrow-right')}</div>
  </div>
  <div class="ep-product-view" id="epProductView" hidden>
   <div class="ep-product-main">
   <nav class="ep-category-nav" aria-label="切换鉴定品类"><div class="ep-nav-label"><strong>选择品类</strong><span>左右滑动查看全部</span></div><div class="ep-category-tabs" id="epCategoryTabs"></div></nav>
   <ol class="ep-steps" aria-label="选择进度"><li class="done"><b>1.</b>品类</li><li id="epGroupStep"><b>2.</b><span>品牌</span></li><li id="epStyleStep"><b>3.</b><span>款式 / 系列</span></li></ol>
   <div class="ep-columns">
    <section class="ep-column"><div class="ep-column-heading"><h3 id="epGroupTitle">品牌</h3><span id="epGroupCount"></span></div><label class="ep-search">${glyph('magnifying-glass')}<input id="epGroupSearch" type="search" autocomplete="off" aria-label="搜索品牌" placeholder="搜索品牌名称"></label><div class="ep-options" id="epGroups" role="group" aria-label="品牌列表"></div></section>
    <section class="ep-column"><div class="ep-column-heading"><h3 id="epStyleTitle">款式 / 系列</h3><span id="epStyleCount"></span></div><label class="ep-search">${glyph('magnifying-glass')}<input id="epStyleSearch" type="search" autocomplete="off" aria-label="搜索款式或系列" placeholder="搜索款式或系列" disabled></label><div class="ep-options" id="epStyles" role="radiogroup" aria-label="款式列表"></div></section>
   </div>
   <button class="ep-feedback-card" id="epFeedback"><span class="ep-feedback-icon">${glyph('chat-circle-dots')}</span><span><strong>没有找到您的产品？</strong><small>告诉我们，帮助完善产品库</small></span><span class="ep-feedback-action">提交反馈 ${glyph('arrow-right')}</span></button>
   </div>
   <footer class="ep-product-footer">
    <div class="ep-checkout"><div class="ep-selection"><span class="ep-label">已选：</span><div id="epSelection" class="ep-selected-tags"></div></div><div class="ep-checkout-action"><div class="ep-total"><span>鉴定费</span><strong id="epPrice"></strong></div><button class="ep-confirm" id="epConfirm" disabled><span>请选择品牌与款式</span></button></div></div>
    <div class="ep-agreement"><label><input id="epAgree" type="checkbox"><span>我已阅读并同意</span></label><button id="epAgreementLink" type="button">《在线鉴别服务协议》</button></div>
    <p class="ep-status" id="epStatus" role="status">产品库为演示数据，确认不会产生订单或扣费</p>
   </footer>
  </div>
  <div class="ep-aux-view" id="epAuxView" hidden></div>
 </section>`;
 app.append(root);
 const catalog=EXPERT_CATALOG;
 e('epCategoryGrid').innerHTML=catalog.map((c,i)=>`<button class="ep-category-card tone-${i%3}" data-ep-category="${i}" type="button" aria-label="${html(c.name)}，${price(c)}"><span class="ep-category-emblem"><span class="ep-category-icon" style="--ep-icon:url('assets/icons/${c.icon}')" aria-hidden="true"></span></span><span class="ep-category-copy"><span class="ep-category-name">${html(c.name)}</span><span class="ep-category-price"><small>¥</small>${(c.price/100).toFixed(2)}<em>/ 次</em></span></span><span class="ep-category-enter">${glyph('caret-right')}</span></button>`).join('');
 const tabOrder=['bags','footwear','beauty','beauty-nondestructive','electronics-nondestructive'];
 const tabCatalog=[...catalog].sort((a,b)=>(tabOrder.includes(a.id)?tabOrder.indexOf(a.id):99)-(tabOrder.includes(b.id)?tabOrder.indexOf(b.id):99));
 e('epCategoryTabs').innerHTML=tabCatalog.map(c=>{const i=catalog.indexOf(c);return `<button type="button" data-ep-category="${i}" aria-pressed="false">${html(c.name)}</button>`;}).join('');
 function syncTop(){const rect=app.getBoundingClientRect(),nav=app.querySelector('.navbar').getBoundingClientRect();root.style.setProperty('--ep-top',`${nav.bottom-rect.top+14}px`);}
 function setView(view){
  picker.view=view;root.dataset.view=view;
  e('epCategoryView').hidden=view!=='categories';e('epProductView').hidden=view!=='product';e('epAuxView').hidden=!['feedback','agreement'].includes(view);
  e('epBack').hidden=view==='categories';
  e('epBack').setAttribute('aria-label',view==='product'?'返回品类列表':'返回产品选择');
  e('epTitle').textContent=({categories:'选择鉴定品类',product:'选择鉴定产品',feedback:'补充产品信息',agreement:'服务协议'})[view];
  e('epSubtitle').textContent=({categories:'从日常好物，到珍藏之选',product:'先选择品类，再选择品牌与款式，确认后进入专家鉴定。',feedback:'每一个建议，都让产品库更完整',agreement:'请阅读服务内容与适用范围'})[view];
 }
 function open(){
  if(picker.open)return;
  picker.open=true;picker.focusReturn=document.activeElement;
  picker.inert=[...app.children].filter(el=>el!==root).map(el=>[el,el.inert]);
  picker.inert.forEach(([el])=>el.inert=true);
  root.hidden=false;setView('categories');syncTop();e('epCategoryScroll').scrollTop=picker.categoryScroll;e('epClose').focus({preventScroll:true});
 }
 function close(restoreFocus=true){
  if(!picker.open)return;
  if(picker.view==='categories')picker.categoryScroll=e('epCategoryScroll').scrollTop;
  picker.open=false;root.hidden=true;picker.inert.forEach(([el,inert])=>el.inert=inert);picker.inert=[];
  if(restoreFocus&&picker.focusReturn?.isConnected)picker.focusReturn.focus({preventScroll:true});
 }
 function chooseCategory(index){
  const c=catalog[index];if(!c)return;
  if(picker.view==='categories')picker.categoryScroll=e('epCategoryScroll').scrollTop;
  if(picker.category!==c){picker.category=c;picker.group=null;picker.style=null;picker.confirmed=false;}
  e('epGroupSearch').value='';e('epStyleSearch').value='';
  e('epGroupSearch').placeholder=`搜索${c.groupLabel}名称…`;e('epGroupSearch').setAttribute('aria-label',`搜索${c.groupLabel}`);
  e('epGroupTitle').textContent=c.groupLabel;e('epStyleTitle').textContent=c.styleLabel;
  e('epGroups').setAttribute('aria-label',`${c.groupLabel}列表`);e('epStyles').setAttribute('aria-label',`${c.styleLabel}列表`);
  e('epStyleSearch').placeholder=c.groupLabel==='品牌'?'搜索款式或系列…':'搜索细分类型…';e('epStyleSearch').setAttribute('aria-label',e('epStyleSearch').placeholder);
  e('epGroupStep').querySelector('span').textContent=c.groupLabel;e('epStyleStep').querySelector('span').textContent=c.styleLabel;
  [...e('epCategoryTabs').children].forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.epCategory)===index)));
  setView('product');renderGroups();renderStyles();renderSelection();root.querySelector('.ep-product-main').scrollTop=0;
  const tab=e('epCategoryTabs').querySelector(`[data-ep-category="${index}"]`),track=e('epCategoryTabs');track.scrollLeft=tab.offsetLeft-track.offsetLeft-(track.clientWidth-tab.clientWidth)/2;
  e('expertPicker').focus({preventScroll:true});
 }
 const matches=(value,query)=>value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
 function empty(text){return `<div class="ep-empty">${glyph('magnifying-glass')}<span>${html(text)}</span></div>`;}
 function renderGroups(){
  const c=picker.category,q=e('epGroupSearch').value;const groups=c.groups.map((g,i)=>({g,i})).filter(({g})=>matches(g.name,q));
  e('epGroupCount').textContent=`${groups.length} 个`;
  e('epGroups').innerHTML=groups.length?groups.map(({g,i})=>`<button type="button" class="ep-option ${g.ai?'has-badge':''}" data-ep-group="${i}" aria-pressed="${picker.group===i}">${g.ai?'<span class="ep-ai-badge">AI</span>':''}<span class="ep-option-name">${html(g.name)}</span>${glyph('caret-right')}</button>`).join(''):empty(`没有找到相关${c.groupLabel}`);
 }
 function renderStyles(){
  const c=picker.category,group=picker.group===null?null:c.groups[picker.group];
  e('epStyleSearch').disabled=!group;e('epStyleCount').textContent=group?`${group.styles.length} 款`:'';
  if(!group){e('epStyles').innerHTML=empty(`请先选择左侧${c.groupLabel}`);return;}
  const rows=group.styles.map((s,i)=>({...styleInfo(s),i})).filter(({name})=>matches(name,e('epStyleSearch').value));
  e('epStyleCount').textContent=`${rows.length} 款`;
  const tabIndex=rows.some(row=>row.i===picker.style)?picker.style:rows[0]?.i;
  e('epStyles').innerHTML=rows.length?rows.map(({name,i,ai,badge})=>`<button type="button" role="radio" tabindex="${i===tabIndex?0:-1}" class="ep-option ep-style-option ${ai?'has-badge':''} ${badge?'is-special':''}" data-ep-style="${i}" aria-checked="${picker.style===i}">${ai?'<span class="ep-ai-badge">AI</span>':''}<span class="ep-option-name">${badge?`<span class="ep-service-badge">${html(badge)}</span>`:''}${html(name)}</span><span class="ep-radio" aria-hidden="true">${glyph('check')}</span></button>`).join(''):empty('没有找到相关款式');
 }
 function renderSelection(){
  const c=picker.category,g=picker.group===null?null:c.groups[picker.group],s=picker.style===null?null:styleInfo(g?.styles[picker.style]).name;
  e('epSelection').innerHTML=[c.name,g?.name,s].filter(Boolean).map((name,i)=>`<span class="ep-selected-tag ${i===2?'is-style':''}">${html(name)}</span>`).join('');e('epPrice').textContent=price(c);
  e('epGroupStep').className=g?'done':'current';e('epStyleStep').className=s?'done':g?'current':'';
  e('epAgree').checked=agreed;
  e('epConfirm').disabled=!s;
  e('epConfirm').querySelector('span').textContent=picker.confirmed?'已确认选择':s?'确认选择，开始鉴定':`请选择${g?c.styleLabel:c.groupLabel}`;
  e('epStatus').textContent=picker.confirmed?'选择已确认。当前为交互演示，未创建订单或扣费。':'产品库为演示数据，确认不会产生订单或扣费';
  e('epStatus').classList.remove('is-error');
 }
 function back(){
  if(picker.view==='product'){setView('categories');e('epCategoryScroll').scrollTop=picker.categoryScroll;const index=catalog.indexOf(picker.category);e('epCategoryGrid').children[index]?.focus({preventScroll:true});}
  else{setView('product');e('epBack').focus({preventScroll:true});}
 }
 function showFeedback(){
  setView('feedback');e('epAuxView').innerHTML=`<div class="ep-feedback-form"><span class="ep-aux-symbol">${glyph('chat-circle-dots')}</span><h3>告诉我们您想鉴定的产品</h3><p>补充品牌、款式或产品名称，帮助我们完善品类。</p><label for="epFeedbackText">产品信息</label><textarea id="epFeedbackText" maxlength="300" placeholder="例如：品牌名称、款式、所属品类…">${html(picker.feedback)}</textarea><p class="ep-feedback-note">仅在本次演示中记录，不会发送至客服。</p><button type="button" class="ep-confirm" id="epSaveFeedback">保存反馈 ${glyph('check')}</button><p id="epFeedbackStatus" role="status"></p></div>`;e('epFeedbackText').focus();
 }
 function showAgreement(){
  setView('agreement');e('epAuxView').innerHTML=`<div class="ep-agreement-copy"><h3>图灵鉴X在线鉴别服务协议</h3><p>${html(e('agreeSheet').querySelector('p').textContent)}</p><p class="ep-demo-note">当前为界面交互演示，不会创建真实鉴定订单或发起支付。</p></div>`;e('expertPicker').focus({preventScroll:true});
 }
 root.addEventListener('click',event=>{
  const target=event.target.closest('button,[data-ep-close]');if(!target)return;
  if(target.hasAttribute('data-ep-close')||target.id==='epClose'){close();return;}
  if(target.hasAttribute('data-ep-category')){chooseCategory(Number(target.dataset.epCategory));return;}
  if(target.hasAttribute('data-ep-group')){picker.group=Number(target.dataset.epGroup);picker.style=null;picker.confirmed=false;e('epStyleSearch').value='';renderGroups();renderStyles();renderSelection();e('epStyles').scrollTop=0;e('epGroups').querySelector(`[data-ep-group="${picker.group}"]`)?.focus({preventScroll:true});return;}
  if(target.hasAttribute('data-ep-style')){picker.style=Number(target.dataset.epStyle);picker.confirmed=false;renderStyles();renderSelection();e('epStyles').querySelector(`[data-ep-style="${picker.style}"]`)?.focus({preventScroll:true});return;}
  if(target.id==='epBack'){back();return;}
  if(target.id==='epFeedback'){showFeedback();return;}
  if(target.id==='epAgreementLink'){showAgreement();return;}
  if(target.id==='epSaveFeedback'){
   const value=e('epFeedbackText').value.trim();if(!value){e('epFeedbackStatus').textContent='请先填写产品信息';e('epFeedbackText').focus();return;}
   picker.feedback=value;e('epFeedbackStatus').textContent='已在本次演示中记录，尚未发送。';return;
  }
  if(target.id==='epConfirm'){
   if(picker.group===null||picker.style===null)return;
   if(!agreed){e('epStatus').textContent='请先阅读并勾选服务协议';e('epStatus').classList.add('is-error');e('epAgree').focus();return;}
   picker.confirmed=true;renderSelection();
  }
 });
 e('epGroupSearch').addEventListener('input',renderGroups);e('epStyleSearch').addEventListener('input',renderStyles);
 e('epAgree').addEventListener('change',()=>{agreed=e('epAgree').checked;e('agreeCheck').classList.toggle('on',agreed);e('agreeCheck').textContent=agreed?'✓':'';picker.confirmed=false;renderSelection();});
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(['feedback','agreement'].includes(picker.view))back();else close();return;}
  if(['ArrowDown','ArrowUp','ArrowRight','ArrowLeft'].includes(event.key)&&event.target.matches('[data-ep-style]')){event.preventDefault();const options=[...e('epStyles').querySelectorAll('[data-ep-style]')];const direction=['ArrowDown','ArrowRight'].includes(event.key)?1:-1;options[(options.indexOf(event.target)+direction+options.length)%options.length]?.click();e('epStyles').querySelector('[aria-checked="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});return;}
  if(event.key!=='Tab')return;
  const focusable=[...root.querySelectorAll('button,input,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===e('expertPicker'))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===e('expertPicker'))){event.preventDefault();first?.focus();}
 });
 new ResizeObserver(()=>{if(picker.open)syncTop();}).observe(app.querySelector('.navbar'));
 window.expertPicker={open,close};
})();
