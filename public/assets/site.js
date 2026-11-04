// 共用：頁首、頁尾、深淺色、讀取 /content 內容、案例卡與札記列。
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const cache = new Map();
export function load(name){
  if(!cache.has(name)) cache.set(name, fetch('/content/' + name, {cache:'no-cache'}).then(r => {
    if(!r.ok) throw new Error(name + ' ' + r.status);
    return r.headers.get('content-type')?.includes('json') || name.endsWith('.json') ? r.json() : r.text();
  }));
  return cache.get(name);
}

const NAV = [['work','Work','/work/'],['writing','Writing','/writing/'],['about','About','/about/']];

function header(){
  const page = document.body.dataset.page;
  const el = document.createElement('header');
  el.className = 'top';
  el.innerHTML = `<div class="wrap">
    <a class="brand" href="/">Gabriel Chun<small>Research · Design · Systems</small></a>
    <nav class="nav" aria-label="主要導覽">
      <ul id="nav-list">${NAV.map(([id,label,href]) => `<li><a href="${href}"${id===page?' aria-current="page"':''}>${label}</a></li>`).join('')}</ul>
      <button class="icon-btn" id="theme-btn" aria-label="切換深淺色">◐</button>
      <button class="icon-btn" id="menu-btn" aria-label="開啟選單" aria-expanded="false" aria-controls="nav-list">☰</button>
    </nav></div>`;
  document.body.prepend(el);
  const root = document.documentElement;
  el.querySelector('#theme-btn').addEventListener('click', () => {
    const cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try{ localStorage.setItem('theme', next); }catch(e){}
  });
  const mb = el.querySelector('#menu-btn'), list = el.querySelector('#nav-list');
  mb.addEventListener('click', () => {
    const open = list.classList.toggle('open');
    mb.setAttribute('aria-expanded', open); mb.textContent = open ? '✕' : '☰';
  });
}
function footer(){
  const f = document.createElement('footer');
  f.className = 'site';
  f.innerHTML = `<div class="wrap"><span>© 2026 Gabriel Chun · 內容來源：GitHub</span><span>本站不使用追蹤，也不蒐集訪客個人資料。</span></div>`;
  document.body.append(f);
}
try{ const t = localStorage.getItem('theme'); if(t) document.documentElement.dataset.theme = t; }catch(e){}
header(); footer();

export const STATUS = {observe:'觀察', research:'研究中', prototype:'原型', published:'已發表'};

export function caseCard(c){
  const flow = (c.flow||[]).map(esc).map(s => `<span>${s}</span>`).join('<i></i>');
  return `<a class="case" href="/work/view/?id=${encodeURIComponent(c.id)}">
    <div class="case-bar"><span>${esc(c.code)}</span><span class="chip"><span class="dot ${esc(c.status)}"></span>${esc(c.statusLabel)}</span></div>
    <div class="case-body"><h3 class="serif">${esc(c.title)}</h3><div class="domain">${esc(c.domain)}</div><p class="q">${esc(c.question)}</p></div>
    <div class="flow" aria-label="流程">${flow}</div>
    <div class="case-grid">
      <div><b>Question</b>${esc(c.question.length>26?c.question.slice(0,26)+'…':c.question)}</div>
      <div><b>Method</b>${esc((c.flow||[]).join(' → '))}</div>
      <div><b>Evidence</b>${(c.evidence||[]).length} 項可查證紀錄</div>
    </div></a>`;
}

export function logItem(w, ideas){
  const idea = ideas?.find(i => i.id === w.idea);
  const inner = `<span class="date">${esc(w.date)}</span>
    <div><h3 class="serif">${esc(w.title)}</h3><div class="from">${esc(w.category)}${idea?` · 源自想法 <em>${esc(idea.label)}</em>`:''}</div></div>
    <span class="chip"><span class="dot s-${esc(w.status)}"></span>${w.file?STATUS[w.status]:'撰寫中'}</span>`;
  return `<li>${w.file ? `<a href="/writing/view/?id=${encodeURIComponent(w.id)}">${inner}</a>` : `<div class="row">${inner}</div>`}</li>`;
}

export function fail(el, err){
  el.innerHTML = `<p class="loading">內容暫時讀不到（${esc(err.message)}）。</p>`;
}
