/* Finite, decorative score-reveal effects. No report state or third-party runtime. */
const activeCelebrations = new WeakMap();
const palettes = Object.freeze({
  natural: ['#dceaff', '#99b5ed', '#c6bbff'],
  fresh: ['#d9cfff', '#9aa9ff', '#9bddff'],
  radiant: ['#dfb4ff', '#b88cff', '#f5d3ff'],
  spotlight: ['#fff1b7', '#e7bb75', '#d8baff'],
  icon: ['#fff3bf', '#edbf76', '#d0a3ff', '#ffcfea'],
});

/** Pure configuration, including all node counts and the final removal deadline. */
export function getBeautyCelebrationConfig(score = 0) {
  const value = Number(score);
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const tier = normalized < 60 ? 'natural' : normalized < 75 ? 'fresh' : normalized < 85 ? 'radiant' : normalized < 95 ? 'spotlight' : 'icon';
  const spec = {
    natural: {duration:1500, scan:true, rings:0, motes:9, confetti:0, bursts:[]},
    fresh: {duration:1900, scan:false, rings:2, motes:13, confetti:0, bursts:[]},
    radiant: {duration:2450, scan:false, rings:1, motes:0, confetti:12, bursts:[{x:50,y:25,delay:130,rays:22,radius:104}]},
    spotlight: {duration:2700, scan:false, rings:1, motes:0, confetti:26, bursts:[{x:25,y:23,delay:120,rays:20,radius:91},{x:76,y:31,delay:580,rays:24,radius:104}]},
    icon: {duration:3000, scan:false, rings:2, motes:0, confetti:38, bursts:[{x:20,y:23,delay:80,rays:20,radius:100},{x:79,y:29,delay:330,rays:22,radius:112},{x:36,y:14,delay:650,rays:20,radius:97},{x:71,y:43,delay:950,rays:22,radius:105}]},
  }[tier];
  const bursts = spec.bursts.map(burst => Object.freeze({...burst}));
  // One overlay; each burst has one origin, one launch trail, and its rays.
  const nodeCount = 1 + Number(spec.scan) + spec.rings + spec.motes + spec.confetti + bursts.reduce((sum, burst) => sum + burst.rays + 2, 0);
  return Object.freeze({tier, score:normalized, ...spec, bursts:Object.freeze(bursts), colors:Object.freeze([...palettes[tier]]), nodeCount});
}

function setVariables(element, variables) {
  for (const [name, value] of Object.entries(variables)) element.style.setProperty(`--${name}`, String(value));
  return element;
}

/**
 * Starts once when the displayed score settles. Returns an idempotent disposer.
 * A second call on the same host immediately replaces the previous effect.
 * System reduced-motion always wins, including when a caller passes false.
 */
export function startBeautyCelebration({host, score = 0, reducedMotion = false} = {}) {
  const noop = () => {};
  if (!host || typeof host.appendChild !== 'function' || !host.ownerDocument?.createElement) return noop;
  activeCelebrations.get(host)?.();
  const document = host.ownerDocument;
  const clock = document.defaultView || globalThis;
  if (reducedMotion || clock.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return noop;
  const config = getBeautyCelebrationConfig(score);
  const layer = document.createElement('div');
  layer.className = `beauty-celebration beauty-celebration--${config.tier}`;
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('inert', '');
  layer.setAttribute('data-celebration-tier', config.tier);
  const scale = Math.min(1.3, Math.max(.72, (host.clientWidth || 350) / 350));
  let timer;
  let disposed = false;

  const add = (className, variables = {}, parent = layer) => {
    const element = document.createElement('i');
    element.className = `beauty-celebration-${className}`;
    setVariables(element, variables);
    parent.appendChild(element);
    return element;
  };
  const color = index => config.colors[index % config.colors.length];
  const px = number => `${number.toFixed(2)}px`;

  if (config.scan) add('scan');
  for (let index = 0; index < config.rings; index++) {
    add('halo', {delay:`${index * 220}ms`, color:color(index), turn:`${index ? 28 : -24}deg`});
  }
  for (let index = 0; index < config.motes; index++) {
    const angle = index * 2.399963;
    const radius = (78 + index % 4 * 23) * scale;
    add(config.tier === 'natural' ? 'gather' : 'star', {
      x:px(Math.cos(angle) * radius), y:px(Math.sin(angle) * radius),
      drift:px(Math.cos(angle) * 32), delay:`${index * 34}ms`, color:color(index),
      size:`${config.tier === 'natural' ? 3 : 4 + index % 3 * 2}px`,
    });
  }
  config.bursts.forEach((burst, burstIndex) => {
    const burstColor = color(burstIndex);
    const origin = add('firework', {x:`${burst.x}%`, y:`${burst.y}%`, delay:`${burst.delay}ms`, color:burstColor});
    add('launch', {x:`${burst.x}%`, y:`${burst.y}%`, delay:`${Math.max(0, burst.delay - 90)}ms`, color:burstColor});
    for (let index = 0; index < burst.rays; index++) {
      const angle = index / burst.rays * Math.PI * 2 + burstIndex * .45;
      const radius = burst.radius * scale * (index % 3 === 0 ? .68 : 1);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      add('ray', {
        x:px(x), y:px(y), 'end-x':px(x * 1.09), 'end-y':px(y + 35),
        angle:`${angle * 180 / Math.PI + 90}deg`, delay:`${burst.delay + index % 3 * 16}ms`,
        color:color(index + burstIndex), length:`${index % 3 === 0 ? 7 : 12}px`,
      }, origin);
    }
  });

  for (let index = 0; index < config.confetti; index++) {
    const side = index % 2 ? 1 : -1;
    const rain = config.tier === 'icon' && index % 3 === 0;
    const spread = (34 + index * 37 % 110) * scale;
    add(rain ? 'rain' : 'confetti', {
      left:rain ? `${8 + index * 23 % 85}%` : side < 0 ? '3%' : '97%',
      x:px(-side * spread), 'end-x':px(-side * spread * .76),
      y:px(-62 - index * 17 % 100), fall:px(170 + index * 29 % 140),
      turn:`${side * (185 + index * 47 % 270)}deg`,
      delay:`${rain ? 160 + index % 9 * 52 : 130 + index % 8 * 78}ms`,
      color:color(index), width:`${3 + index % 3}px`, height:`${6 + index % 4 * 2}px`,
    });
  }

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    if (timer !== undefined) clock.clearTimeout(timer);
    layer.remove();
    if (activeCelebrations.get(host) === cleanup) activeCelebrations.delete(host);
  };
  activeCelebrations.set(host, cleanup);
  host.appendChild(layer);
  timer = clock.setTimeout(cleanup, config.duration);
  return cleanup;
}
