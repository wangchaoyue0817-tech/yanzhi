/* Keep the secondary service addressable, with real browser back/forward support. */
(() => {
  const offline = window.offlineAppraisal;
  if (!offline) return;
  let syncing = false;
  document.addEventListener('offline:open', () => {
    if (syncing) return;
    const url = new URL(location.href);
    url.searchParams.set('tab', 'expert');
    url.searchParams.set('view', 'offline');
    history.pushState({ offlineFromExpert: true }, '', url);
    document.title = '图灵评鉴 · 图灵鉴X';
  });
  document.addEventListener('offline:close', event => {
    if (syncing) return;
    document.title = '图灵鉴X · 首页';
    if (event.detail.restoreFocus && history.state?.offlineFromExpert) {
      history.back();
    } else {
      const url = new URL(location.href);
      url.searchParams.delete('view');
      url.searchParams.set('tab', 'expert');
      history.replaceState(null, '', url);
    }
  });
  window.offlineRouter = {
    closeForTab() {
      const wasOpen = offline.isOpen;
      const previous = syncing;
      syncing = true;
      offline.close(false);
      syncing = previous;
      document.title = '图灵鉴X · 首页';
      return wasOpen;
    }
  };
  function restoreRoute() {
    const params = new URLSearchParams(location.search);
    const isOffline = params.get('view') === 'offline';
    syncing = true;
    const tab = isOffline || params.get('tab') === 'expert' ? 'expert' : 'ai';
    if (isOffline) {
      if (state.tab !== 'expert') setTab('expert');
      offline.open();
      const url = new URL(location.href);
      url.searchParams.set('view', 'offline');
      history.replaceState(history.state, '', url);
      document.title = '图灵评鉴 · 图灵鉴X';
    } else {
      if (tab === 'expert' && state.tab === 'expert') offline.close(true);
      else setTab(tab);
      document.title = '图灵鉴X · 首页';
    }
    syncing = false;
  }
  window.addEventListener('popstate', restoreRoute);
  if (new URLSearchParams(location.search).get('view') === 'offline') restoreRoute();
})();
