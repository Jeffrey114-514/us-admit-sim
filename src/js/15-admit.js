/* 15-admit.js — 画像构建 buildProfile + 录取概率 admitProb */
/* ---------- 结局 ---------- */
function buildProfile(){
  const s=G.stats,r=G.results;
  return {
    gpa:cumGPA("U"), gpaW:cumGPA("W"),
    sat:r.satBest||0, toefl:r.toeflBest||0,
    ecCount:r.ecs.length,
    leadRoles:clamp(Math.min(s.social/2.6, r.ecs.length/3), 0, 4),   // §4.3 去台阶：社交与实际活动数双约束
    founded:(s.creativity>=7 && r.ecs.length>=6),                       // §4.3 需真正做够活动才"创办"
    natlAwards:r.awards,
    creativity:s.creativity, social:s.social, english:s.english, academic:s.academic,
    essay:clamp(r.essayQuality*0.7+s.creativity*0.3,1,10),
    rec:clamp(r.recQuality*0.7+s.social*0.25+r.reputation/100*1.5,1,10),
    luck:s.luck, stamina:s.stamina,     reputation:r.reputation,
    rigor:G.rigor,
    major:G.major,
    majorFit:G.major==="und"?0.5:G.majorFit/100,
    spike:r.spike||0,
    summer:clamp(r.summerPts||0,0,1.2),
    isIntl:true, round:"RD", majorDiff:"mid"
  };
}
// §5.2 招生官视角：把六条通道的贡献值（相对全池 57 校平均的 z 分数）算出来给面板用
function profileChannels(p){
  const rigorPts=(p.rigor==="heavy"?0.42:p.rigor==="mixed"?0.20:0);
  const gpaEff=p.gpa+rigorPts*clamp((p.gpa-2.4)/1.4,0,1);
  let zA=0,zT=0,zTO=0,n=0;
  SCHOOLS.forEach(sc=>{
    if(sc.gpaAvg!=null) zA+=(gpaEff-sc.gpaAvg)/0.35;
    if(p.sat>0){ const mid=sc.sat25!=null?(sc.sat25+sc.sat75)/2:1420; zT+=(p.sat-mid)/165; }
    if(p.toefl>0){ const ref=sc.toeflMin!=null?sc.toeflMin:95; zTO+=(p.toefl-ref)/28; }
    n++;
  });
  zA/=n; zT/=n; zTO/=n;
  const ecScore=p.ecCount*0.5+p.leadRoles*0.7+(p.founded?1:0)+p.natlAwards*1.1+p.creativity*0.15;
  const zE=Math.min(ecScore/6-0.5, 2.5);
  const er=(clamp(p.essay,0,10)+clamp(p.rec,0,10))/20;
  const zR=er-0.5;
  return {zA,zT,zTOEFL:zTO,zE,zR,majorFit:p.majorFit};
}
function admitProb(p,sc,ed,eps=0){   // eps：本季共同冲击（logit 增量），由 goEnd 统一抽取并传入
  // —— D. 国际生录取率：缺失时按国内率×0.6 保守估计（国际生通常更卷），避免退化到更宽松的国内率 ——
  let intlRate = sc.acceptRateIntl!=null ? sc.acceptRateIntl : Math.max(sc.acceptRate*0.6, 0.8);
  let baseRate = p.isIntl ? intlRate : sc.acceptRate;
  if(ed && sc.ed){
    if(sc.edAcceptRate!=null && sc.acceptRate>0){
      const mult = clamp(sc.edAcceptRate / sc.acceptRate, 1, 3.0);   // #2 ED 相对 RD 的提升倍数（钳制 1~3）
      baseRate = clamp((p.isIntl?intlRate:sc.acceptRate) * mult, 0.5, 42);
    }else{
      baseRate = clamp((p.isIntl?intlRate:sc.acceptRate) * 2.2, 0.5, 42);
    }
  }
  const base=clamp(baseRate,0.5,95)/100;
  const logit=Math.log(base/(1-base));
  const rigorPts=(p.rigor==="heavy"?0.42:p.rigor==="mixed"?0.20:0);
  const gpaEff=p.gpa+rigorPts*clamp((p.gpa-2.4)/1.4,0,1);
  const zA=sc.gpaAvg!=null?(gpaEff-sc.gpaAvg)/0.35:0;          // GPA 单调：低分真实惩罚、高分持续加
  // SAT：有 25/75 用真实中点；无（test-optional/UK/HK）用回退中点，使高分恒有正信号（不再归零）
  let zT=0;
  if(p.sat>0){ const mid = sc.sat25!=null ? (sc.sat25+sc.sat75)/2 : 1420; zT=(p.sat-mid)/165; }
  // 托福：过线不再是“平”。以 toeflMin（无则用 95）为参考，越高持续加分（边际递减由 logistic 实现）
  let zTOEFL=0;
  if(p.toefl>0){ const ref = sc.toeflMin!=null ? sc.toeflMin : 95; zTOEFL=(p.toefl-ref)/28; }
  const ecScore=p.ecCount*0.5+p.leadRoles*0.7+(p.founded?1:0)+p.natlAwards*1.1+p.creativity*0.15;
  const zE=Math.min(ecScore/6-0.5, 2.5);   // §3 硬截断：封顶活动刷子(ecScore>18)，普通玩家零感知
  const er=(clamp(p.essay,0,10)+clamp(p.rec,0,10))/20;
  const zR=er-0.5;
  let wA=0.28, wT=0.20, wTO=0.12, wE=0.24, wR=0.16;
  if(sc.testBlind){ wA+=0.13; wE+=0.07; wT=0; }   // §4.5 test-blind：SAT 权重归零，转给 GPA 与活动
  let S=wA*zA+wT*zT+wTO*zTOEFL+wE*zE+wR*zR;
  S+=(p.luck-5)*0.02;   // §4.3 运气权重 0.03→0.02（且运气无法靠行动培养，降权避免开局买点主导）
  S+=(p.reputation/100-0.4)*0.12;
  const mw=(sc.admitByMajor==="major"||sc.admitByMajor==="major-strict"||sc.region==="UK"||sc.region==="HK")?0.5:0.18;
  S+=(p.majorFit-0.5)*mw;
  let P=1/(1+Math.exp(-(logit+ADMIT_SCALE*S+eps)));   // §5.1 共同冲击：eps>0 好年(各校易录)/eps<0 坏年(各校难录)
  // 标化惩罚（保底乘法）：未考/低于线 明显扣减
  if(p.toefl===0) P*=0.75;
  else if(sc.toeflMin!=null&&p.toefl<sc.toeflMin) P*=0.6;
  if(p.sat===0) P*=0.7;   // 与托福一致：未考标化同样明显惩罚
  // —— C. 顶尖校“信号弹”收紧：降权 + 部分叠加，不再单向 max 直接抬到 P2 ——
  //    强推/国际大奖/一作(spike) 与 顶尖夏校(summer) 只抬最难校，但加成减半且只取一半幅度，
  //    避免活动/奖项掩盖学术短板。
  const dist=(p.spike||0)*0.4 + (p.summer||0)*0.3;
  if(dist>0){
    const sel=clamp(-Math.log(base/(1-base))/3.0, 0, 1.1); // 选择性权重：顶尖校 ~1.1，普通校 ~0
    const add=dist*sel*0.5;                                // 降权到原一半
    const P2=1/(1+Math.exp(-(logit+ADMIT_SCALE*S+add)));
    P = P + (P2 - P)*0.5;                                  // 部分叠加（最多拿到一半加成）
  }
  // —— B. 硬门槛：test-required 美校缺 SAT / 有托福线却无托福，直接压到极低（模拟基本拒） ——
  //    UK/HK 与 test-optional 美校（sat25 为空或未标 testReq）自然豁免，不会被误杀。
  if(p.sat===0 && sc.sat25!=null && sc.region==="US" && sc.testReq) P=Math.min(P,0.012);
  if(p.toefl===0 && sc.toeflMin!=null) P=Math.min(P,0.015);
  return clamp(P,0.002,0.995);
}
function personality(){
  const s=G.stats,r=G.results,tags=[];
  if(s.academic>=8&&s.social<5)tags.push("书呆子学霸");
  if(s.social>=7&&s.creativity>=6)tags.push("斜杠青年");
  if(r.stressMax>=70||s.stamina<3)tags.push("倦怠战士");
  if(s.luck>=8)tags.push("天选之子");
  if(s.creativity>=8)tags.push("才艺咖");
  if(s.english>=9)tags.push("语言怪物");
  if(s.academic<4&&r.ecs.length<2)tags.push("佛系青年");
  const vals=[s.academic,s.english,s.stamina,s.creativity,s.social];
  if(tags.length===0&&vals.every(v=>v>=5&&v<=8))tags.push("全能均衡型");
  if(tags.length===0)tags.push("潜力股");
  return tags;
}
function narrative(tags){
  const s=G.stats,r=G.results;
  const eng=r.satBest?`SAT ${r.satBest}`:`英语 ${s.english.toFixed(1)}（未考）`;
  return `你是 <b>${tags.join(" / ")}</b>。GPA ${cumGPA("U").toFixed(2)}（加权 ${cumGPA("W").toFixed(2)}）、${eng}、托福 ${r.toeflBest||"—"}，${r.ecs.length} 段经历、${r.awards} 个奖项，声望 ${Math.round(r.reputation)}、压力峰值 ${Math.round(r.stressMax)}%。${s.luck>=8?'运气格外眷顾你。':s.stamina<3?'身体常常亮红灯。':'一路有惊无险。'}`;
}
function renderTranscript(){
  const ss=G.results.semesters;
  let rows=ss.map((s,i)=>{
    const yr=["初三","初三","高一","高一","高二","高二","高三"][i];
    const sm=i%2===0?"上":"下";
    return `<tr><td>${yr}${sm}</td><td>${s.courses.map(c=>`<span class="gpill">${c.g}</span>`).join("")}</td>
      <td>${s.gpaU.toFixed(2)}</td><td>${s.gpaW.toFixed(2)}</td></tr>`;
  }).join("");
  $("transcript").innerHTML=`
    <table class="trans"><tr><th>学期</th><th>各科等级</th><th>学期 GPA</th><th>加权</th></tr>${rows}</table>
    <div class="scores" style="margin-top:10px">
      <span>累计 GPA <b>${cumGPA("U").toFixed(2)}</b></span>
      <span>累计加权 <b>${cumGPA("W").toFixed(2)}</b></span>
      <span>课程难度 ${RIGOR[G.rigor].name}</span>
    </div>`;
}
function renderAch(){
  const r=G.results,s=G.stats;
  $("achList").innerHTML=ACHIEVEMENTS.map(a=>{
    const got=a.test(r,s);
    return `<div class="ach ${got?'got':''}"><span class="dot"></span>${a.name}</div>`;
  }).join("");
}
function goEnd(){
  $("pick").classList.remove("on"); $("endgame").classList.add("on");
  const p=PICK.p||buildProfile();
  const tags=personality();
  $("persTags").innerHTML=tags.map(t=>`<span class="tag">${t}</span>`).join("");
  $("persNarr").innerHTML=narrative(tags);
  const fc=$("finalChips"); fc.innerHTML="";
  Object.keys(STAT_NAMES).forEach(k=>{
    const d=document.createElement("span"); d.className="st";
    d.innerHTML=`${ic(STAT_ICON[k])}${STAT_NAMES[k]} <b>${G.stats[k].toFixed(1)}</b>`;
    fc.appendChild(d);
  });
  renderTranscript(); renderAch();
  const byName={}; SCHOOLS.forEach(s=>byName[s.nameEn]=s);
  const eps=(typeof G.seasonEps==="number")?G.seasonEps:gauss(0,EPS_SIGMA);   // §5.1 共同冲击：选校时已抽取，ED/RD 共用；直接进结局则现场补抽
  const edBox=$("edResult");
  let edAdmitted=false, edGrade="none", edBest=null, edBand="safety";
  if(PICK.edSel){
    const sc=PICK.edSel, Ped=admitProb(p,sc,true,eps), admit=Math.random()<Ped;
    edAdmitted=admit;
    // ED 校档位按该生 ED 录取率套用与 RD 一致的三档阈值（≤10% 冲刺 / 10–30% 匹配 / >30% 保底）
    edBand = Ped<=0.10?"reach":Ped<=0.30?"match":"safety";
    edGrade = edBand==="reach"?"S":edBand==="match"?"A":"B";
    edBest=sc;
    edBox.innerHTML=`<div class="env open" style="cursor:default"><div class="rank">#${sc.rank} · ED（早决定）</div><div class="nm">${sc.nameZh}</div><div class="result ${admit?'ad':'rej'}">${admit?'录取 · 绑定入学':'未录取'}</div><div class="pp">ED 概率 ${(Ped*100).toFixed(1)}%${admit?'。按 ED 绑定规则，你已撤回全部 RD 申请，尘埃落定！':'。转入 RD 常规轮。'}</div></div>`;
  } else edBox.innerHTML=`<div class="small">未选 ED，全部走 RD。</div>`;
  const rdBox=$("rdTable");
  if(edAdmitted){
    const bz=b=>b==="reach"?"冲刺":b==="match"?"匹配":"保底";
    const score=computeScore(edBest,edGrade);
    LAST_RESULT={school:edBest.nameZh, band:bz(edBand), grade:edGrade, score, gpa:cumGPA("U"), sat:G.results.satBest||0};
    rdBox.innerHTML=`<div class="small" style="padding:10px 0">ED 已录取（绑定入学）。按真实规则你已撤回全部 <b>${PICK.rdSel.length}</b> 所 RD 申请，<b>无 RD 最终录取信息</b>。</div>
      <div class="rdsum grade-${edGrade}" style="margin-top:10px"><div class="rdg"><span class="rdgl">评级</span><b class="rdgv">${edGrade}</b></div><div class="rdl">最佳录取：<b>${edBest.nameZh}（${bz(edBand)}）</b></div><div class="rds">ED 早申已锁定 · ${edGrade==="S"?"逆风翻盘冲入冲刺":edGrade==="A"?"稳扎稳打进匹配":"保底上岸"}</div></div>
      <div class="rdbar"><button class="btn" id="uploadBtn">🏆 上传到排行榜</button><span class="small">拆开结果后即可留名，上传你的最佳战绩</span></div><div id="uploadForm" class="collapsed"></div>`;
    rdBox.querySelector('#uploadBtn').onclick=()=>openUploadForm(rdBox);
  } else {
    // 档位以选校时确定的 .band 为准（此前漏传 band，导致 r.band 恒为 undefined → 全部落到默认的"保底"）
    let rows=PICK.rdSel.map(o=>{const sc=byName[o.nameEn];const P=admitProb(p,sc,false,eps);const admit=Math.random()<P;return {sc,P,admit,band:o.band};});
    rows.sort((a,b)=>b.P-a.P);
    const got=rows.filter(r=>r.admit).length;
    const bz=b=>b==="reach"?"冲刺":b==="match"?"匹配":"保底";
    // §5.1 计分：最佳录取优先按档位（冲刺 > 匹配 > 保底），同档再按 rank（越小越牛）+ S/A/B 评级
    const bandW={reach:3,match:2,safety:1};
    const admitted=rows.filter(r=>r.admit).sort((a,b)=>bandW[b.band]-bandW[a.band]||a.sc.rank-b.sc.rank);
    const best=admitted[0]||null;
    const grade=!best?"none":best.band==="reach"?"S":best.band==="match"?"A":"B";
    const gtxt={none:"落空 · 本季全拒",S:"S 级 · 逆风翻盘冲入冲刺",A:"A 级 · 稳扎稳打进匹配",B:"B 级 · 保底上岸"}[grade];
    const score=best?computeScore(best.sc,grade):0;
    // 评级与上传：默认收进 #rdSummary（.collapsed），拆开 offer 之后才 reveal，保留悬念
    const summary=`<div class="rdg"><span class="rdgl">评级</span><b class="rdgv">${grade==="none"?"—":grade}</b></div><div class="rdl">最佳录取：<b>${best?best.sc.nameZh+"（"+bz(best.band)+"）":"无"}</b></div><div class="rds">常规 RD 录取 <b>${got}</b> / ${rows.length} 所${best?" ｜ 最高冲入 "+bz(best.band)+" 档":""} ｜ ${gtxt}</div>
      <div class="rdbar"><button class="btn" id="uploadBtn">🏆 上传到排行榜</button><span class="small">拆开 offer 后留名，上传你的最佳战绩</span></div><div id="uploadForm" class="collapsed"></div>`;
    // 翻牌：每张正面写校名/档/概率，点击拆开 → 背面显示录取或拒绝
    let cards=`<div class="offers">`;
    rows.forEach(r=>{
      cards+=`<div class="offer"><div class="offer-inner">
        <div class="offer-front"><div class="rank">#${r.sc.rank} · ${bz(r.band)}</div><div class="nm">${r.sc.nameZh}</div><div class="pp">录取率 ${(r.P*100).toFixed(1)}%</div><div class="hint">点击拆开 →</div></div>
        <div class="offer-back"><div class="rank">#${r.sc.rank} · ${bz(r.band)}</div><div class="nm">${r.sc.nameZh}</div><div class="result ${r.admit?'ad':'rej'}">${r.admit?'录取':'拒绝'}</div><div class="pp">录取率 ${(r.P*100).toFixed(1)}%</div></div>
      </div></div>`;
    });
    cards+=`</div>`;
    // 一键拆 offer 后展示的清单（即此前那种列表式界面）
    let tbl=`<table class="mini"><tr><th>校</th><th>档</th><th>概率</th><th>结果</th></tr>`;
    rows.forEach(r=>{ tbl+=`<tr><td>${tagOf(r.sc)} ${r.sc.nameZh}</td><td>${bz(r.band)}</td><td>${(r.P*100).toFixed(1)}%</td><td style="color:${r.admit?'var(--good)':'var(--bad)'}">${r.admit?'录取':'拒绝'}</td></tr>`; });
    tbl+=`</table><div class="small" style="margin-top:6px">常规 RD 录取 <b>${got}</b> / ${rows.length} 所。</div>`;
    LAST_RESULT={school: best?best.sc.nameZh:"无", band: best?bz(best.band):"—", grade, score, gpa:cumGPA("U"), sat:G.results.satBest||0};
    // 评级/上传默认收起，拆开 offer 后才出现
    rdBox.innerHTML=`<div class="rdbar"><button class="btn" id="revealAllBtn">🎴 一键拆 offer</button><span class="small">逐张点击模拟拆信；或一键全开看清单与评级</span></div>${cards}<div id="rdReveal" class="collapsed">${tbl}</div><div id="rdSummary" class="collapsed"><div class="rdsum grade-${grade}">${summary}</div></div>`;
    rdBox.querySelectorAll('.offer').forEach(el=>{ el.onclick=()=>{ el.classList.toggle('flipped'); maybeRevealRating(rdBox); }; });
    const ra=rdBox.querySelector('#revealAllBtn');
    ra.onclick=()=>{ rdBox.querySelectorAll('.offer').forEach(el=>el.classList.add('flipped')); rdBox.querySelector('#rdReveal').classList.remove('collapsed'); rdBox.querySelector('#rdSummary').classList.remove('collapsed'); ra.textContent='已拆开 ✓'; ra.disabled=true; renderLeaderboard(); };
    rdBox.querySelector('#uploadBtn').onclick=()=>openUploadForm(rdBox);
  }
  // 与选校卡片、拆 offer 共用同一份本季 ε：这样表中数值与玩家在选校页看到的概率、最终摇号概率完全一致，
  // 不再出现“表里 8%、卡片里 12%”的割裂（上一轮已把分档/卡片/摇号统一到 ε）。
  const asc=SCHOOLS.map(sc=>{
    const P=admitProb(p,sc,false,eps);
    return {sc,P,
      intl: sc.acceptRateIntl!=null?sc.acceptRateIntl.toFixed(1)+"%":"—",
      satMid: sc.sat25!=null?Math.round((sc.sat25+sc.sat75)/2):"—"};
  }).sort((a,b)=>b.P-a.P);
  const epsNote = eps>0.01 ? `本季为「好年」（ε=${eps.toFixed(2)}），整体略高于中性基准。`
                : eps<-0.01 ? `本季为「坏年」（ε=${eps.toFixed(2)}），整体略低于中性基准。`
                : `本季为中性基准年。`;
  $("allTable").innerHTML=`<div class="small" style="margin-bottom:6px">表中为<b>本季录取气候下（含共同冲击 ε）的 RD 期望录取率</b>，与上方选校卡片、拆 offer 时的概率<b>完全一致</b>。${epsNote}按由难到易（录取率从低到高）排列。</div><table class="mini"><tr><th>排名</th><th>中文</th><th>英文</th><th>国际录取率</th><th>SAT 中</th><th>RD 概率</th></tr>${asc.slice().reverse().map(x=>`<tr><td>${tagOf(x.sc)}</td><td>${x.sc.nameZh}</td><td>${x.sc.nameEn}</td><td>${x.intl}</td><td>${x.satMid}</td><td>${(x.P*100).toFixed(1)}%</td></tr>`).join("")}</table>`;
  renderLeaderboard();
  if(lbHasUploaded()) hideUploadUI(rdBox);
}

