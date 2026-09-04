/* 12-flow.js — 回合流程：事件 / 行动 / 状态渲染 */
/* ---------- game flow ---------- */
function startGame(){
  const stats=Object.assign({},editStats);
  // 特质静态加成
  editTraits.forEach(t=>{
    if(t.fx.luck) stats.luck=clamp(stats.luck+t.fx.luck,1,12);
    if(t.fx.creativity) stats.creativity=clamp(stats.creativity+t.fx.creativity,1,12);
    if(t.fx.english) stats.english=clamp(stats.english+t.fx.english,1,12);
  });
  G=freshState(stats,editTraits,editRigor,editMajor);
  $("setup").classList.remove("on");
  $("endgame").classList.remove("on");
  $("pick").classList.remove("on");
  $("game").classList.add("on");
  pushLog("info",`旅程开始。特质：${editTraits.map(t=>t.name).join("、")}｜课程难度：${RIGOR[editRigor].name}`);
  dealActions();
  enterEvent();
}
function enterEvent(){
  G.phase="event";
  const e=drawEvent();
  G._curEvent=e;
  const card=$("eventCard");
  const hasChoice=e.choices&&e.choices.length;
  const ct=catOf(e);
  let html=`<div class="ev-cat">${ic(CAT_ICON[ct])}<span>${CAT_NAME[ct]}</span></div>
    <div class="ev-stage">${STAGES[G.round].yr}${STAGES[G.round].sem} · ${STAGES[G.round].theme}</div><h3>${e.title}</h3><p>${e.text}</p>`;
  if(hasChoice){
    html+=`<div class="choices">`+e.choices.map((c,i)=>`<button class="btn" data-ci="${i}">${c.label}<br><small style="opacity:.8;font-weight:400">${c.hint}</small></button>`).join("")+`</div>`;
  }else{
    html+=`<div class="choices"><button class="btn" id="evCont">继续</button></div>`;
  }
  card.innerHTML=html;
  if(hasChoice){
    card.querySelectorAll("button[data-ci]").forEach(b=>{
      b.onclick=()=>{const r=e.choices[+b.dataset.ci].apply(G);afterEvent(r);};
    });
  }else{
    $("evCont").onclick=()=>{const r=e.effect(G);afterEvent(r);};
  }
  // 事件未结算时：清空行动区、禁用结束回合，防止旧按钮被误点
  $("acts").innerHTML='<div class="small">先处理上方事件，再进行行动。</div>';
  $("endRoundBtn").disabled=true;
  renderStatus();
}
function afterEvent(r){
  G.results.stressMax=Math.max(G.results.stressMax,G.stress);   // #6：事件造成的压力也计入最高压力（用于成就/统计）
  pushLog(r[0],`【事件】${r[1]}`);
  G.phase="action";
  $("eventCard").innerHTML=`<div class="ev-cat">${ic("pencil")}<span>已结算</span></div><h3>事件结算完毕</h3><p>下面是行动时间。</p>`;
  $("endRoundBtn").disabled=false;
  renderStatus();renderActions();
}
function doAction(a){
  if(G.phase!=="action"||G.ap<=0) return;
  const amt=Math.abs(a.energy);
  if(a.energy>0){
    const cost=amt*mulFx('energyCostMul',1);
    if(G.energy<cost) return;
    G.energy=clamp(G.energy-cost,0,maxEnergy());
  }else{
    G.energy=clamp(G.energy+amt,0,maxEnergy());
  }
  G.ap--;
  // 压力：只有「增加」时吃压力倍率；休息等「减压」不被倍率削弱
  const ds=a.stress>0?a.stress*mulFx('stressMul',1):a.stress;
  G.stress=clamp(G.stress+ds,0,100);
  G.results.stressMax=Math.max(G.results.stressMax,G.stress);
  let r=a.run();
  const mg=majorGainFrom(a);
  if(mg){ bumpFit(mg); r[1]+=`（契合专业，契合度 +${mg}）`; }
  pushLog(r[0],`【${a.name}】${r[1]}`);
  G.semAcc.eSum += G.energy/maxEnergy();   // #3 累计本学期精力/压力均值
  G.semAcc.sSum += G.stress;
  G.semAcc.n++;
  renderStatus();renderActions();
  if(G.ap<=0) $("roundHint").textContent="行动点已用完。";
}
function endRound(){
  if(G.phase!=="action") return;
  closeSemester();
  G.round++;
  G.results.stressMax=Math.max(G.results.stressMax,G.stress);
  if(G.round===6 && !G.summerDone){ goSummer(); return; } // 高二下 -> 高三上：夏校申请季
  if(G.round>=TOTAL_ROUNDS){ goPick(); return; }
  G.ap=apMaxThisRound();
  dealActions();
  G.energy=clamp(G.energy+10+sumFx('energyRegen',0),0,maxEnergy());
  G.stress=clamp(G.stress-2,0,100);   // 压力系统②：自动减压 -3→-2，压力更黏
  $("roundHint").textContent="";
  const yr=["初三","初三","高一","高一","高二","高二","高三"][G.round];
  const sem=G.round%2===0?"上":"下";
  pushLog("info",`—— ${yr}${sem}学期 开始 ——`);
  enterEvent();
}
function pushLog(cls,txt){
  G.log.push({cls,txt});
  const el=$("log");
  const d=document.createElement("div"); d.className="e "+cls; d.textContent=txt;
  el.appendChild(d); el.scrollTop=el.scrollHeight;
}
function renderStatus(){
  const ap=Array.from({length:apMaxThisRound()},(_,i)=>`<span class="apdot ${i<G.ap?'on':''}"></span>`).join("");
  const ePct=G.energy/maxEnergy()*100;
  const eCol=ePct>50?"var(--good)":ePct>25?"var(--warn)":"var(--bad)";
  const sCol=G.stress>70?"var(--bad)":G.stress>40?"var(--warn)":"var(--good)";
  const r=G.results;
  const yr=["初三上","初三下","高一上","高一下","高二上","高二下","高三上"][G.round];
  const st=Object.keys(STAT_NAMES).map(k=>`<span class="st">${ic(STAT_ICON[k])}${STAT_NAMES[k]} <b>${G.stats[k].toFixed(1)}</b></span>`).join("");
  const hasGPA=r.semesters.length>0;
  $("status").innerHTML=`
    <div class="srow">
      <span class="k">学期</span><span class="v">${yr}</span><span class="sep">·</span>
      <span class="k">进度</span><span class="v">${G.round+1}/${TOTAL_ROUNDS}</span><span class="sep">·</span>
      <span class="k">行动</span><span class="apdots">${ap}</span><span class="sep">·</span>
      <span class="k">难度</span><span class="v">${RIGOR[G.rigor].name}</span>
    </div>
    <div class="meters">
      <div class="meter"><span class="k">精力</span><div class="bar"><i style="width:${ePct}%;background:${eCol}"></i></div><span class="v">${Math.round(G.energy)}/${maxEnergy()}</span></div>
      <div class="meter"><span class="k">压力</span><div class="bar"><i style="width:${G.stress}%;background:${sCol}"></i></div><span class="v">${Math.round(G.stress)}%</span></div>
      <div class="meter"><span class="k">声望</span><div class="bar"><i style="width:${r.reputation}%;background:var(--ink)"></i></div><span class="v">${Math.round(r.reputation)}/100</span></div>
    </div>
    <div class="stats">${st}</div>
    <div class="scores">
      <span>GPA ${hasGPA?cumGPA("U").toFixed(2):"—"}（加权 ${hasGPA?cumGPA("W").toFixed(2):"—"}）</span>
      <span>SAT ${r.satBest||"—"}</span><span>托福 ${r.toeflBest||"—"}</span>
      <span>奖项 ${r.awards}</span><span>文书 ${r.essayQuality.toFixed(1)}/10</span><span>推荐信 ${r.recQuality.toFixed(1)}/10</span>
      <span>专业 ${MAJOR_BYID[G.major].name}${G.major!=="und"?(" · 契合 "+Math.round(G.majorFit)):""}</span>
    </div>`;
}
function renderActions(){
  const wrap=$("acts"); wrap.innerHTML="";
  if(!G.dealtBasic) dealActions();
  const mk=a=>{
    const amt=Math.abs(a.energy);
    const cost=a.energy>0?amt*mulFx('energyCostMul',1):amt;
    const dis=G.phase!=="action"||G.ap<=0 || (a.energy>0 && G.energy<cost);
    const b=document.createElement("button"); b.className="act"; b.disabled=dis;
    if(a.energy<0) b.dataset.rest="1";
    const costTxt=a.energy<0?`回精力 ${Math.round(amt)}`:`耗精力 ${Math.round(cost)}`;
    b.innerHTML=`<div class="top">${ic(a.icon,'dk')}<b>${a.name}</b></div><small>${costTxt} · 压力${a.stress>=0?'+':''}${a.stress}</small>`;
    b.onclick=()=>doAction(a);
    return b;
  };
  const basic=document.createElement("div"); basic.className="act-section";
  const lblBasic=document.createElement("div"); lblBasic.className="acts-label"; lblBasic.textContent="基础行动（每回合固定）";
  basic.appendChild(lblBasic);
  const gBasic=document.createElement("div"); gBasic.className="act-grid basic";
  G.dealtBasic.forEach(a=>gBasic.appendChild(mk(a)));
  gBasic.appendChild(mk(REST));
  basic.appendChild(gBasic);
  wrap.appendChild(basic);
  const rand=document.createElement("div"); rand.className="act-section";
  const lblRand=document.createElement("div"); lblRand.className="acts-label"; lblRand.textContent=`随机行动（本回合随机 ${DEALT} 个）`;
  rand.appendChild(lblRand);
  const gRand=document.createElement("div"); gRand.className="act-grid";
  G.dealtRand.forEach(a=>gRand.appendChild(mk(a)));
  rand.appendChild(gRand);
  wrap.appendChild(rand);
}

