/* 06-setup.js — 开局界面：六维配点 / 特质 / 难度 / 专业 */
/* ---------- setup UI ---------- */
let editStats={academic:4,english:4,stamina:4,creativity:4,social:4,luck:4};
let editTraits=[], editRigor="mixed", editMajor="und";
function renderMajors(){
  const row=$("majorRow"); if(!row) return;
  row.innerHTML=MAJORS.map(m=>`<button class="major ${editMajor===m.id?'on':''}" data-m="${m.id}"><b>${m.name}</b></button>`).join("");
  row.querySelectorAll("button").forEach(b=>{ b.onclick=()=>{ editMajor=b.dataset.m; renderMajors(); }; });
  $("majorDesc").textContent=(MAJOR_BYID[editMajor]||{}).desc||"";
}
function ptsUsed(){return Object.values(editStats).reduce((a,b)=>a+b,0);}
function rollTraits(){
  const pool=shuffle(TRAITS);
  editTraits=[pool[0],pool[1]];
  renderTraits();
}
function renderTraits(){
  $("traitBox").innerHTML=editTraits.map(t=>`<div class="trait"><b>${t.name}</b><small>${t.desc}</small></div>`).join("");
}
function renderRigor(){
  $("rigorRow").innerHTML=Object.keys(RIGOR).map(k=>
    `<button class="rigor ${editRigor===k?'on':''}" data-r="${k}"><b>${RIGOR[k].name}</b><small>${RIGOR[k].desc}</small></button>`).join("");
  $("rigorRow").querySelectorAll("button").forEach(b=>{
    b.onclick=()=>{editRigor=b.dataset.r;renderRigor();};
  });
  $("rigorDesc").textContent=RIGOR[editRigor].desc;
}
function renderSetup(){
  const tr=$("tplRow"); tr.innerHTML="";
  Object.keys(TEMPLATES).forEach(name=>{
    const t=document.createElement("div"); t.className="tpl";
    t.innerHTML=`<b>${name}</b><small>${TPL_DESC[name]}</small>`;
    t.onclick=()=>{editStats=Object.assign({},TEMPLATES[name]);renderSetup();};
    tr.appendChild(t);
  });
  const r0=document.createElement("div"); r0.className="tpl";
  r0.innerHTML=`<b>随机</b><small>交给骰子</small>`;
  r0.onclick=()=>{Object.keys(editStats).forEach(k=>editStats[k]=ri(1,10));normalizeTo24();renderSetup();};
  tr.appendChild(r0);

  $("ptsLeft").textContent=`剩余 ${START_POINTS-ptsUsed()} 点`;
  const ed=$("statEditors"); ed.innerHTML="";
  Object.keys(STAT_NAMES).forEach(k=>{
    const row=document.createElement("div"); row.className="stat-row";
    row.innerHTML=`<div class="nm">${ic(STAT_ICON[k])}${STAT_NAMES[k]}</div>
      <div class="stepper"><button data-k="${k}" data-d="-1">−</button></div>
      <div class="val" id="v_${k}">${editStats[k]}</div>
      <div class="stepper"><button data-k="${k}" data-d="1">+</button></div>
      <div class="bar"><i style="width:${editStats[k]/12*100}%"></i></div>`;
    ed.appendChild(row);
  });
  ed.querySelectorAll("button").forEach(b=>{
    b.onclick=()=>{
      const k=b.dataset.k,d=+b.dataset.d;
      if(d>0 && ptsUsed()>=START_POINTS) return;
      editStats[k]=clamp(editStats[k]+d,1,12);
      renderSetup();
    };
  });
  renderRigor();
  renderMajors();
}
function normalizeTo24(){
  while(ptsUsed()>START_POINTS){
    const ks=Object.keys(editStats).sort((a,b)=>editStats[b]-editStats[a]);
    for(const k of ks){ if(editStats[k]>1){editStats[k]--;break;} }
  }
  // #9：点数没花满时补回（原逻辑只做减法，导致可低于 24 点开局）
  while(ptsUsed()<START_POINTS){
    const ks=Object.keys(editStats).filter(k=>editStats[k]<12);
    if(!ks.length) break;
    editStats[pick(ks)]++;
  }
}
