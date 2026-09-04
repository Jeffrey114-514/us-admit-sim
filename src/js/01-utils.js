/* 01-utils.js — 通用工具与图标 */
/* ---------- utils ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
function weightedPick(arr,wFn){const ws=arr.map(wFn);const tot=ws.reduce((a,b)=>a+b,0);if(tot<=0||arr.length===0)return pick(arr);let x=Math.random()*tot;for(let i=0;i<arr.length;i++){x-=ws[i];if(x<=0)return arr[i];}return arr[arr.length-1];}
const $=id=>document.getElementById(id);
function gauss(mu,sg){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();
  return mu+sg*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---------- icons ---------- */
const _s=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON={
  book:_s('<path d="M4 5.5A2 2 0 016 3.5h6v15H6a2 2 0 01-2-2z"/><path d="M20 5.5a2 2 0 00-2-2h-6v15h6a2 2 0 002-2z"/>'),
  globe:_s('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.4 2.4 14.6 0 17"/><path d="M12 3.5c-2.4 2.4-2.4 14.6 0 17"/>'),
  bolt:_s('<path d="M13.5 3L6 13h4.5l-1 8L18 10h-4.5z"/>'),
  bulb:_s('<path d="M9.5 18h5"/><path d="M10.5 21h3"/><path d="M12 3.5a5.5 5.5 0 00-3.2 10c.5.4.8 1 .8 1.6v.4h4.8v-.4c0-.6.3-1.2.8-1.6a5.5 5.5 0 00-3.2-10z"/>'),
  people:_s('<circle cx="9.5" cy="8.5" r="3"/><path d="M4 20c0-3 2.5-5.2 5.5-5.2S15 17 15 20"/><path d="M16.5 6.2a3 3 0 010 4.6"/><path d="M17.5 14.9c1.7.7 2.8 2.3 2.8 4.1"/>'),
  star:_s('<path d="M12 3.5l2.2 6.3 6.3 2.2-6.3 2.2L12 20.5l-2.2-6.3L3.5 12l6.3-2.2z"/>'),
  heart:_s('<path d="M12 20.2C9.6 18.2 4.5 14.6 4.5 10.6A3.9 3.9 0 0112 8.6a3.9 3.9 0 017.5 2c0 4-5.1 7.6-7.5 9.6z"/>'),
  house:_s('<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19z"/><path d="M9.5 20.5v-6h5v6"/>'),
  pencil:_s('<path d="M4 20h4L19 9a2.5 2.5 0 00-3.5-3.5L4.5 16.5z"/><path d="M14.5 6.5l3.5 3.5"/>'),
  flag:_s('<path d="M5.5 21V3.8"/><path d="M5.5 4.5h11.5l-2.2 3.7 2.2 3.7H5.5"/>'),
  moon:_s('<path d="M20.5 14.8A8.5 8.5 0 019.2 3.5a8.5 8.5 0 1011.3 11.3z"/>'),
  award:_s('<circle cx="12" cy="9" r="5.5"/><path d="M8.8 13.8L7 20.5l5-2.6 5 2.6-1.8-6.7"/>')
};
const ic=(n,cls)=>'<span class="ico'+(cls?' '+cls:'')+'">'+(ICON[n]||ICON.star)+'</span>';
