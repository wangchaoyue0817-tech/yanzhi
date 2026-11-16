/* Task events own the timeline; the clock only updates elapsed time. */
(function (root) {
  'use strict';

  const technicalCopy = /[{}<>`]|\b(?:sandbox|skills?|mcp(?:_call)?|appraise_\w*|function|const|undefined|traceback|worked\s+for)\b|\b[\w.-]+\.(?:md|py|[cm]?js|tsx?|jsx|json|ya?ml|sh|css|html|log|env)\b|(?:https?:\/\/|(?:^|\s)(?:\/|[a-z]:[\\/])|\b(?:src|skills|scripts|public|node_modules)\/)|\b[a-z]+\w*_[a-z]\w*\b|演示|示例|示范|\b(?:demo|mock|fixture)\b/iu;

  function publicText(value, fallback, limit = 160) {
    if (typeof value !== 'string') return fallback;
    const text = value.replace(/\s+/gu, ' ').trim();
    if (!text || technicalCopy.test(text)) return fallback;
    return Array.from(text).slice(0, limit).join('');
  }
  function clock(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }
  function createState(startedAt = Date.now()) {
    const time = clock(startedAt, Date.now());
    return { startedAt: time, endedAt: null, lastEventAt: time, status: 'running', steps: [], result: null, error: '', retryable: true, progress: null, seen: new Set() };
  }
  function addTechnical(step, value) {
    const lines = Array.isArray(value) ? value : [value];
    for (const line of lines) {
      if (typeof line !== 'string' || !line.trim()) continue;
      const record = line.trim().slice(0, 16000);
      if (!step.technical.includes(record)) step.technical.push(record);
    }
  }
  function validResult(result) {
    if (typeof result === 'string') return !!result.trim();
    if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
    return (typeof result.title === 'string' && !!result.title.trim()) ||
      (Array.isArray(result.paragraphs) && result.paragraphs.some(item => typeof item === 'string' && !!item.trim()));
  }
  function applyEvent(state, event, now = Date.now()) {
    if (!state || state.status !== 'running' || !event || typeof event !== 'object') return false;
    const key = typeof event.eventId === 'string' && event.eventId.trim() ? event.eventId : null;
    if (key && state.seen.has(key)) return false;
    const time = Math.max(state.startedAt, clock(now, state.lastEventAt));

    if (event.type === 'step') {
      if (typeof event.id !== 'string' || !event.id.trim() || !['active', 'done'].includes(event.status)) return false;
      const id = event.id.trim();
      let step = state.steps.find(item => item.id === id);
      if (step?.status === 'done' && event.status === 'active') return false;
      if (!step) {
        step = { id, title: publicText(event.title, '正在处理任务', 80), detail: publicText(event.detail, '正在处理当前环节'), status: event.status, technical: [], startedAt: time, updatedAt: time };
        state.steps.push(step);
      } else {
        if (event.title !== undefined) step.title = publicText(event.title, '正在处理任务', 80);
        if (event.detail !== undefined) step.detail = publicText(event.detail, '正在处理当前环节');
        step.status = event.status;
        step.updatedAt = time;
      }
      if (event.status === 'active') {
        for (const previous of state.steps) {
          if (previous !== step && previous.status === 'active') previous.status = 'done';
        }
      }
      addTechnical(step, event.technical);
    } else if (event.type === 'heartbeat') {
      // Keep the current stage. A heartbeat never invents a new activity.
    } else if (event.type === 'progress') {
      if (event.value === null) state.progress = null;
      else if (typeof event.value === 'number' && Number.isFinite(event.value) && event.value >= 0 && event.value <= 100) state.progress = Math.min(99, event.value);
      else return false;
    } else if (event.type === 'complete') {
      if (!validResult(event.result)) return false;
      state.result = event.result;
      state.status = 'complete';
      state.endedAt = time;
      if (state.progress !== null) state.progress = 100;
      state.steps.forEach(step => { step.status = 'done'; });
    } else if (event.type === 'error' || event.type === 'stop') {
      state.status = event.type === 'error' ? 'error' : 'stopped';
      state.endedAt = time;
      state.retryable = event.retryable !== false;
      state.error = event.type === 'error' ? publicText(event.message, '暂时无法完成处理，请重试') : '';
      state.steps.forEach(step => { if (step.status === 'active') step.status = state.status; });
    } else return false;

    state.lastEventAt = time;
    if (key) state.seen.add(key);
    return true;
  }
  function elapsedLabel(state, now) {
    const seconds = Math.max(0, Math.floor(((state.endedAt ?? clock(now, state.startedAt)) - state.startedAt) / 1000));
    return seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)}分 ${String(seconds % 60).padStart(2, '0')}秒`;
  }
  function view(state, now = Date.now()) {
    const current = state.status === 'running' ? [...state.steps].reverse().find(step => step.status === 'active') : null;
    const currentIndex = current ? state.steps.indexOf(current) : state.steps.length - 1;
    const recent = state.steps.slice(Math.max(0, currentIndex - 2), currentIndex + 1);
    const recentSet = new Set(recent.map(step => step.id));
    const waiting = state.status === 'running' && clock(now, state.lastEventAt) - state.lastEventAt >= 30000;
    return {
      title: state.status === 'complete' ? '分析完成' : state.status === 'error' ? '处理暂未完成' : state.status === 'stopped' ? '分析已停止' : current?.title || '正在处理任务',
      detail: state.status === 'complete' ? '鉴定结论已生成' : state.status === 'error' ? state.error : state.status === 'stopped' ? '可重新发起鉴定' : waiting ? '仍在处理当前环节，请稍候' : current?.detail || '等待任务进展',
      elapsedLabel: elapsedLabel(state, now), status: state.status, progress: state.progress,
      currentId: current?.id || null, recentIds: recent.map(step => step.id),
      historyIds: state.steps.filter(step => !recentSet.has(step.id)).map(step => step.id),
      steps: state.steps
    };
  }

  root.JianxAppraisalProgress = Object.freeze({ createState, applyEvent, view });
})(typeof window !== 'undefined' ? window : globalThis);
