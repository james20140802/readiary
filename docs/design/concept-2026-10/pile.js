// 간지 묶음 공용: .pile 안의 간지(.lslip)를 DOM 순서 = 아래→위로 쌓는다.
// 깊이마다 오른쪽 아래로 조금씩 비켜 제각각 기울어, 아래 간지의 글이 다른 각도로 비친다(보이는 깊이는 4장까지).
// 맨 위 간지를 옆으로 밀면 빼냈다가 묶음 맨 아래로 가져다 둔다(아래 shuffle).
// 보이는 자리는 넷: 위에서 세 장 + 맨 아래 자리. 맨 아래 자리에는 가장 뒤의 장(방금 뒤로 넣은 장)을 두고,
// 그 사이 장들은 셋째와 맨 아래 사이에 숨긴다.
// 기울기는 자리가 아니라 종이마다 갖는다(data-t). 뒤로 들어갈 때마다 새로 정해져 맨 뒷장이 매번 다르게 놓이고,
// 앞으로 올라올수록 바로 서서 맨 위 장은 거의 수평이다.
const SLOT=[[0,0],[16,15],[32,30],[48,45]], MID=[40,37], TILT=[.22,.7,.85,1], TILT_MID=.9;
const tilt=(away)=>(away?-Math.sign(away):Math.random()<.5?-1:1)*(1.3+Math.random()*1.9);   // 1.3~3.2도, 직전 맨 뒷장과 반대로 기운다
const jit=()=>Math.round((Math.random()*2-1)*4);
function toss(s,away){s.dataset.t=tilt(away).toFixed(2);s.dataset.jx=jit();s.dataset.jy=jit();}
function lay(pile){const ss=[...pile.querySelectorAll(':scope>.lslip')], n=ss.length;
  ss.forEach((s,i)=>{const d=n-1-i, hid=n>4&&d>2&&i>0, k=n>4&&i===0?3:Math.min(d,3);
    const [x,y]=hid?MID:SLOT[k], f=hid?TILT_MID:TILT[k], j=k&&!hid?1:0;
    s.style.setProperty('--x',x+j*s.dataset.jx+'px');s.style.setProperty('--y',y+j*s.dataset.jy+'px');s.style.setProperty('--r',(s.dataset.t*f).toFixed(2)+'deg');
    s.style.zIndex=i+1;s.classList.toggle('top',i===n-1);s.setAttribute('aria-hidden',i===n-1?'false':'true');s.inert=i!==n-1;s.style.opacity=hid?0:'';});
  pile.style.marginBottom=Math.min(n-1,3)*15+10+'px';   // 비켜 쌓인 만큼 아래 자리를 비운다
  const box=pile.closest('[data-pile-box]')||pile.parentNode, pos=box.querySelector('.pos'), top=ss[n-1];
  if(pos&&top) pos.textContent=(top.dataset.name?top.dataset.name+' · ':'')+`${top.dataset.i}/${n}`;}
// 넘김 = 종이 한 장을 빼서 뒤에 가져다 두기 — 한 번의 이어진 움직임.
// 맨 위 간지가 옆으로, 다음 장과 겹치지 않을 때까지 빠졌다가(최소 48px은 화면에 보인다) 그 끝에서 방향을 바꿔
// 살짝 작아지며 묶음 뒤로 들어가 맨 아래 자리에 새 기울기로 놓인다. 순서는 가장 멀리 빠진 순간에 바뀐다.
// 빠질 때는 감속, 돌아올 때는 가속→감속이라 끝점에서 멈칫하지 않고 진자처럼 되돌아온다.
// DOM을 옮겨도 WAAPI 애니메이션은 이어지므로 처음부터 끝까지 한 애니메이션으로 그린다.
const FLIP_MS=560, FLIP_TURN=.38;
function shuffle(pile){const top=pile.lastElementChild, n=pile.children.length; if(n<2||pile.dataset.busy)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){pile.prepend(top);toss(top,0);lay(pile);
    pile.lastElementChild.animate([{opacity:.4},{opacity:1}],{duration:160,easing:'ease'});return;}
  pile.dataset.busy=1;
  const from=getComputedStyle(top).transform, m=new DOMMatrix(from);
  const slotLeft=top.getBoundingClientRect().left-m.e;               // 지금 비켜 있는 만큼을 빼면 제자리 왼쪽
  const clear=top.previousElementSibling.getBoundingClientRect().right+10;   // 다음 장 오른쪽 끝 너머
  const ox=Math.round(Math.min(clear,innerWidth-48)-slotLeft);
  // 새 맨 뒷장 자세를 미리 정한다(바로 위에 보일 장과 반대로 기운다)
  const above=pile.children[n>4?n-4:0]; toss(top,+above.dataset.t);
  const k=n>4?3:Math.min(n-1,3), ex=SLOT[k][0]+(+top.dataset.jx), ey=SLOT[k][1]+(+top.dataset.jy), er=(top.dataset.t*TILT[k]).toFixed(2);
  top.style.transition='none';top.style.transform='';
  const a=top.animate([
    {transform:from,easing:'cubic-bezier(.33,1,.68,1)'},
    {transform:`translate(${ox}px,-8px) rotate(3deg) scale(.985)`,offset:FLIP_TURN,easing:'cubic-bezier(.65,0,.35,1)'},
    {transform:`translate(${ex}px,${ey}px) rotate(${er}deg)`}],{duration:FLIP_MS});
  const rest=[...pile.children].filter(x=>x!==top);
  setTimeout(()=>{rest.forEach(x=>x.style.transitionDuration='300ms');pile.prepend(top);lay(pile);},FLIP_MS*FLIP_TURN);
  a.onfinish=()=>{top.style.transition='';rest.forEach(x=>x.style.transitionDuration='');delete pile.dataset.busy;};}
function initPile(pile){
  let prev=0;[...pile.children].forEach((s,i)=>{s.dataset.i=pile.children.length-i;toss(s,prev);prev=+s.dataset.t;}); lay(pile);
  const box=pile.closest('[data-pile-box]')||pile.parentNode;
  box.querySelector('.flip')?.addEventListener('click',()=>shuffle(pile));
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  pile.addEventListener('pointerdown',e=>{
    const s=e.target.closest('.lslip.top'); if(!s||e.button>0)return;
    const x0=e.clientX,y0=e.clientY,t0=performance.now(),base=s.getBoundingClientRect(); let dx=0,live=false;
    const lim=Math.max(20,innerWidth-8-base.right);
    const move=ev=>{const mx=ev.clientX-x0,my=ev.clientY-y0;
      if(!live){if(Math.abs(my)>Math.abs(mx)&&Math.abs(my)>6){end(true);return;} if(Math.abs(mx)<6)return; live=true;s.setPointerCapture(e.pointerId);s.classList.add('drag');}
      dx=mx>0?lim*(1-Math.exp(-mx/lim)):-Math.min(16,-mx*.2);   // 한계에 가까울수록 무거워진다
      if(!reduce)s.style.transform=`translate(${dx}px,${-Math.abs(dx)*.08}px) rotate(calc(var(--r) + ${dx*.06}deg))`;};
    const end=cancel=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);
      s.classList.remove('drag'); if(cancel===true){s.style.transform='';return;}
      const v=dx/(performance.now()-t0);
      if(live&&(dx>lim*.45||v>.11)) shuffle(pile); else s.style.transform='';};
    const up=()=>end(false);
    addEventListener('pointermove',move);addEventListener('pointerup',up);addEventListener('pointercancel',up);
    // 끌어서 넘긴 뒤 따라오는 클릭(링크 열림)은 막는다
    s.addEventListener('click',ev=>{if(live)ev.preventDefault();},{once:true,capture:true});
  });
}
document.querySelectorAll('.pile').forEach(initPile);
