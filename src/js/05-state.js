/* 05-state.js — 全局状态 / 精力 / 累计 GPA */
/* ---------- state ---------- */
let G=null;
function freshState(stats,traits,rigor,major){
  return {
    round:0, ap:AP_BY_ROUND[0],
    energy:55, stress:0,
    semAcc:{eSum:0,sSum:0,n:0},   // #3 本学期精力/压力均值累计
    stats:Object.assign({},stats),
    traits:traits||[], rigor:rigor||"mixed", major:major||"und",
    majorFit:30,
    results:{satBest:0,toeflBest:0,semesters:[],awards:0,ecs:[],
             reputation:0,recQuality:3,essayQuality:3,stressMax:0,
             spike:0, summerPts:0},
    summerDone:false,
    powerCount:0,   // #10 本局已抽到的 power 事件次数（上限 2）
    log:[], usedEvents:[], phase:'event', dealtBasic:null, dealtRand:[]
  };
}
function maxEnergy(){ return 50 + 6*G.stats.stamina + sumFx('stamina',0); }   // §4.3 精力斜率加陡：stamina 更值钱
function cumGPA(kind){
  const ss=G.results.semesters;
  if(!ss.length) return 0;
  let totC=0,tot=0;
  ss.forEach(s=>{ totC+=s.credits; tot+=(kind==="W"?s.gpaW:s.gpaU)*s.credits; });
  return tot/totC;
}
