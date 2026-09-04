/* 13-pick.js — 选校分档（概率划分法）/ ED / RD 交互 */
/* ---------- 选校 / 申请 ---------- */
let PICK={p:null,bands:{},cand:{},off:{},edSel:null,rdSel:[]};
// 选校分档采用「概率划分法」：按该生录取概率 P 硬分三档，档位即概率区间，无需锁定/随机难池。
//   冲刺 reach:  P ≤ 10%      匹配 match: 10% < P ≤ 30%      保底 safety: P > 30%
// 默认展示 5 冲刺 / 10 匹配 / 10 保底（总量 25）；匹配/保底可选校不足时，缺额补到冲刺。
function dedupeB(a){const s=new Set(),o=[];a.forEach(x=>{if(!s.has(x.sc.nameEn)){s.add(x.sc.nameEn);o.push(x);}});return o;}
function buildBands(p){
  // —— 概率划分法：按该生录取概率 P 硬分三档 ——
  const T1=0.10, T2=0.30;                          // 阈值：≤10% 冲刺 / 10–30% 匹配 / >30% 保底
  // §5.1 共同冲击：分档必须与卡片展示、最终摇号使用同一份季节 ε，否则“好年”时
  // 展示/摇号概率越过 10% 门槛，却仍被算作冲刺，出现“冲刺里概率>10%”的矛盾。
  const eps=(typeof G!=="undefined" && typeof G.seasonEps==="number")?G.seasonEps:0;
  // 全部学校按该生（含本季 ε 的）P 分类（不丢任何校：每所都会落入某一档）
  const all=SCHOOLS.map(sc=>({sc,P:admitProb(p,sc,false,eps),band:null}));
  const reachPool =all.filter(x=>x.P<=T1).sort((a,b)=>a.P-b.P);     // 最难（最低 P）在前
  const matchPool =all.filter(x=>x.P>T1 && x.P<=T2).sort((a,b)=>a.P-b.P);
  const safetyPool=all.filter(x=>x.P>T2).sort((a,b)=>b.P-a.P);      // 最易（最高 P）在前

  // 默认展示 5 冲刺 / 10 匹配 / 10 保底（总量 25）
  let rN=Math.min(REACH_MAX, reachPool.length);
  let mN=Math.min(MATCH_MAX, matchPool.length);
  let sN=Math.min(SAFETY_MAX, safetyPool.length);
  // 匹配/保底可选校不足 → 缺额全部加到冲刺（顶端校天然最难，归冲刺合理）
  const deficit=(MATCH_MAX-mN)+(SAFETY_MAX-sN);
  rN=Math.min(REACH_MAX+deficit, reachPool.length);

  const reach =reachPool.slice(0,rN);
  const match =matchPool.slice(0,mN);
  const safety=safetyPool.slice(0,sN);
  reach.forEach(x=>x.band="reach");
  match.forEach(x=>x.band="match");
  safety.forEach(x=>x.band="safety");

  const noSafety = safety.length===0;
  const noMatch  = reachPool.length===all.length;  // 所有学校对你都 ≤10%：只能冲
  // 该生“最容易录取的学校”命中率（用于无保底提示）
  const easiestP = safety.length?safety[0].P:(match.length?match[match.length-1].P:0);
  return {reach, match, safety, noMatch, noSafety, easiestP};
}
function goPick(){
  $("game").classList.remove("on"); $("pick").classList.add("on");
  PICK.p=buildProfile();
  // §5.1 共同冲击：在选校时一次性抽取本季 ε，后续 ED/RD 显示与摇号均用它，保证“拆开前看到的概率”与“最终摇号概率”一致。
  G.seasonEps=gauss(0,EPS_SIGMA);
  PICK.bands=buildBands(PICK.p);
  PICK.noMatch=!!PICK.bands.noMatch;
  PICK.noSafety=!!PICK.bands.noSafety;
  PICK.easiestP=PICK.bands.easiestP||0;
  PICK.cand={}; PICK.off={reach:0,match:0,safety:0};
  ["reach","match","safety"].forEach(k=>PICK.cand[k]=takeBand(k));
  renderAOPanel(PICK.p);   // §5.2 招生官视角面板
  const edSchools=SCHOOLS.filter(s=>s.region==="US"&&s.ed);
  $("edList").innerHTML=edSchools.map(s=>`<option value="${s.nameZh}">#${s.rank} ${s.nameZh} ${s.nameEn}</option>`).join("");
  PICK.edSel=null; PICK.rdSel=[];
  $("edCard").innerHTML=""; $("edMatches").innerHTML=""; $("edSearch").value="";
  $("edClearBtn").style.display="none";
  renderPick();
}
function takeBand(k){
  // buildBands 已按概率划分 + 5/10/10(缺额补冲刺) 构建好各档候选，这里直接展示全部
  return (PICK.bands[k]||[]).slice();
}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const tagOf=sc=>sc.region==="US"?("#"+sc.rank):sc.region;
// §5.2 招生官视角面板：六通道条形
function renderAOPanel(p){
  const el=document.getElementById("aoPanel"); if(!el||!p) return;
  const c=profileChannels(p);
  const ch=[
    {k:"GPA 学术", v:c.zA, kind:"z"},
    {k:"SAT 标化", v:c.zT, kind:"z"},
    {k:"托福",     v:c.zTOEFL, kind:"z"},
    {k:"活动/奖项", v:c.zE, kind:"z"},
    {k:"文书/推荐", v:c.zR, kind:"z"},
    {k:"专业契合", v:c.majorFit, kind:"fit"},
  ];
  el.innerHTML=ch.map(x=>{
    if(x.kind==="fit"){
      const w=Math.round(clamp(x.v,0,1)*100);
      const col=w>=60?"var(--good)":w>=30?"var(--warn)":"var(--bad)";
      return `<div class="aorow"><span class="aok">${x.k}</span><div class="aobar"><i style="left:0;width:${w}%;background:${col}"></i></div><span class="aov">${w}%</span></div>`;
    }
    const z=x.v, half=clamp(z/2.5,-1,1), w=Math.abs(half)*50;
    const left=half>=0?50:50-w;
    const col=z>=0?"var(--good)":"var(--bad)";
    const tag=(z>=0?"+":"")+z.toFixed(2);
    return `<div class="aorow"><span class="aok">${x.k}</span><div class="aobar center"><i style="left:${left}%;width:${w}%;background:${col}"></i></div><span class="aov">${tag}</span></div>`;
  }).join("");
}
function renderPick(){
  // 档位提示横幅：匹配不到 / 无法保底
  const warn=$("bandWarn"); let wm="";
  if(PICK.noMatch){
    wm=`⚠️ 你目前的录取率<b>全部低于 10%</b>——匹配不到任何学校，只能冲一把冲刺校。建议现实一点，或重开一局补强标化与活动。`;
  }else if(PICK.noSafety){
    wm=`⚠️ 你目前<b>没有真正的保底校</b>：连最容易录取的学校命中率也仅 ${(PICK.easiestP*100).toFixed(0)}%。你的水平还无法“保底”，匹配校已是你的上限。`;
  }
  if(wm){ warn.style.display="block"; warn.innerHTML=wm; } else { warn.style.display="none"; }
  // 动态档位数量说明
  const rc=PICK.cand.reach.length, mc=PICK.cand.match.length, sc=PICK.cand.safety.length;
  $("rdDesc").innerHTML=`RD 可海投。冲刺 <b>${rc}</b> 所（录取率 ≤10%）· 匹配 <b>${mc}</b> 所（10%–30%）· 保底 <b>${sc}</b> 所（&gt;30%）。<small>档位随本季录取气候（好/坏年）浮动，与卡片显示的录取率一致。</small>按档勾选，已选 <b id="rdCount">0</b> / 20。`;

  ["reach","match","safety"].forEach(k=>{
    const box=$("cand"+cap(k)); box.innerHTML="";
    PICK.cand[k].forEach(x=>{
      const sel=PICK.rdSel.some(o=>o.nameEn===x.sc.nameEn);
      const b=document.createElement("button"); b.className="cand"+(sel?" sel":"");
      const trueP=admitProb(PICK.p,x.sc,false,G.seasonEps);
      b.innerHTML=`<div class="rk">${tagOf(x.sc)}</div><div class="nm">${x.sc.nameZh}</div><div class="pp">${(trueP*100).toFixed(1)}%</div>`;
      b.onclick=()=>toggleRD(k,x); box.appendChild(b);
    });
  });
  const n=PICK.rdSel.length;
  $("rdCount").textContent=n;
  const cnt={reach:0,match:0,safety:0}; PICK.rdSel.forEach(o=>cnt[o.band]++);
  $("cntReach").textContent=cnt.reach; $("cntMatch").textContent=cnt.match; $("cntSafety").textContent=cnt.safety;
  const total=rc+mc+sc;
  const minN=Math.min(10,total);
  $("confirmPickBtn").disabled = n<minN || n>RD_MAX;
  $("pickHint").textContent = n<minN?`还需选 ${minN-n} 所（本局最少 ${minN} 所）`:(n>RD_MAX?`超过上限 ${RD_MAX}`:"已选 "+n+" 所");
}
function toggleRD(k,x){
  const i=PICK.rdSel.findIndex(o=>o.nameEn===x.sc.nameEn);
  if(i>=0) PICK.rdSel.splice(i,1);
  else {
    if(PICK.rdSel.length>=RD_MAX){ $("pickHint").textContent=`已达上限 ${RD_MAX} 所。`; return; }
    const P=admitProb(PICK.p,x.sc,false,G.seasonEps);
    PICK.rdSel.push({nameEn:x.sc.nameEn,band:x.band,P});
  }
  renderPick();
}
function edPick(){
  const q=$("edSearch").value.trim();
  if(!q){ $("edHint").textContent="请输入校名。"; return; }
  const ql=q.toLowerCase();
  const hits=SCHOOLS.filter(s=>s.region==="US"&&s.ed&&(s.nameZh.includes(q)||s.nameEn.toLowerCase().includes(ql)));
  if(hits.length===0){ $("edHint").textContent="未找到 ED 校（仅美国提供 ED 的校可选）。"; $("edMatches").innerHTML=""; return; }
  if(hits.length===1){ selectED(hits[0]); return; }
  // 多结果：列出可点击候选，点选其一
  $("edHint").textContent=`匹配到 ${hits.length} 所，点选其一：`;
  $("edMatches").innerHTML=hits.map(s=>`<button class="ed-match" data-r="${s.rank}">#${s.rank} · ${s.nameZh}（${s.nameEn}）</button>`).join("");
  $("edMatches").querySelectorAll(".ed-match").forEach(b=>{
    b.onclick=()=>selectED(SCHOOLS.find(s=>s.rank==b.dataset.r));
  });
}
function selectED(sc){
  PICK.edSel=sc;
  $("edMatches").innerHTML="";
  const Ped=admitProb(PICK.p,sc,true,G.seasonEps), Prd=admitProb(PICK.p,sc,false,G.seasonEps);
  $("edCard").innerHTML=`<div class="env open" style="cursor:default"><div class="rank">#${sc.rank} · ED</div><div class="nm">${sc.nameZh}</div><div class="pp">ED 概率 <b>${(Ped*100).toFixed(1)}%</b> ｜ RD 仅 ${(Prd*100).toFixed(1)}%</div></div>`;
  $("edHint").textContent="已选 ED 校，提交后先拆这封。";
  $("edClearBtn").style.display="";
}
function clearED(){
  PICK.edSel=null;
  $("edCard").innerHTML=""; $("edMatches").innerHTML=""; $("edSearch").value="";
  $("edHint").textContent="已清除 ED 选择，可重新搜索。";
  $("edClearBtn").style.display="none";
}

/* ---------- 夏校申请季（高二升高三） ---------- */
// 门槛按「夏校时刻各属性实测分位数」标定（蒙特卡洛 400 局/档，含休息、优先刷 SAT 的真实策略）：
