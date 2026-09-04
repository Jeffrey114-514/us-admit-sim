/* 11-semester.js — 每学期成绩单生成与结算 */
/* ---------- GPA：每学期成绩单 ---------- */
// 年级加成：低年级（初三/高一）课程更易拿 A，降低 GPA 刷取难度；
// 高三还原真实压力。索引对应 round 0..6（初三上 … 高三上）。
const GRADE_EASE=[0.6,0.6,0.3,0.3,0.1,0.1,0];
function genSemesterCourses(){
  const plan=RIGOR[G.rigor].mix, courses=[];
  const eRatio=G.semAcc.n ? G.semAcc.eSum/G.semAcc.n : G.energy/maxEnergy();
  const ease=GRADE_EASE[G.round]||0;
  for(const [lvl,n] of plan){
    for(let i=0;i<n;i++){
      let raw=2.6+0.117*G.stats.academic;
      raw+=(eRatio-0.5)*0.45;
      raw+=(G.stats.luck-6)*0.03;
      raw-=LEVEL_DIFF[lvl];
      raw+=ease;   // 低年级更易拿 A：中低学术也能全 A
      raw+=gauss(0,0.22);
      raw=clamp(raw,0,4.0);
      const gr=snapGrade(raw);
      courses.push({lvl,p:gr[1],g:gr[0],credit:1.0,wp:Math.min(5,gr[1]+LEVEL_BONUS[lvl])});
    }
  }
  return courses;
}
function closeSemester(){
  const courses=genSemesterCourses();
  const credits=SEM_W[G.round]*courses.reduce((a,c)=>a+c.credit,0);   // §4.6 学期权重：高年级学分更“重”
  const qpU=courses.reduce((a,c)=>a+c.p*c.credit,0);
  const qpW=courses.reduce((a,c)=>a+c.wp*c.credit,0);
  const sem={i:G.round,courses,gpaU:clamp(qpU/credits,0,4),gpaW:clamp(qpW/credits,0,4),credits};
  G.results.semesters.push(sem);
  const avgU=courses.reduce((a,c)=>a+c.p,0)/courses.length;
  pushLog(avgU>=3.7?"good":avgU>=3.0?"warn":"bad",
    `【第 ${G.round+1} 学期成绩单】${courses.map(c=>c.g).join(" ")} · 学期 GPA ${sem.gpaU.toFixed(2)}（加权 ${sem.gpaW.toFixed(2)}）`);
  // 学期成长：六维（学术/英语/精力/创造力/社交/运气）里随机 3 个 +0.5，影响后续学期
  const growKeys=shuffle(Object.keys(STAT_NAMES)).slice(0,3);
  growKeys.forEach(k=>{ G.stats[k]=clamp(G.stats[k]+0.5,1,12); });
  pushLog("good",`📈 学期成长：${growKeys.map(k=>STAT_NAMES[k]).join("、")} 各 +0.5`);
  G.semAcc={eSum:0,sSum:0,n:0};   // #3 重置本学期精力/压力均值累计
  return sem;
}

