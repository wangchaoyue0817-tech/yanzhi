'use strict';
const $ = id => document.getElementById(id);
const order = ['鉴腕表','鉴潮服','鉴包袋','鉴鞋靴','鉴美妆','鉴皮肤','鉴穿搭','鉴配饰','鉴酒水','鉴餐品','测人格','鉴卡牌','鉴木作手串','鉴藏币','鉴玉石','鉴瓷器','鉴邮票','估价格','OCR文字提取','瑕疵检测'];
const skills = order.map(label => ALL.find(s => s.label === label));
const state = { center:2, selected:'', tab:'ai', banner:0, paused:false, busy:false, pointer:false, holdUntil:0, bannerHold:0, photos:[], focusReturn:null };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const icon = name => ICONS[name] || ICONS.鉴包袋;
const escaped = s => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let skillTimer, bannerTimer, toastTimer, messageTimer;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3400);}
function suspend(ms=14000){state.holdUntil=Date.now()+ms;}
function blocked(){return state.paused||reduceMotion.matches||document.hidden||state.tab!=='ai'||state.busy||state.pointer||$('skillPopup').classList.contains('show')||!$('menuPanel').hidden||!$('conversationPanel').hidden||document.activeElement===$('inputField');}
function offset(i){let d=(i-state.center+skills.length)%skills.length;if(d>skills.length/2)d-=skills.length;return d;}
function createCards(){
 $('skillGrid').innerHTML=skills.map((s,i)=>`<button class="skill-card" type="button" data-index="${i}" aria-label="开启${s.label}"><span class="skill-card-icon">${icon(s.label)}</span><span class="skill-card-label${s.label.length>4?' long':''}">${s.label}</span><span class="skill-action">开启<b>↗</b></span></button>`).join('');
 positionCards(true);
}
function positionCards(immediate=false){
 const w=$('skillCarousel').clientWidth,step=w*.198;
 document.querySelectorAll('#skillGrid .skill-card').forEach((el,i)=>{
  const d=offset(i),a=Math.abs(d),visible=a<=2;
  if(immediate)el.style.transition='none';else el.style.transition='';
  el.classList.toggle('center',d===0);el.classList.toggle('selected',state.selected===skills[i].label);
  el.style.transform=`translateX(calc(-50% + ${d*step}px)) translateY(${a*7}px) rotate(${d*3.4}deg) scale(${1-a*.08})`;
  el.style.opacity=visible?(1-a*.12):0;el.style.zIndex=10-a;el.style.pointerEvents=visible?'auto':'none';el.tabIndex=visible?0:-1;el.setAttribute('aria-hidden',String(!visible));el.setAttribute('aria-pressed',String(state.selected===skills[i].label));
  el.querySelector('.skill-action').innerHTML=state.selected===skills[i].label?'已开启<b>✓</b>':'开启<b>↗</b>';
 });
 $('skillMeter').style.transform=`translateX(${state.center/(skills.length-1)*34}px)`;
 if(immediate) requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelectorAll('#skillGrid .skill-card').forEach(el=>el.style.transition='')));
}
function moveSkill(dir,manual=false){state.center=(state.center+dir+skills.length)%skills.length;positionCards();if(manual)suspend();}
function renderPopup(){
 $('skillList').innerHTML=ALL.map(s=>`<button type="button" class="skill-popup-item${state.selected===s.label?' active':''}" data-skill="${s.label}" aria-pressed="${state.selected===s.label}" style="width:calc(100% - 6px);background-color:transparent;text-align:left"><span class="skill-popup-item-left"><span class="skill-popup-item-icon">${icon(s.label)}</span><span class="skill-popup-item-label-wrap"><span class="skill-popup-item-label">${s.label}</span>${s.badge?`<span class="skill-popup-item-new">${s.badge==='new'?'新':s.badge}</span>`:''}</span></span>${state.selected===s.label?'<span class="skill-popup-item-check">✓</span>':''}</button>`).join('');
}
const initialSkillBtn=$('skillBtn').innerHTML;
function updateSkillBtn(){
 const btn=$('skillBtn');
 if(state.selected){btn.className='toolbar-btn toolbar-skill-capsule';btn.innerHTML=`<span class="cap-label">${icon(state.selected)}<span>${state.selected}</span></span><button type="button" class="cap-close" id="clearSkill" aria-label="取消已选技能">×</button>`;$('clearSkill').onclick=e=>{e.stopPropagation();state.selected='';updateSkillBtn();positionCards();renderPopup();};}
 else{btn.className='toolbar-btn';btn.innerHTML=initialSkillBtn;}
 $('inputTip').textContent=(HOT.find(s=>s.label===state.selected)||{}).tip||'本服务由AI提供，请注意甄别';
}
function selectSkill(label){state.selected=label;state.center=skills.findIndex(s=>s.label===label);positionCards();updateSkillBtn();renderPopup();closePopup();suspend(20000);toast(`已开启${label}，可上传照片或输入问题`);}
function openPopup(){state.focusReturn=document.activeElement;$('menuPanel').hidden=true;renderPopup();$('skillPopup').classList.add('show');$('sheetMask').classList.add('show');$('popupClose').focus();}
function closePopup(){const wasOpen=$('skillPopup').classList.contains('show')||$('agreeSheet').classList.contains('show');$('skillPopup').classList.remove('show');$('sheetMask').classList.remove('show');$('agreeSheet').classList.remove('show');if(wasOpen&&state.focusReturn?.isConnected)state.focusReturn.focus();if(wasOpen)suspend();}
function setTab(tab){
 state.tab=tab;$('aiHome').hidden=tab!=='ai';$('expertHome').hidden=tab!=='expert';$('app').classList.toggle('is-expert',tab==='expert');$('conversationPanel').hidden=true;$('menuPanel').hidden=true;
 document.querySelectorAll('.home-mode-tab-item').forEach(el=>{el.classList.toggle('active',el.dataset.tab===tab);el.setAttribute('aria-selected',String(el.dataset.tab===tab));});
 $('pageScroll').scrollTop=0;closePopup();if(tab==='ai')positionCards(true);
 const url=new URL(location.href);if(tab==='expert')url.searchParams.set('tab','expert');else url.searchParams.delete('tab');history.replaceState(null,'',url);
}
function setBanner(i,manual=false){state.banner=(i+3)%3;$('bannerTrack').style.transform=`translateX(-${state.banner*100}%)`;document.querySelectorAll('[data-page]').forEach((el,j)=>{el.classList.toggle('active',j===state.banner);el.setAttribute('aria-current',String(j===state.banner));});document.querySelectorAll('[data-banner]').forEach((el,j)=>{el.tabIndex=j===state.banner?0:-1;el.setAttribute('aria-hidden',String(j!==state.banner));});if(manual)state.bannerHold=Date.now()+18000;}
function toggleMotion(){state.paused=!state.paused;document.body.classList.toggle('motion-paused',state.paused);$('motionControl').textContent=state.paused?'▷':'Ⅱ';$('motionControl').setAttribute('aria-label',state.paused?'继续自动播放':'暂停自动播放');$('motionControl').title=state.paused?'继续自动播放':'暂停自动播放';}
function bindSwipe(el,onSwipe){let start=null,moved=false,suppressUntil=0;
 el.addEventListener('pointerdown',e=>{if(e.button&&e.button!==0)return;start={x:e.clientX,y:e.clientY,id:e.pointerId};moved=false;state.pointer=true;suspend();});
 el.addEventListener('pointermove',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)>9&&Math.abs(dx)>Math.abs(dy)){moved=true;if(!el.hasPointerCapture(e.pointerId))el.setPointerCapture(e.pointerId);}});
 const end=e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(moved){suppressUntil=Date.now()+350;if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy))onSwipe(dx<0?1:-1);}start=null;state.pointer=false;suspend();};
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',()=>{start=null;state.pointer=false;suspend();});
 window.addEventListener('pointerup',()=>{if(start){start=null;state.pointer=false;}});
 el.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 el.addEventListener('mouseenter',()=>{if(matchMedia('(hover:hover)').matches)state.pointer=true;});el.addEventListener('mouseleave',()=>{state.pointer=false;});
}
const questions=['中古包重点看哪些细节？','怎么辨别美妆小样？','二手包大概什么价？','这双鞋是正品吗？','如何判断手表成色？','穿搭怎么更有质感？','皮肤类型怎么判断？','哪些护肤品适合我？','奢侈品怎么辨别真假？','包袋如何保养？','玉石有哪些鉴别要点？','如何搭配日常三餐？'];
const tickerRows=[];
function createTicker(){
 $('ticker').innerHTML=[0,1,2].map(row=>{const items=questions.filter((_,i)=>i%3===row);const html=items.map((t,i)=>`<button class="suggestion-item" type="button" data-question="${escaped(t)}"><i aria-hidden="true" class="suggestion-dot ${(i+row)%2?'a':'b'}"></i><span class="suggestion-text">${t}</span></button>`).join('');return `<div class="suggestion-row"><div class="suggestion-track"><div class="ticker-set" style="display:flex;gap:7px">${html}</div><div class="ticker-set" aria-hidden="true" style="display:flex;gap:7px">${html}</div></div></div>`;}).join('');
 document.querySelectorAll('.suggestion-track').forEach((el,i)=>{el.querySelectorAll('[aria-hidden="true"] button').forEach(b=>b.tabIndex=-1);const r={el,x:i===1?-120:-i*68,width:0,dir:i===1?1:-1,drag:false,last:0};tickerRows.push(r);let down=null;
 el.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,base:r.x};r.drag=true;r.last=e.clientX;});el.addEventListener('pointermove',e=>{if(!down)return;if(Math.abs(e.clientX-down.x)>8){el.setPointerCapture(e.pointerId);r.x=down.base+e.clientX-down.x;}});
 el.addEventListener('pointerup',e=>{if(down&&Math.abs(e.clientX-down.x)>8){el.dataset.noClick=String(Date.now()+300);}down=null;r.drag=false;});el.addEventListener('pointercancel',()=>{down=null;r.drag=false;});el.addEventListener('mouseenter',()=>r.hover=true);el.addEventListener('mouseleave',()=>r.hover=false);
 });
}
let lastFrame=0;
function tick(now){const dt=Math.min((now-lastFrame)/1000||0,.05);lastFrame=now;tickerRows.forEach(r=>{r.width=r.el.firstElementChild.getBoundingClientRect().width+7;if(!r.drag&&!r.hover&&!blocked())r.x+=r.dir*7*dt;if(r.width){r.x=((r.x%r.width)-r.width)%r.width;r.el.style.transform=`translate3d(${r.x}px,0,0)`;}});requestAnimationFrame(tick);}
function syncInput(){const input=$('inputField');$('wordCount').textContent=`${input.value.length}/250`;$('sendBtn').classList.toggle('active',!!input.value.trim()||state.photos.length>0);$('inputWrap').classList.toggle('focus',document.activeElement===input||!!input.value);}
function renderPhotos(){const tray=$('attachmentTray');tray.hidden=!state.photos.length;tray.innerHTML=state.photos.map((p,i)=>`<span class="attachment"><img src="${p.url}" alt="待咨询照片 ${i+1}"><button type="button" data-remove="${i}" aria-label="移除照片 ${i+1}">×</button></span>`).join('');syncInput();}
function appendMessage(text,kind,photos=[]){const el=document.createElement('div');el.className='message '+kind;photos.forEach(p=>{const img=document.createElement('img');img.src=p.url;img.alt='本地上传照片';el.append(img);});const copy=document.createElement('span');copy.textContent=text;el.append(copy);$('messages').append(el);$('messages').scrollTop=$('messages').scrollHeight;}
function sendMessage(){if(state.busy)return;const input=$('inputField'),value=input.value.trim();if(!value&&!state.photos.length){toast('请先输入问题或上传照片');input.focus();return;}
 $('conversationPanel').hidden=false;appendMessage((state.selected?`[${state.selected}]\n`:'')+(value||'请帮我看看这件物品'), 'user',state.photos);input.value='';state.photos=[];renderPhotos();input.blur();state.busy=true;
 messageTimer=setTimeout(()=>{appendMessage('这是一段交互演示，尚未连接真实鉴定服务。\n\n'+(state.selected?`你已选择「${state.selected}」。`:'你可以先选择一个鉴定技能。')+'实际服务可在接入后，根据照片和问题继续咨询。图片当前仅在本机预览，没有上传。','assistant');state.busy=false;},650);
}
createCards();createTicker();renderPopup();updateSkillBtn();setBanner(0);requestAnimationFrame(tick);
$('skillGrid').onclick=e=>{const card=e.target.closest('[data-index]');if(card)selectSkill(skills[Number(card.dataset.index)].label);};
$('prevSkill').onclick=()=>moveSkill(-1,true);$('nextSkill').onclick=()=>moveSkill(1,true);$('motionControl').onclick=toggleMotion;
$('skillCarousel').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();moveSkill(e.key==='ArrowLeft'?-1:1,true);}});
bindSwipe($('skillCarousel'),dir=>moveSkill(dir,true));bindSwipe($('bannerViewport'),dir=>setBanner(state.banner+dir,true));
$('bannerDots').onclick=e=>{const b=e.target.closest('[data-page]');if(b)setBanner(Number(b.dataset.page),true);};
$('bannerTrack').onclick=e=>{const b=e.target.closest('[data-banner]');if(!b)return;const n=Number(b.dataset.banner);if(n===0)openPopup();else if(n===1)setTab('expert');else selectSkill('估价格');};
$('skillList').onclick=e=>{const item=e.target.closest('[data-skill]');if(item)selectSkill(item.dataset.skill);};$('skillBtn').onclick=openPopup;$('popupClose').onclick=closePopup;$('sheetMask').onclick=closePopup;
$('ticker').onclick=e=>{const b=e.target.closest('[data-question]');if(!b)return;const track=b.closest('.suggestion-track');if(Number(track.dataset.noClick)>Date.now())return;$('inputField').value=b.dataset.question;syncInput();suspend();$('inputField').focus();};
$('inputField').addEventListener('input',syncInput);$('inputField').addEventListener('focus',()=>{syncInput();suspend();});$('inputField').addEventListener('blur',syncInput);$('inputField').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();sendMessage();}});
$('sendBtn').onclick=sendMessage;$('uploadBtn').onclick=()=>$('photoInput').click();$('photoInput').onchange=e=>{for(const file of e.target.files){if(!file.type.startsWith('image/')){toast('请选择图片文件');continue;}if(file.size>12*1024*1024){toast('单张照片请小于 12MB');continue;}if(state.photos.length>=3){toast('最多选择 3 张照片');break;}state.photos.push({url:URL.createObjectURL(file),name:file.name});}e.target.value='';renderPhotos();suspend();};$('attachmentTray').onclick=e=>{const b=e.target.closest('[data-remove]');if(b){const i=Number(b.dataset.remove);URL.revokeObjectURL(state.photos[i].url);state.photos.splice(i,1);renderPhotos();}};
$('closeConversation').onclick=()=>{$('conversationPanel').hidden=true;suspend();};
const menu=document.querySelector('.icon-menu');menu.onclick=e=>{e.stopPropagation();$('menuPanel').hidden=!$('menuPanel').hidden;};$('menuSkills').onclick=openPopup;$('menuMotion').onclick=()=>{toggleMotion();$('menuPanel').hidden=true;};$('newConversation').onclick=()=>{clearTimeout(messageTimer);state.busy=false;$('messages').replaceChildren();$('conversationPanel').hidden=true;$('menuPanel').hidden=true;setTab('ai');toast('已开始新的咨询');};document.addEventListener('click',e=>{if(!e.target.closest('.menu-panel')&&!e.target.closest('.icon-menu'))$('menuPanel').hidden=true;});
// Retain original expert interactions and content. No payment or real order is submitted.
let agreed=false;$('agreeRow').onclick=e=>{if(e.target.id==='agreeLink'){state.focusReturn=document.activeElement;$('agreeSheet').classList.add('show');$('sheetMask').classList.add('show');return;}agreed=!agreed;$('agreeCheck').classList.toggle('on',agreed);$('agreeCheck').textContent=agreed?'✓':'';};$('expertCta').onclick=()=>{if(!agreed){$('agreeCheck').classList.add('on');setTimeout(()=>{if(!agreed)$('agreeCheck').classList.remove('on');},1450);toast('请先阅读并勾选服务协议');}else toast('这是首页演示，专家下单服务尚未接入');};
document.querySelectorAll('.home-mode-tab-item').forEach(el=>el.onclick=()=>setTab(el.dataset.tab));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePopup();$('menuPanel').hidden=true;$('conversationPanel').hidden=true;}if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"],[role="tab"]')){e.preventDefault();e.target.click();}if(e.key==='Tab'&&$('skillPopup').classList.contains('show')){const focusables=[...$('skillPopup').querySelectorAll('button,[tabindex="0"]')];const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
new ResizeObserver(()=>positionCards(true)).observe($('skillCarousel'));
skillTimer=setInterval(()=>{if(!blocked()&&Date.now()>state.holdUntil)moveSkill(1);},5200);bannerTimer=setInterval(()=>{if(!blocked()&&Date.now()>state.bannerHold&&Date.now()>state.holdUntil)setBanner(state.banner+1);},7800);
if(new URLSearchParams(location.search).get('tab')==='expert')setTab('expert');else setTab('ai');
window.addEventListener('pagehide',()=>{state.photos.forEach(p=>URL.revokeObjectURL(p.url));});
