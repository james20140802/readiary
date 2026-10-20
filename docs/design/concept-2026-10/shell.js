// 시안 공용 틀: 모바일 탭 바, 데스크톱 사이드바, 상단 바 재질 전환
const I = {
  today:'<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
  books:'<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  social:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  me:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell:'<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
};
const svg = k => `<svg viewBox="0 0 24 24">${I[k]}</svg>`;
const NAV = [['today','오늘','home2.html'],['books','책장','books.html'],['social','소셜','social.html'],['me','나','me.html']];
const cur = document.body.dataset.tab;

document.body.insertAdjacentHTML('afterbegin', '<div class="ruled" aria-hidden="true"></div>');
if (cur !== 'none') document.body.insertAdjacentHTML('beforeend',
  `<nav class="tabbar" aria-label="주요 메뉴">${NAV.map(([k,l,h])=>`<a class="tab ${k===cur?'on':''}" href="${h}" ${k===cur?'aria-current="page"':''}>${svg(k)}${l}</a>`).join('')}</nav>
   <aside class="sidebar" aria-label="주요 메뉴"><div class="brand">Readiary</div>
     ${NAV.map(([k,l,h])=>`<a class="${k===cur?'on':''}" href="${h}" ${k===cur?'aria-current="page"':''}>${svg(k)}${l}</a>`).join('')}
     <div style="height:14px"></div>
     <a href="search.html" ${cur==='search'?'class="on"':''}>${svg('search')}찾기</a><a href="notifications.html" class="${cur==='bell'?'on':''} has-dot">${svg('bell')}알림</a>
     <div class="grow"></div>
     <a class="btn ink press" href="book-new.html" style="color:var(--paper);justify-content:center;height:46px;border-radius:23px">${svg('plus').replace('<svg','<svg style="color:var(--paper)"')}책 등록</a>
   </aside>`);
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = svg(el.dataset.icon));

// 장 높이 = 실제 보이는 화면 높이. 폭이 바뀔 때만 다시 잰다(주소창이 접히는 스크롤 중에는 고정해 장이 출렁이지 않게).
let vw0 = 0;
const setVH = () => { if (innerWidth === vw0) return; vw0 = innerWidth; document.documentElement.style.setProperty('--vh', innerHeight + 'px'); };
setVH(); addEventListener('resize', setVH);

// 상단 바 재질과 제목. 스크롤 이벤트 대신 IntersectionObserver.
const nav = document.querySelector('.navbar'), sentinel = document.querySelector('.top-sentinel');
const leaves = [...document.querySelectorAll('.snap .leaf')];
if (nav && leaves.length) {
  // 장 넘김 화면: 60% 이상 보이는 장 중 가장 뒤의 장이 지금 장 (sticky라 덮인 장도 보이는 것으로 잡힘)
  const tt = nav.querySelector('.title'), seen = new Set();
  const io = new IntersectionObserver(es => {
    for (const e of es) e.intersectionRatio >= .6 ? seen.add(e.target) : seen.delete(e.target);
    const c = leaves.filter(l => seen.has(l)).pop() || leaves[0];
    if (c.dataset.title && tt) tt.textContent = c.dataset.title;
    nav.classList.toggle('scrolled', c !== leaves[0]);
  }, {threshold:[0,.6,1]});
  leaves.forEach(l => io.observe(l));
} else if (nav && sentinel) {
  new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);
}

// 데스크톱 전환 버튼: 보이는 장에 맞춰 강조
const dsegLinks=[...document.querySelectorAll('.dseg a')];
if (dsegLinks.length) {
  const io2=new IntersectionObserver(es=>{for(const e of es) if(e.isIntersecting){
    dsegLinks.forEach(a=>a.classList.toggle('on', a.getAttribute('href')==='#'+e.target.id));}},{threshold:.55});
  document.querySelectorAll('.dleaf[id]').forEach(s=>io2.observe(s));
}

// 시트 열기·닫기: [data-open="id"] → dialog#id. 바깥(배경)을 누르거나 [data-close]로 닫는다.
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]');
  if (o) { e.preventDefault(); document.getElementById(o.dataset.open)?.showModal(); return; }
  const c = e.target.closest('[data-close]');
  if (c) { e.preventDefault(); c.closest('dialog')?.close(); if (c.dataset.toast) toast(c.dataset.toast); return; }  // 닫으며 알릴 것도 있다
  if (e.target.matches('dialog.bsheet')) e.target.close();
  const s = e.target.closest('.switch');
  if (s) s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true');
  const t = e.target.closest('[data-toast]');
  if (t) toast(t.dataset.toast);
  const g = e.target.closest('.seg2 button');
  if (g) g.parentNode.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b === g); b.setAttribute('aria-selected', b === g); });
});
function toast(msg){ let el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role','status'); document.body.append(el); }
  el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1800); }
