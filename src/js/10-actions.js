/* 10-actions.js — 行动池 + 各行动效果 + 压力 */
/* ---------- actions ---------- */
const ACTIONS=[
  {id:"vocab",   name:"背单词",   icon:"globe", energy:15, stress:5,  run:doVocab},
  {id:"oral",    name:"口语角",   icon:"people",energy:15, stress:4,  run:doOral},
  {id:"read",    name:"读外刊",   icon:"book",  energy:12, stress:3,  run:doRead},
  {id:"write",   name:"打磨文书", icon:"pencil",energy:18, stress:6,  run:doWrite, stage:[6,7]},
  {id:"sat",     name:"刷 SAT",   icon:"pencil",energy:35, stress:12, run:doSAT},
  {id:"toefl",   name:"刷托福",   icon:"globe", energy:25, stress:8,  run:doTOEFL},
  {id:"study",   name:"啃硬课",   icon:"book",  energy:25, stress:10, run:doStudy},
  {id:"library", name:"泡图书馆", icon:"book",  energy:20, stress:6,  run:doLibrary},
  {id:"research",name:"做科研",   icon:"bulb",  energy:28, stress:12, run:doResearch},
  {id:"contest", name:"冲竞赛",   icon:"award", energy:30, stress:14, run:doContest},
  {id:"club",    name:"搞社团",   icon:"flag",  energy:20, stress:8,  run:doClub},
  {id:"talent",  name:"发展特长", icon:"bulb",  energy:20, stress:6,  run:doTalent},
  {id:"network", name:"经营人脉", icon:"people",energy:15, stress:5,  run:doNetwork},
  {id:"zk",      name:"中考复习", icon:"book",  energy:18, stress:8,  run:doZk, stage:[0,1]},
  {id:"code",    name:"写代码做项目", icon:"bolt",  energy:26, stress:10, major:"cs",  run:doCode},
  {id:"biz",     name:"搞商赛/创业", icon:"flag",  energy:24, stress:9,  major:"biz", run:doBiz},
  {id:"lab",     name:"进实验室", icon:"book", energy:26, stress:10, major:"sci", run:doLab},
  {id:"debate",  name:"社科调研", icon:"people",energy:18, stress:5,  major:"soc", run:doDebate},
  {id:"art",     name:"艺术创作", icon:"bulb", energy:18, stress:5,  major:"art", run:doArt},
  {id:"med",     name:"医疗志愿", icon:"heart", energy:20, stress:6,  major:"med", run:doMed}
];
const REST={id:"rest",name:"休息",icon:"moon",energy:-45,stress:-14,run:doRest};   // 压力系统②：减压由 -25→-14，休息不再“随便补偿”
function dealActions(){
  const r=G.round;
  let basicIds=["vocab","study"];
  if(r>=2) basicIds.push("toefl");
  if(r>=4) basicIds.push("sat");
  if(r>=6) basicIds.push("write");
  if(r<=1) basicIds.push("zk");
  G.dealtBasic=ACTIONS.filter(a=>basicIds.includes(a.id));
  let pool=shuffle(ACTIONS.filter(a=>!basicIds.includes(a.id) && (!a.stage || a.stage.includes(r))));
  if(G.major!=="und"){
    const m=MAJOR_BYID[G.major];
    const rel=pool.filter(a=>a.major===G.major||(m&&m.related.includes(a.id)));
    const others=pool.filter(a=>!rel.includes(a));
    G.dealtRand=rel.slice(0,2).concat(shuffle(others.concat(rel.slice(2)))).slice(0,DEALT);   // #11：第3+个对口行动也进随机池
  }else{
    G.dealtRand=pool.slice(0,DEALT);
  }
}

/* —— 英语类 —— */
function doVocab(){
  const g=mulFx('englishGain',1)*0.50*pen();   // 英语难度下调：单次加成 0.35→0.50
  G.stats.english=clamp(G.stats.english+g,1,12);
  return ["good",`词汇量上涨，英语 +${g.toFixed(2)}（现 ${G.stats.english.toFixed(1)}）。`];
}
function doOral(){
  const e=mulFx('englishGain',1)*0.42*pen(), s=mulFx('socialGain',1)*0.2*pen();   // 英语 0.30→0.42
  G.stats.english=clamp(G.stats.english+e,1,12);
  G.stats.social=clamp(G.stats.social+s,1,12);
  G.results.reputation=clamp(G.results.reputation+2*mulFx('socialGain',1),0,100);
  return ["good",`开口说英语，英语 +${e.toFixed(2)}、社交 +${s.toFixed(2)}、声望 +2。`];
}
function doRead(){
  const e=mulFx('englishGain',1)*0.38*pen();   // 英语 0.25→0.38
  G.stats.english=clamp(G.stats.english+e,1,12);
  G.stats.creativity=clamp(G.stats.creativity+0.15*pen(),1,12);
  G.results.essayQuality=clamp(G.results.essayQuality+0.35*mulFx('craftGain',1),0,10);   // 0.15→0.35
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  return ["good",`啃外刊，英语 +${e.toFixed(2)}，文书 +0.35、声望 +1。`];
}
function doWrite(){
  const e=0.25*mulFx('englishGain',1)*pen();   // 英语 0.15→0.25
  G.stats.english=clamp(G.stats.english+e,1,12);
  G.results.essayQuality=clamp(G.results.essayQuality+2.5*mulFx('craftGain',1),0,10);   // §4.1 文书 1.4→2.5
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  return ["good",`文书改到第 N 版，文书质量 ${G.results.essayQuality.toFixed(1)}/10、声望 +1。`];
}
/* —— 标化：SAT 与托福分开，SAT 10 分一档 —— */
function doSAT(){
  const e=G.stats.english,lk=G.stats.luck;
  const penalty=clamp((G.stress-40)/60,0,1)*70;   // §4.2 线性：压力越高扣分越多，无免疫阈值
  const base=1090+40*e;
  const noise=gauss(0,55)*(1-0.04*lk);
  let sat=Math.round(clamp(base+noise+(lk-6)*5-penalty,400,1560)/10)*10;
  if(sat>=1560 && Math.random()<0.03) sat=1600;   // 满分极罕见：仅顶级发挥 + 极小概率
  const prev=G.results.satBest;
  if(sat>prev) G.results.satBest=sat;
  const expected=Math.round(base);
  let msg,cls;
  if(sat>=expected+80){msg=`SAT ${sat}，超常发挥。`;cls="good";}
  else if(sat<expected-80){msg=`SAT ${sat}，翻车了，下回合还能再刷。`;cls="bad";}
  else {msg=`SAT ${sat}，中规中矩。`;cls="warn";}
  if(sat<=prev) msg+=`（未超过最佳 ${prev}）`;
  if(penalty>0) msg+="（高压扣分）";
  if(sat===1600) msg+=" 满分！凤毛麟角。";
  return [cls,msg];
}
function doTOEFL(){
  const e=G.stats.english,lk=G.stats.luck;
  const penalty=clamp((G.stress-40)/60,0,1)*7;    // §4.2 线性
  const base=52+5.6*e;
  const noise=gauss(0,5)*(1-0.04*lk);
  let toefl=Math.round(clamp(base+noise+(lk-6)*1.2-penalty,40,118));
  if(toefl>=118 && Math.random()<0.03) toefl=120;   // 满分极罕见：仅顶级发挥 + 极小概率
  const prev=G.results.toeflBest;
  if(toefl>prev) G.results.toeflBest=toefl;
  let msg=toefl>prev?`托福 ${toefl}，刷新最佳。`:`托福 ${toefl}（未超过最佳 ${prev}）。`;
  if(penalty>0) msg+="（高压扣分）";
  if(toefl===120) msg+=" 满分！凤毛麟角。";
  return [toefl>=100?"good":toefl>=85?"warn":"bad",msg];
}
/* —— 学术 & 其他 —— */
function doStudy(){
  const g=0.7*pen()*mulFx('academicGain',1);
  G.stats.academic=clamp(G.stats.academic+g,1,12);
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  return ["good",`死磕课业，学术 +${g.toFixed(2)}（现 ${G.stats.academic.toFixed(1)}）、声望 +1。`];
}
function doLibrary(){
  const g=0.5*pen()*mulFx('academicGain',1);
  G.stats.academic=clamp(G.stats.academic+g,1,12);
  G.stats.creativity=clamp(G.stats.creativity+0.1,1,12);
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  return ["good",`图书馆一日游，学术 +${g.toFixed(2)}、声望 +1。`];
}
function doResearch(){
  const g=0.45*pen()*mulFx('academicGain',1);   // §4.1 学术 0.6→0.45
  G.stats.academic=clamp(G.stats.academic+g,1,12);
  G.results.recQuality=clamp(G.results.recQuality+0.35*mulFx('craftGain',1),0,10);   // §4.1 推荐信 0.4→0.35
  G.results.ecs.push("科研");
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  if(Math.random()<0.12+0.02*G.stats.academic){G.results.awards++;G.results.reputation=clamp(G.results.reputation+1,0,100);return ["good",`科研出成果还拿了奖，学术 +、奖项 +1、声望 +2。`];}   // §4.1 奖概率 0.2+0.03ac→0.12+0.02ac
  return ["good",`泡实验室，学术 +${g.toFixed(2)}、推荐信潜力 +、声望 +1。`];
}
function doContest(){
  G.stats.creativity=clamp(G.stats.creativity+0.3*pen(),1,12);
  G.results.reputation=clamp(G.results.reputation+2,0,100);
  G.results.ecs.push("竞赛");
  const p=0.35+0.05*G.stats.creativity+0.02*G.stats.luck - (G.stress/100)*0.2;
  if(Math.random()<p){G.results.awards++;return ["good",`竞赛拿奖！国家级奖项 +1（共 ${G.results.awards} 个）。`];}
  return ["warn",`竞赛陪跑，但声望 +2、创造力 +。`];
}
function doClub(){
  const s=mulFx('socialGain',1)*0.4*pen();
  G.stats.social=clamp(G.stats.social+s,1,12);
  G.stats.creativity=clamp(G.stats.creativity+0.2*pen(),1,12);
  G.results.ecs.push(pick(["社团","志愿","运动队","乐队","科创"]));
  G.results.reputation=clamp(G.results.reputation+3*mulFx('socialGain',1),0,100);
  return ["good",`社团活动，社交 +${s.toFixed(2)}、声望 +3、履历 +1 项。`];
}
function doTalent(){
  const g=0.6*pen();
  G.stats.creativity=clamp(G.stats.creativity+g,1,12);
  G.results.essayQuality=clamp(G.results.essayQuality+0.2*mulFx('craftGain',1),0,10);
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  if(Math.random()<0.25+0.05*G.stats.creativity){G.results.awards++;return ["good",`特长精进还顺手拿奖，荣誉 +1、声望 +1！`];}
  return ["good",`死磕特长，创造力 +${g.toFixed(2)}、声望 +1。`];
}
function doNetwork(){
  const s=mulFx('socialGain',1)*0.6*pen();   // §4.1 社交 0.5→0.6
  G.stats.social=clamp(G.stats.social+s,1,12);
  G.results.recQuality=clamp(G.results.recQuality+0.9*mulFx('craftGain',1),0,10);   // §4.1 推荐信 0.6→0.9
  G.results.reputation=clamp(G.results.reputation+2*mulFx('socialGain',1),0,100);
  return ["good",`经营人脉，社交 +${s.toFixed(2)}、推荐信 ${G.results.recQuality.toFixed(1)}/10、声望 +2。`];
}
function doRest(){
  // 精力/压力由 doAction 依据行动元数据（energy:-45, stress:-25）统一结算，这里不再重复施加
  return ["good","睡了个好觉，精力回血、压力 −25。"];
}
function doCode(){
  const g=mulFx('academicGain',1)*0.4*pen();
  G.stats.academic=clamp(G.stats.academic+g,1,12);
  G.results.ecs.push("编程项目");
  G.results.reputation=clamp(G.results.reputation+2,0,100);
  return ["good",`写了个能跑的项目，学术 +${g.toFixed(2)}、履历 +1、声望 +2。`];
}
function doBiz(){
  const s=mulFx('socialGain',1)*0.3*pen();
  G.stats.social=clamp(G.stats.social+s,1,12);
  G.results.ecs.push("商赛/创业");
  G.results.reputation=clamp(G.results.reputation+2,0,100);
  return ["good",`带队打商赛，社交 +${s.toFixed(2)}、履历 +1、声望 +2。`];
}
function doLab(){
  const g=mulFx('academicGain',1)*0.5*pen();
  G.stats.academic=clamp(G.stats.academic+g,1,12);
  G.results.ecs.push("实验室科研");
  G.results.recQuality=clamp(G.results.recQuality+0.3*mulFx('craftGain',1),0,10);
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  return ["good",`进实验室搬砖，学术 +${g.toFixed(2)}、推荐信潜力 +、声望 +1。`];
}
function doDebate(){
  const s=mulFx('socialGain',1)*0.3*pen();
  G.stats.social=clamp(G.stats.social+s,1,12);
  G.results.essayQuality=clamp(G.results.essayQuality+0.3*mulFx('craftGain',1),0,10);
  G.results.ecs.push("社科调研");
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  return ["good",`做社会调研写报告，社交 +${s.toFixed(2)}、文书 +、履历 +、声望 +1。`];
}
function doArt(){
  const g=0.5*pen();
  G.stats.creativity=clamp(G.stats.creativity+g,1,12);
  G.results.essayQuality=clamp(G.results.essayQuality+0.2*mulFx('craftGain',1),0,10);
  G.results.ecs.push("艺术作品集");
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  return ["good",`打磨作品集，创造力 +${g.toFixed(2)}、文书 +、履历 +、声望 +1。`];
}
function doMed(){
  const g=0.4*pen();
  G.stats.academic=clamp(G.stats.academic+g,1,12);
  G.stats.social=clamp(G.stats.social+0.2*pen(),1,12);
  G.results.ecs.push("医疗志愿");
  G.results.reputation=clamp(G.results.reputation+2,0,100);
  return ["good",`医院志愿服务，学术 +${g.toFixed(2)}、社交 +、声望 +2、履历 +。`];
}
function doZk(){
  const g=0.6*pen()*mulFx('academicGain',1);
  G.stats.academic=clamp(G.stats.academic+g,1,12);
  G.results.ecs.push("中考备战");
  G.results.reputation=clamp(G.results.reputation+1,0,100);
  return ["good",`中考刷题，学术 +${g.toFixed(2)}、履历 +1、声望 +1。`];
}
// 压力 → 行动收益乘子（核心压力机制，替代旧版「直接扣 GPA」）
// 设计意图：压力不再直接对 GPA 做减法；改为「压力越高，常规行动与随机行动的每次收益越小」。
// 所有 doX 行动函数都已把各自的收益乘以 pen()，所以调低 pen() 即全局削弱高压下的成长效率。
// 调参只看下面两个常量：
//   STRESS_BENEFIT_START：压力低于此值收益不减（默认 20，单位 0~100）
//   STRESS_BENEFIT_FLOOR：高压时收益乘子的下限（默认 0.5，即最高压时收益降至 50%）。
const STRESS_BENEFIT_START=20;
const STRESS_BENEFIT_FLOOR=0.5;
function pen(){
  return 1 - (1-STRESS_BENEFIT_FLOOR)*clamp((G.stress-STRESS_BENEFIT_START)/(100-STRESS_BENEFIT_START),0,1);
}
// 事件造成的压力统一走此函数，套用抗压/玻璃心等 stressMul 特质倍率（行动压力在 doAction 已走倍率）
function addStress(g,n){ g.stress=clamp(g.stress + n*mulFx('stressMul',1), 0, 100); }
