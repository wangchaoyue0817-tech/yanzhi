/* URL-addressable local service workflow; history preserves each user's navigation path. */
(() => {
  'use strict';
  const offline = window.offlineAppraisal;
  if (!offline) return;
  let syncing = false;
  const allowed = new Set(['offline','offline-checkout','offline-shipping','offline-success','offline-orders','offline-progress','offline-report']);
  const readRoute = () => {const params=new URLSearchParams(location.search);return {view:params.get('view')||'',id:params.get('order')||''};};
  function writeRoute(view,id,replace=false,extra={}) {
    const url=new URL(location.href);url.searchParams.set('tab','expert');url.searchParams.set('view',view);
    if(id)url.searchParams.set('order',id);else url.searchParams.delete('order');
    const data=replace?{...(history.state||{}),...extra}:{jxOffline:true,...extra};
    history[replace?'replaceState':'pushState'](data,'',url);
  }
  function show(view,id) {
    const next=window.offlineOrders?.resolve(view,id)||{view,id};
    syncing=true;
    if(state.tab!=='expert')setTab('expert',{updateHistory:false});
    offline.open();
    if(next.view==='offline'){
      window.offlineOrders?.hide();document.title='图灵评鉴 · 图灵鉴X';document.getElementById('pageScroll').scrollTop=0;
    }else window.offlineOrders?.show(next.view,next.id);
    syncing=false;
    return next;
  }
  function navigate(view,id='',{replace=false}={}) {
    if(!allowed.has(view))return;
    const before=readRoute();
    const next=show(view,id);
    writeRoute(next.view,next.id,replace || (before.view===next.view && before.id===next.id));
  }
  function restoreRoute() {
    const route=readRoute();
    if(allowed.has(route.view)){
      const next=show(route.view,route.id);
      if(next.view!==route.view || next.id!==route.id)writeRoute(next.view,next.id,true);
    }else{
      syncing=true;
      // Going back to the expert home restores the position and entry focus.
      const tab=new URLSearchParams(location.search).get('tab')==='expert'?'expert':'ai';
      if(tab==='expert' && state.tab==='expert')offline.close(true);
      else {offline.close(false);setTab(tab,{updateHistory:false});}
      syncing=false;document.title='图灵鉴X · 首页';
    }
  }
  function back() {
    if(history.state?.jxOffline || history.state?.offlineFromExpert){history.back();return;}
    const {view,id}=readRoute();
    const parent=view==='offline-report'?'offline-progress':view==='offline-checkout'||view==='offline-orders'?'offline':'offline-orders';
    if(view==='offline'){offline.close(true);return;}
    navigate(parent,parent==='offline-progress'?id:'',{replace:true});
  }
  document.addEventListener('offline:open',()=>{if(!syncing){window.offlineOrders?.hide();writeRoute('offline','',false,{offlineFromExpert:true});document.title='图灵评鉴 · 图灵鉴X';}});
  document.addEventListener('offline:close',event=>{
    if(syncing)return;
    if(event.detail.restoreFocus && (history.state?.jxOffline || history.state?.offlineFromExpert)){history.back();return;}
    const url=new URL(location.href);url.searchParams.delete('view');url.searchParams.delete('order');url.searchParams.set('tab','expert');
    history.replaceState(null,'',url);document.title='图灵鉴X · 首页';
  });
  window.offlineRouter={navigate,back,closeForTab(){
    const wasOpen=offline.isOpen;const before=syncing;syncing=true;offline.close(false);syncing=before;return wasOpen;
  }};
  window.addEventListener('popstate',restoreRoute);
  if(allowed.has(readRoute().view))restoreRoute();
})();
