// 想法圖：視角 → 想法 → 成果。只畫 ideas.json 明寫的關係；漂浮動效沿用 Control Room 的 particles.js。
import { attachParticleMotion } from './particles.js';
import { esc, STATUS } from './site.js';

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.append(el);
  return el;
};

export function mountIdeaGraph(root, data, { filters = true } = {}) {
  const lenses = data.lenses, ideas = data.ideas, outcomes = data.outcomes;
  const byId = new Map([...lenses.map(n => [n.id, { ...n, kind: 'lens' }]), ...ideas.map(n => [n.id, { ...n, kind: 'idea' }]), ...outcomes.map(n => [n.id, { ...n, kind: 'outcome' }])]);
  const edges = [];
  for (const i of ideas) {
    for (const l of i.lenses || []) edges.push({ from: l, to: i.id });
    for (const o of i.outcomes || []) edges.push({ from: i.id, to: o });
  }

  root.classList.add('ig');
  root.innerHTML = `${filters ? `<div class="ig-filter" role="group" aria-label="依方向篩選">
      <button type="button" data-group="" aria-pressed="true">全部</button>
      ${Object.entries(data.groups).map(([k, g]) => `<button type="button" data-group="${esc(k)}" aria-pressed="false">${esc(g.label)}</button>`).join('')}
    </div>` : ''}
    <div class="ig-stage"></div>
    <div class="ig-legend">${Object.entries(STATUS).map(([k, v]) => `<span><span class="dot s-${k}"></span>${v}</span>`).join('')}</div>
    <div class="ig-card" aria-live="polite"></div>`;
  const stage = root.querySelector('.ig-stage'), card = root.querySelector('.ig-card');
  let motion = null, pinned = null, group = '', compact = null, nodeEls = new Map(), edgeEls = [];

  const related = id => {
    const set = new Set([id]);
    const n = byId.get(id);
    const ideaIds = n.kind === 'idea' ? [id]
      : n.kind === 'lens' ? ideas.filter(i => i.lenses.includes(id)).map(i => i.id)
      : ideas.filter(i => i.outcomes.includes(id)).map(i => i.id);
    for (const iid of ideaIds) {
      const i = byId.get(iid); set.add(iid);
      i.lenses.forEach(x => set.add(x)); i.outcomes.forEach(x => set.add(x));
    }
    if (n.kind === 'lens') { set.forEach(x => { const m = byId.get(x); if (m.kind === 'lens' && x !== id) set.delete(x); }); }
    return set;
  };

  const highlight = set => {
    root.classList.toggle('dim', !!set);
    for (const [id, el] of nodeEls) el.classList.toggle('on', !!set && set.has(id));
    for (const e of edgeEls) e.element.classList.toggle('on', !!set && set.has(e.from) && set.has(e.to));
  };

  const groupSet = g => {
    if (!g) return null;
    const s = new Set();
    ideas.filter(i => i.group === g).forEach(i => { s.add(i.id); i.lenses.forEach(x => s.add(x)); i.outcomes.forEach(x => s.add(x)); });
    return s;
  };

  const showCard = id => {
    if (!id) {
      card.innerHTML = `<div class="eyebrow">Idea tracker · 更新 ${esc(data.updated)}</div>
        <h4 class="serif">${ideas.length} 個公開的想法，正在從觀察長成作品。</h4>
        <p>點一個節點，看它屬於哪個視角、現在走到哪一步、通往哪個案例。</p>`;
      return;
    }
    const n = byId.get(id);
    if (n.kind === 'idea') {
      const outs = n.outcomes.map(o => byId.get(o)).filter(Boolean);
      card.innerHTML = `<div class="meta"><span class="chip"><span class="dot s-${esc(n.status)}"></span>${esc(STATUS[n.status])}</span>
          <span class="chip">${esc(data.groups[n.group]?.label)}</span><span class="chip">更新 ${esc(n.updated)}</span></div>
        <h4 class="serif">${esc(n.label)}</h4><p>${esc(n.desc)}</p>
        <div class="meta">${outs.map(o => `<a href="${esc(o.href)}">→ ${esc(o.label)}</a>`).join('')}</div>`;
    } else if (n.kind === 'lens') {
      const cnt = ideas.filter(i => i.lenses.includes(id)).length;
      card.innerHTML = `<div class="eyebrow">視角</div><h4 class="serif">${esc(n.label)}</h4><p>${esc(n.desc)}</p><p>連到 ${cnt} 個想法。</p>`;
    } else {
      const cnt = ideas.filter(i => i.outcomes.includes(id)).length;
      card.innerHTML = `<div class="eyebrow">${n.type === 'case' ? '案例' : '札記'}</div><h4 class="serif">${esc(n.label)}</h4>
        <p>由 ${cnt} 個想法匯聚而成。</p><a href="${esc(n.href)}">打開 →</a>`;
    }
  };

  function layout(isCompact) {
    const pos = new Map();
    const order = Object.keys(data.groups);
    const sorted = [...ideas].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
    let W, H;
    if (!isCompact) {
      W = 680; const top = 44, gap = 34; H = top + sorted.length * gap + 10;
      sorted.forEach((n, k) => pos.set(n.id, { x: 270, y: top + k * gap + 8 }));
      const span = (arr, x) => arr.forEach((n, k) => pos.set(n.id, { x, y: top + 8 + (sorted.length - 1) * gap * (arr.length === 1 ? .5 : k / (arr.length - 1)) }));
      span(lenses, 96); span(outcomes, 528);
    } else {
      W = 360; const top = 104, gap = 38;
      lenses.forEach((n, k) => pos.set(n.id, { x: 36 + k * (288 / (lenses.length - 1)), y: 46 }));
      sorted.forEach((n, k) => pos.set(n.id, { x: 22, y: top + k * gap }));
      const oy = top + sorted.length * gap + 20;
      outcomes.forEach((n, k) => pos.set(n.id, { x: 22 + (k % 2) * 172, y: oy + Math.floor(k / 2) * 36 }));
      H = oy + Math.ceil(outcomes.length / 2) * 36;
    }
    return { pos, W, H, sorted };
  }

  function render() {
    const isCompact = stage.clientWidth < 520;
    if (isCompact === compact) return;
    compact = isCompact;
    motion?.cleanup();
    const { pos, W, H } = layout(isCompact);
    stage.innerHTML = '';
    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '想法圖：視角、想法與成果的關係' }, stage);
    stage.classList.toggle('compact', isCompact);
    if (!isCompact) {
      [['視角 Lens', 96], ['想法 Ideas', 270], ['成果 Outcomes', 528]].forEach(([t, x]) => { const e = mk('text', { x, y: 14, class: 'col-label', 'text-anchor': x === 96 ? 'end' : 'start' }, svg); e.textContent = t; });
    } else {
      const e = mk('text', { x: 22, y: 12, class: 'col-label' }, svg); e.textContent = '視角 → 想法 → 成果';
    }
    const gE = mk('g', {}, svg), gN = mk('g', {}, svg);
    edgeEls = edges.map(e => {
      const a = pos.get(e.from), b = pos.get(e.to);
      return { ...e, element: mk('line', { class: 'edge', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, gE) };
    });
    nodeEls = new Map();
    const points = [];
    for (const [id, n] of byId) {
      const p = pos.get(id);
      const g = mk('g', { class: `node ${n.kind}`, tabindex: 0, role: 'button', 'aria-label': `${n.label}${n.status ? '，' + STATUS[n.status] : ''}` }, gN);
      const inner = mk('g', { transform: `translate(${p.x} ${p.y})` }, g);
      mk('circle', { class: 'ring', r: 11 }, inner);
      if (n.kind === 'lens') mk('circle', { r: 7, fill: 'var(--accent)' }, inner);
      else if (n.kind === 'outcome') mk('rect', { x: -5, y: -5, width: 10, height: 10, rx: 2, fill: n.type === 'case' ? 'var(--ink)' : 'var(--muted)' }, inner);
      else if (n.status === 'observe') mk('circle', { r: 5.5, fill: 'var(--paper)', stroke: 'var(--s-observe)', 'stroke-width': 1.6 }, inner);
      else mk('circle', { r: 6, fill: `var(--s-${n.status})` }, inner);
      const t = mk('text', { y: 4.5 }, inner);
      t.textContent = n.label;
      if (n.kind === 'lens' && !isCompact) { t.setAttribute('x', -14); t.setAttribute('text-anchor', 'end'); }
      else if (n.kind === 'lens') { t.setAttribute('y', 26); t.setAttribute('text-anchor', 'middle'); }
      else t.setAttribute('x', 14);
      const bb = { w: n.kind === 'lens' && isCompact ? 60 : 16 + n.label.length * 13 };
      mk('rect', { class: 'hit', x: n.kind === 'lens' && !isCompact ? -bb.w : -12, y: -14, width: bb.w + 12, height: n.kind === 'lens' && isCompact ? 50 : 28 }, inner);
      nodeEls.set(id, g);
      points.push({ key: id, x: p.x, y: p.y, element: g, amplitude: n.kind === 'idea' ? 4 : 2.5 });
      const enter = () => { if (!pinned) highlight(related(id)); };
      const leave = () => { if (!pinned) highlight(groupSet(group)); };
      const pick = () => {
        pinned = pinned === id ? null : id;
        highlight(pinned ? related(pinned) : groupSet(group));
        showCard(pinned);
      };
      g.addEventListener('pointerenter', enter); g.addEventListener('pointerleave', leave);
      g.addEventListener('focus', enter); g.addEventListener('blur', leave);
      g.addEventListener('click', pick);
      g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } });
    }
    // particles.js 對外層 g 加漂浮位移，並把連線端點移到「基準位置＋位移」。
    motion = attachParticleMotion(svg, points, edgeEls);
    highlight(pinned ? related(pinned) : groupSet(group));
  }

  root.querySelectorAll('.ig-filter button').forEach(b => b.addEventListener('click', () => {
    group = b.dataset.group; pinned = null;
    root.querySelectorAll('.ig-filter button').forEach(x => x.setAttribute('aria-pressed', x === b));
    highlight(groupSet(group)); showCard(null);
  }));

  showCard(null);
  render();
  new ResizeObserver(render).observe(stage);
}

// 首屏背景：很淡的漂浮粒子。reduced-motion 或分頁隱藏時停止。
export function mountBackground(canvas) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, raf = 0, pts = [];
  const color = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#A24D3C';
  const size = () => {
    const r = canvas.getBoundingClientRect(), d = devicePixelRatio || 1;
    w = r.width; h = r.height; canvas.width = w * d; canvas.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.round(Math.min(60, w * h / 16000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, r: Math.random() * 1.4 + .6 }));
  };
  const draw = (move) => {
    ctx.clearRect(0, 0, w, h);
    const c = color();
    for (const p of pts) {
      if (move) { p.x = (p.x + p.vx + w) % w; p.y = (p.y + p.vy + h) % h; }
      ctx.globalAlpha = .35; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = c; ctx.lineWidth = .6;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 90) { ctx.globalAlpha = .12 * (1 - d / 90); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
  };
  const loop = () => { draw(true); raf = requestAnimationFrame(loop); };
  const sync = () => { cancelAnimationFrame(raf); raf = 0; if (reduce.matches || document.hidden) draw(false); else loop(); };
  size(); sync();
  new ResizeObserver(() => { size(); sync(); }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener?.('change', sync);
}
