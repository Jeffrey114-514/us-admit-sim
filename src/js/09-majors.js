/* 09-majors.js — 专业方向（数据来自 data/majors.json） */
/* 专业方向：开局选择，影响录取与行动契合度 */
const MAJORS=/*$majors$*/[];
const MAJOR_BYID={}; MAJORS.forEach(m=>MAJOR_BYID[m.id]=m);
function bumpFit(n){
  if(!G || G.major==="und") return;
  const room=(100-G.majorFit)/70;            // §4.4 越高涨越慢，避免 9~12 次行动就拉满
  G.majorFit=clamp(G.majorFit + n*Math.max(0.25, room), 0, 100);
}
function majorGainFrom(a){ if(!G||G.major==="und"||!a) return 0; const m=MAJOR_BYID[G.major]; if(!m) return 0; if(a.major===G.major) return 8; if(m.related.includes(a.id)) return 6; return 0; }

