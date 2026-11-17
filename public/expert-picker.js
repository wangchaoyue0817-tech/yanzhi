'use strict';
(() => {
 const app=document.getElementById('app');
 const e=id=>document.getElementById(id);
 const html=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const glyph=file=>`<span class="ep-icon" aria-hidden="true" style="--ep-icon:url('assets/icons/${file}.svg')"></span>`;
 const price=c=>`¥${(c.price/100).toFixed(2)}`;
 const root=document.createElement('div');
 root.id='expertPickerRoot';root.className='expert-picker-root';root.hidden=true;
 root.innerHTML=`<div class="ep-backdrop" data-ep-close aria-hidden="true"></div>
 <section class="expert-picker" id="expertPicker" role="dialog" aria-modal="true" aria-labelledby="epTitle" tabindex="-1">
  <div class="ep-handle" aria-hidden="true"></div><img class="ep-category-art" src="assets/banner-expert.webp" alt="" aria-hidden="true">
  <header class="ep-header" id="epHeader">
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
   <nav class="ep-category-nav" aria-label="切换鉴定品类"><div class="ep-category-tabs" id="epCategoryTabs"></div></nav>
   <label class="ep-directory-search ep-search">${glyph('magnifying-glass')}<input id="epGroupSearch" type="search" autocomplete="off" aria-label="搜索品牌、系列、产品名称" placeholder="搜索品牌、系列、产品名称"></label>
   <div class="ep-directory-layout">
    <div class="ep-directory-scroll" id="epBrandScroll">
     <section class="ep-popular" id="epPopular" hidden><h3>热门品牌</h3><div class="ep-popular-items" id="epPopularItems"></div></section>
     <div id="epBrandGroups"></div>
    </div>
    <nav class="ep-letter-nav" id="epBrandIndex" aria-label="品牌首字母定位"></nav>
   </div>
   <button class="ep-feedback-link" id="epFeedback" type="button">没有找到您的产品？${glyph('caret-right')}</button>
  </div>
  <div class="ep-aux-view" id="epAuxView" hidden></div>
  <section class="ep-upload-view" id="epUploadView" hidden></section>
  <div class="ep-series-layer" id="epSeriesLayer" hidden>
   <div class="ep-series-mask" id="epSeriesMask" aria-hidden="true"></div>
   <section class="ep-series-drawer" id="epSeriesDrawer" role="dialog" aria-modal="true" aria-labelledby="epDrawerTitle" tabindex="-1">
    <header class="ep-drawer-header"><h3 id="epDrawerTitle"></h3><button class="ep-icon-button" id="epDrawerClose" type="button" aria-label="关闭系列列表">${glyph('x')}</button></header>
    <label class="ep-directory-search ep-search">${glyph('magnifying-glass')}<input id="epStyleSearch" type="search" autocomplete="off" aria-label="搜索款式或系列" placeholder="搜索款式或系列"></label>
    <div class="ep-directory-layout">
     <div class="ep-directory-scroll" id="epSeriesScroll"><div id="epSeriesGroups"></div></div>
     <nav class="ep-letter-nav" id="epSeriesIndex" aria-label="系列首字母定位"></nav>
    </div>
   </section>
  </div>
 </section>`;
 app.append(root);
 const catalog = EXPERT_CATALOG;
 const directory = window.ExpertDirectory;
 const upload = window.ExpertUpload.create(e('epUploadView'));
 const panel = e('expertPicker');
 const seriesLayer = e('epSeriesLayer');
 const productView = e('epProductView');
 const brandList = { scroll: e('epBrandScroll'), groups: e('epBrandGroups'), index: e('epBrandIndex') };
 const seriesList = { scroll: e('epSeriesScroll'), groups: e('epSeriesGroups'), index: e('epSeriesIndex') };
 let openSession = 0;
 let sessionCounter = 0;
 let resumableSession = 0;
 let route = null;
 let renderedCategory = null;
 let categoryScroll = 0;
 let categoryTrigger = null;
 let brandTrigger = null;
 let focusReturn = null;
 let inert = [];
 let feedback = '';
 let selection = null;

 e('epCategoryGrid').innerHTML = catalog.map((c,i)=>`<button class="ep-category-card tone-${i%3}" data-ep-category="${i}" type="button" aria-label="${html(c.name)}，${price(c)}"><span class="ep-category-emblem"><span class="ep-category-icon" style="--ep-icon:url('assets/icons/${c.icon}')" aria-hidden="true"></span></span><span class="ep-category-copy"><span class="ep-category-name">${html(c.name)}</span><span class="ep-category-price"><small>¥</small>${(c.price/100).toFixed(2)}<em>/ 次</em></span></span><span class="ep-category-enter">${glyph('caret-right')}</span></button>`).join('');
 const firstTabs = ['bags', 'footwear', 'beauty', 'beauty-nondestructive', 'electronics-nondestructive'];
 const tabOrder = [...firstTabs, ...catalog.map(c => c.id).filter(id => !firstTabs.includes(id))];
 e('epCategoryTabs').innerHTML = tabOrder.map(id => {
  const index = catalog.findIndex(c => c.id === id);
  return `<button type="button" data-ep-category="${index}" aria-pressed="false">${html(catalog[index].name)}</button>`;
 }).join('');

 function syncTop() {
  const rect = app.getBoundingClientRect();
  const nav = app.querySelector('.navbar').getBoundingClientRect();
  root.style.setProperty('--ep-top', `${nav.bottom - rect.top + 14}px`);
 }

 function enter(nextRoute, { replace = false, fromHistory = false } = {}) {
  const previous = route;
  route = nextRoute;
  if (!fromHistory) history[replace ? 'replaceState' : 'pushState']({ ...history.state, jxExpertPicker: { session: openSession, route } }, '');
  const { view, category, brand, series } = route;
  const c = catalog[category];
  const b = c?.groups[brand];
  const inDrawer = view === 'series';
  const inDirectory = view === 'product' || inDrawer;
  root.dataset.view = inDrawer ? 'product' : view;
  e('epCategoryView').hidden = view !== 'categories';
  productView.hidden = !inDirectory;
  e('epAuxView').hidden = view !== 'feedback';
  seriesLayer.hidden = !inDrawer;
  productView.inert = inDrawer;
  e('epHeader').inert = inDrawer;
  e('epBack').hidden = view === 'categories';
  e('epBack').setAttribute('aria-label', inDirectory ? '返回品类列表' : `返回${c?.groupLabel ?? '品牌'}列表`);
  e('epClose').hidden = view !== 'categories';
  e('epTitle').textContent = ({ categories: '选择鉴定品类', product: `选择${c?.groupLabel ?? '品牌'}`, feedback: '补充产品信息', upload: '上传照片' })[root.dataset.view];
  if (view !== 'upload') upload.hide();
  if (view === 'categories') {
   e('epCategoryScroll').scrollTop = categoryScroll;
   if (previous?.view === 'product' && categoryTrigger?.isConnected) categoryTrigger.focus({ preventScroll: true });
   else e('epClose').focus({ preventScroll: true });
  } else if (inDirectory) {
   const categoryChanged = category !== renderedCategory || previous?.view === 'categories';
   if (categoryChanged) renderCategory(c, category);
   if (inDrawer) {
    e('epDrawerTitle').textContent = b.name;
    const field = e('epStyleSearch');
    field.value = '';
    field.placeholder = c.groupLabel === '品牌' ? '搜索款式或系列' : '搜索细分类型';
    field.setAttribute('aria-label', field.placeholder);
    renderSeries(true);
    e('epSeriesDrawer').focus({ preventScroll: true });
   } else if (previous?.view === 'series' && brandTrigger?.isConnected) {
    brandTrigger.focus({ preventScroll: true });
   } else if (previous?.view === 'upload') {
    if (!categoryChanged) renderBrands(false);
    const selected = e('epBrandGroups').querySelector(`[data-ep-brand="${previous.brand}"]`);
    (selected ?? panel).focus({ preventScroll: true });
   } else if (previous?.view === 'feedback') {
    e('epFeedback').focus({ preventScroll: true });
   } else {
    panel.focus({ preventScroll: true });
   }
  } else if (view === 'feedback') {
   showFeedback();
  } else if (view === 'upload') {
   const style = b.styles[series];
   selection = { category, brand, series };
   upload.show({ category: c, brand: b, series: style });
   panel.focus({ preventScroll: true });
  }
 }

 function mount(session) {
  openSession = session;
  resumableSession = session;
  renderedCategory = null;
  focusReturn = document.activeElement;
  inert = [...app.children].filter(el => el !== root).map(el => [el, el.inert]);
  inert.forEach(([el]) => { el.inert = true; });
  root.hidden = false;
  syncTop();
 }

 function open() {
  if (openSession) return;
  mount(++sessionCounter);
  enter({ view: 'categories' });
 }

 function dismiss(restoreFocus) {
  if (!openSession) return;
  if (route.view === 'categories') categoryScroll = e('epCategoryScroll').scrollTop;
  openSession = 0;
  route = null;
  root.hidden = true;
  seriesLayer.hidden = true;
  upload.reset();
  selection = null;
  inert.forEach(([el, original]) => { el.inert = original; });
  inert = [];
  if (restoreFocus && focusReturn?.isConnected) focusReturn.focus({ preventScroll: true });
 }

 function close(restoreFocus = true) {
  if (!openSession) return;
  if (restoreFocus) { history.back(); return; }
  const state = { ...history.state };
  delete state.jxExpertPicker;
  history.replaceState(state, '');
  resumableSession = 0;
  dismiss(false);
 }

 window.addEventListener('popstate', () => {
  const entry = history.state?.jxExpertPicker;
  if (!openSession && resumableSession && entry?.session === resumableSession) mount(resumableSession);
  if (!openSession) return;
  if (entry?.session === openSession) enter(entry.route, { fromHistory: true });
  else dismiss(true);
 });

 function renderCategory(category, index) {
  renderedCategory = index;
  const groupSearch = e('epGroupSearch');
  groupSearch.value = '';
  groupSearch.placeholder = category.groupLabel === '品牌' ? '搜索品牌、系列、产品名称' : '搜索种类或细分类型';
  groupSearch.setAttribute('aria-label', groupSearch.placeholder);
  brandList.index.setAttribute('aria-label', `${category.groupLabel}首字母定位`);
  const tabs = e('epCategoryTabs');
  for (const button of tabs.children) button.setAttribute('aria-pressed', String(Number(button.dataset.epCategory) === index));
  const current = tabs.querySelector('[aria-pressed="true"]');
  if (current) tabs.scrollLeft += current.getBoundingClientRect().left - tabs.getBoundingClientRect().left - (tabs.clientWidth - current.clientWidth) / 2;
  renderBrands(true);
 }

 function updateList(list, groups, renderRow, emptyText, resetScroll) {
  const scrollTop = list.scroll.scrollTop;
  list.groups.innerHTML = groups.length
   ? groups.map(({ letter, items }) => `<section class="ep-directory-group" data-ep-letter-group="${html(letter)}"><h3>${html(letter)}</h3>${items.map(renderRow).join('')}</section>`).join('')
   : `<p class="ep-empty" role="status">${html(emptyText)}</p>`;
  list.index.innerHTML = groups.length ? ['Top', ...groups.map(group => group.letter)].map(letter => `<button type="button" data-ep-letter="${html(letter)}" aria-label="${letter === 'Top' ? '回到顶部' : `${html(letter)} 组`}">${html(letter)}</button>`).join('') : '';
  list.index.hidden = groups.length === 0;
  list.scroll.scrollTop = resetScroll ? 0 : scrollTop;
 }

 function badge(item) {
  return `${item.ai ? '<span class="ep-ai-badge">AI</span>' : ''}${item.badge ? `<span class="ep-service-badge">${html(item.badge)}</span>` : ''}`;
 }

 function renderBrands(resetScroll) {
  const category = catalog[route.category];
  const { groups, popular } = directory.brands(category, e('epGroupSearch').value);
  e('epPopular').hidden = popular.length === 0;
  e('epPopularItems').innerHTML = popular.map(item => `<button type="button" data-ep-brand="${item.index}">${html(item.name)}</button>`).join('');
  updateList(brandList, groups, item => {
   const selected = selection?.category === route.category && selection.brand === item.index;
   const style = selected ? category.groups[item.index].styles[selection.series] : null;
   const styleName = typeof style === 'string' ? style : style?.name;
   return `<button type="button" class="ep-directory-row" data-ep-brand="${item.index}" aria-haspopup="dialog"${selected ? ' aria-current="true"' : ''}><span class="ep-row-label">${html(item.name)}${badge(item)}${styleName ? `<small class="ep-row-secondary">${html(styleName)}</small>` : ''}</span>${glyph('caret-right')}</button>`;
  }, `没有找到相关${category.groupLabel}`, resetScroll);
 }

 function renderSeries(resetScroll) {
  const brand = catalog[route.category].groups[route.brand];
  const { groups } = directory.series(brand, e('epStyleSearch').value);
  updateList(seriesList, groups, item => {
   const selected = selection?.category === route.category && selection.brand === route.brand && selection.series === item.index;
   return `<button type="button" class="ep-directory-row" data-ep-style="${item.index}"${selected ? ' aria-current="true"' : ''}><span class="ep-row-label">${html(item.name)}${badge(item)}</span>${glyph(selected ? 'check' : 'caret-right')}</button>`;
  }, '没有找到相关款式', resetScroll);
 }

 function jumpToLetter(button) {
  const list = route.view === 'series' ? seriesList : brandList;
  const letter = button.dataset.epLetter;
  const section = [...list.groups.children].find(el => el.dataset.epLetterGroup === letter);
  if (letter === 'Top') list.scroll.scrollTop = 0;
  else if (section) list.scroll.scrollTop += section.getBoundingClientRect().top - list.scroll.getBoundingClientRect().top;
  for (const option of list.index.children) {
   if (option === button) option.setAttribute('aria-current', 'true');
   else option.removeAttribute('aria-current');
  }
 }

 function showFeedback() {
  e('epAuxView').innerHTML = `<div class="ep-feedback-form"><label for="epFeedbackText">产品信息</label><textarea id="epFeedbackText" maxlength="300" placeholder="品牌、款式或产品名称">${html(feedback)}</textarea><p class="ep-feedback-note">仅在本次体验中记录。</p><button type="button" class="ep-confirm" id="epSaveFeedback">保存反馈 ${glyph('check')}</button><p id="epFeedbackStatus" role="status"></p></div>`;
  e('epFeedbackText').focus();
 }

 root.addEventListener('click', event => {
  const target = event.target.closest('button,[data-ep-close],#epSeriesMask');
  if (!target || !route) return;
  if (target.hasAttribute('data-ep-close') && route.view !== 'categories') return;
  if (target.hasAttribute('data-ep-close') || ['epClose', 'epBack', 'epDrawerClose', 'epSeriesMask'].includes(target.id)) {
   history.back();
   return;
  }
  if (target.hasAttribute('data-ep-category')) {
   const category = Number(target.dataset.epCategory);
   if (!catalog[category] || category === route.category) return;
   if (route.view === 'categories') {
    categoryScroll = e('epCategoryScroll').scrollTop;
    categoryTrigger = target;
   }
   enter({ view: 'product', category }, { replace: route.view === 'product' });
  } else if (target.hasAttribute('data-ep-brand')) {
   brandTrigger = target;
   enter({ ...route, view: 'series', brand: Number(target.dataset.epBrand) });
  } else if (target.hasAttribute('data-ep-style')) {
   enter({ ...route, view: 'upload', series: Number(target.dataset.epStyle) }, { replace: true });
  } else if (target.hasAttribute('data-ep-letter')) {
   jumpToLetter(target);
  } else if (target.id === 'epFeedback') {
   enter({ ...route, view: 'feedback' });
  } else if (target.id === 'epSaveFeedback') {
   const input = e('epFeedbackText');
   const value = input.value.trim();
   if (!value) {
    e('epFeedbackStatus').textContent = '请先填写产品信息';
    input.focus();
   } else {
    feedback = value;
    e('epFeedbackStatus').textContent = '已记录反馈';
   }
  }
 });
 e('epGroupSearch').addEventListener('input', () => renderBrands(true));
 e('epStyleSearch').addEventListener('input', () => renderSeries(true));
 root.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
   event.preventDefault();
   event.stopPropagation();
   history.back();
   return;
  }
  if (event.key !== 'Tab') return;
  const scope = route.view === 'series' ? e('epSeriesDrawer') : panel;
  const focusable = [...scope.querySelectorAll('button,input,textarea,[tabindex="0"]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === scope)) {
   event.preventDefault();
   last?.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === scope)) {
   event.preventDefault();
   first?.focus();
  }
 });
 new ResizeObserver(() => { if (openSession) syncTop(); }).observe(app.querySelector('.navbar'));
 window.expertPicker = { open, close };
})();
