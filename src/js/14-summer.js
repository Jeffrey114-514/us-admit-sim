/* 14-summer.js — 夏校申请季（数据来自 data/summer.json） */
// - GPA 用加权（未加权三档雷同≈2.9 无法区分；加权 p50 3.18/3.81/4.20 体现课程难度选择）
// - SAT 在真实策略下 100% 必刷（高二起基础行动池常驻，刷不动就休息回血），故可作通用门槛
// - 声望是真正的稀缺资源（p50≈10、p90≈20，原 ≥45 根本不可能），故统一压到 4~11 的可达区间
const SUMMER_PROGRAMS=/*$summer$*/[];
let SUMMER={list:[],sel:[],grind:false};
function summerQualify(pp){
  const need=pp.need; if(!need) return {ok:true,score:1};
  const r=G.results,s=G.stats,gpa=cumGPA("W");   // 加权 GPA：能体现课程难度选择（未加权三档雷同）
  const map={gpa, sat:r.satBest, academic:s.academic, english:s.english, social:s.social, rep:r.reputation};
  let ok=true,score=0,cnt=0;
  for(const k in need){ cnt++; if((map[k]||0)>=need[k]) score++; else ok=false; }
  return {ok, score: cnt?score/cnt:1};
}
function goSummer(){
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("on"));
  $("summer").classList.add("on");
  G.phase="summer";
  SUMMER.list=shuffle(SUMMER_PROGRAMS).slice(0,4).map(pp=>({pp, q:summerQualify(pp)}));
  SUMMER.sel=[]; SUMMER.grind=false;
  renderSummer();
}
function renderSummer(){
  const box=$("summerList"); box.innerHTML="";
  SUMMER.list.forEach((it,i)=>{
    const pp=it.pp, q=it.q;
    const reqs=pp.need?Object.keys(pp.need).map(k=>{
      const label={gpa:"加权GPA",sat:"SAT",academic:"学术",english:"英语",social:"社交",rep:"声望"}[k];
      const got={gpa:cumGPA("W").toFixed(2),sat:G.results.satBest,academic:G.stats.academic,english:G.stats.english,social:G.stats.social,rep:Math.round(G.results.reputation)}[k];
      const met=(got||0)>=pp.need[k];
      return `<span class="req ${met?'met':'unmet'}">${label} ${got} / ${pp.need[k]}${met?' ✓':' ✗'}</span>`;
    }).join(""):`<span class="req met">无门槛</span>`;
    const sel=SUMMER.sel.includes(i);
    const b=document.createElement("div");
    b.className="summer-card"+(sel?" sel":"")+(q.ok&&!SUMMER.grind?"":" disabled");
    b.innerHTML=`<div class="sc-top"><b>${pp.name}</b><span class="sc-sel">${pp.sel}</span></div>
      <div class="sc-desc">${pp.desc}</div><div class="sc-reqs">${reqs}</div>`;
    if(q.ok && !SUMMER.grind){
      b.onclick=()=>{
        SUMMER.grind=false;
        const idx=SUMMER.sel.indexOf(i);
        if(idx>=0) SUMMER.sel.splice(idx,1);
        else { if(SUMMER.sel.length>=2){ $("summerHint").textContent="最多申请 2 个。"; return; } SUMMER.sel.push(i); }
        renderSummer();
      };
    } else if(!q.ok){ b.title="未达标，无法申请"; }
    else { b.title="已选「苦心冲标化」，先取消它才能选夏校。"; }
    box.appendChild(b);
  });
  // 保底选项（始终可用）：跳过申请、苦心冲标化
  const gb=document.createElement("div");
  gb.className="summer-card grind"+(SUMMER.grind?" sel":"");
  gb.innerHTML=`<div class="sc-top"><b>🚫 跳过申请 · 苦心冲标化</b><span class="sc-sel">无需条件</span></div>
    <div class="sc-desc">不申夏校，把暑假全部用来刷标化：<b>英语 +1</b>，并<b>额外多考一次 SAT</b>（可能刷新最佳）。够不到好夏校、或想补强标化时的稳妥选择。</div>`;
  gb.onclick=()=>{ SUMMER.grind=!SUMMER.grind; if(SUMMER.grind) SUMMER.sel=[]; renderSummer(); };
  box.appendChild(gb);
  $("summerHint").textContent = SUMMER.grind
    ? "已选「苦心冲标化」，点“确认”生效。"
    : (SUMMER.sel.length?`已选 ${SUMMER.sel.length} / 2，点“确认”摇号。`:"选 1–2 个达标的夏校提交，或选下方「苦心冲标化」作为替代。");
}
// 苦心冲标化：基于当前（已 +1 英语）的状态额外多考一次 SAT
function doFreeSAT(){
  const e=G.stats.english,lk=G.stats.luck;
  const base=1090+40*e;
  const noise=gauss(0,55)*(1-0.04*lk);
  let sat=Math.round(clamp(base+noise+(lk-6)*5,400,1560)/10)*10;
  const prev=G.results.satBest;
  let improved=false;
  if(sat>prev){ G.results.satBest=sat; improved=true; }
  return improved?`考出 ${sat}，刷新最佳！`:`考了 ${sat}（未超过最佳 ${prev}）`;
}
function summerApply(){
  if(SUMMER.grind){
    G.stats.english=clamp(G.stats.english+1,1,12);
    const retake=doFreeSAT();
    finishSummer(`—— 高二升高三 · 夏校申请季 结束 —— 你跳过了夏校申请、苦心冲标化：英语 +1（现 ${G.stats.english}），并多考一次 SAT（${retake}）。这段专注让你在申请季更从容。`);
    return;
  }
  if(SUMMER.sel.length===0){ $("summerHint").textContent="先选至少 1 个达标的夏校，或选「苦心冲标化」。"; return; }
  let got=[];
  SUMMER.sel.forEach(i=>{
    const {pp,q}=SUMMER.list[i];
    const selPenalty=pp.boost;   // §4.7 按 boost 反推：顶尖夏校极难、本地助研较易
    const pr=clamp(0.75-0.55*selPenalty+(G.stats.luck-5)*0.02, 0.08, 0.75);
    if(Math.random()<pr){
      G.results.summerPts=clamp((G.results.summerPts||0)+pp.boost,0,1.2);
      got.push(pp.name);
    }
  });
  finishSummer(`—— 高二升高三 · 夏校申请季 结束 —— ${got.length?("录取："+got.join("、")+"（顶尖校录取加成已计入）"):"均未录取，但这段经历本身也是申请素材。"}`);
}
function finishSummer(logMsg){
  G.summerDone=true;
  G.ap=apMaxThisRound();
  dealActions();
  G.energy=clamp(G.energy+10+sumFx('energyRegen',0),0,maxEnergy());
  G.stress=clamp(G.stress-2,0,100);   // 压力系统②：夏校路径自动减压与 endRound 保持一致（-3→-2）
  const yr=["初三","初三","高一","高一","高二","高二","高三"][G.round];
  const sem=G.round%2===0?"上":"下";
  pushLog("info",logMsg);
  pushLog("info",`—— ${yr}${sem}学期 开始 ——`);
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("on"));
  $("game").classList.add("on");
  enterEvent();
}

