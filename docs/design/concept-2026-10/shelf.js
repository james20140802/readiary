// 예시 서가: 실제 표지가 없는 책은 표지 색을 흉내 낸 책등으로 그린다 (제목은 예시)
const SHELF_T=['소유냐 존재냐','철학이 깊을수록 삶은 단순하다','리만 가설','정의란 무엇인가','왜 나는 너를 사랑하는가','작별하지 않는다','소년이 온다','채식주의자','아몬드','데미안','어린 왕자','1984','사피엔스','코스모스','총 균 쇠','이기적 유전자','미움받을 용기','불편한 편의점','파친코','노인과 바다','변신','이방인','인간 실격','노르웨이의 숲','위대한 개츠비','호밀밭의 파수꾼','연금술사','나미야 잡화점의 기적','지구 끝의 온실','시선으로부터','죽음의 수용소에서','생각에 관한 생각','팩트풀니스','침묵의 봄','월든','자기만의 방','백년의 고독','안나 카레니나','죄와 벌','오만과 편견','에로스의 종말','피로사회','여행의 이유','보통의 존재','나의 문화유산답사기','난장이가 쏘아올린 작은 공'];
const SHELF_C=[['#0F4A3C','#F2D57A'],['#DCE4EC','#2A2F38'],['#C9D9D5','#24403A'],['#F4F2EE','#D23A2C'],['#E6542C','#FFF2E2'],['#2F3E5C','#E9E3D6'],['#E9E4DA','#3B3A36'],['#B9C7A8','#2C3324'],['#F2EEE4','#6B2E2E'],['#7A2E2B','#F1E6D2'],['#D8C9A6','#3D3426'],['#1F2A30','#E7E1D6'],['#C46A3E','#FFF4E6'],['#3E4A6B','#EAE6DC'],['#EAD9B8','#4A3B22'],['#5F6F52','#F3EEE2']];
function fillShelves(sel, perRow, rows, opt={}){
  let seed=opt.seed||7; const r=()=>{seed=(seed*9301+49297)%233280;return seed/233280};
  const list=(opt.only||SHELF_T).map((t,i)=>({t,c:SHELF_C[SHELF_T.indexOf(t)<5&&SHELF_T.indexOf(t)>=0?SHELF_T.indexOf(t):Math.floor(r()*SHELF_C.length)],w:Math.round(24+r()*16+(t.length>8?6:0)),h:Math.round(80+r()*18),done:!opt.only&&i>2&&r()>.4}));
  const sc=opt.scale||1;
  document.querySelectorAll(sel).forEach(el=>{let i=0;
    for(let s=0;s<rows;s++){const sh=document.createElement('div');sh.className='shelf';
      for(let k=0;k<perRow&&i<list.length;k++,i++){const b=list[i];
        sh.insertAdjacentHTML('beforeend',`<a class="spine${b.done?' done':''}" href="#" title="${b.t}" style="--w:${Math.round(b.w*sc)}px;--h:${b.h}%;--c:${b.c[0]};--t:${b.c[1]}">${b.t}</a>`);}
      el.appendChild(sh);}
  });
}
