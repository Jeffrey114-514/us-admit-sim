/* 04-achievements.js — 成就定义（含判定函数） */
/* 成就 */
const ACHIEVEMENTS=[
  {id:"sat1500", name:"SAT 1500+",        test:(r,s)=>r.satBest>=1500},
  {id:"sat1550", name:"SAT 1550+",        test:(r,s)=>r.satBest>=1550},
  {id:"toefl110",name:"托福 110+",         test:(r,s)=>r.toeflBest>=110},
  {id:"gpa39",   name:"GPA 3.9+（未加权）",test:(r,s)=>cumGPA("U")>=3.9},
  {id:"wgp45",   name:"加权 GPA 4.5+",     test:(r,s)=>cumGPA("W")>=4.5},
  {id:"awards3", name:"3 个以上国家级奖项",  test:(r,s)=>r.awards>=3},
  {id:"perfect", name:"单学期满绩 4.0",     test:(r,s)=>r.semesters.some(x=>x.gpaU>=3.98)},
  {id:"zen",     name:"零压力毕业（峰值<30）",test:(r,s)=>r.stressMax<30},
  {id:"rep10",   name:"声望 10+",           test:(r,s)=>r.reputation>=10},
  {id:"craft5",  name:"文书与推荐信双 5+",   test:(r,s)=>r.essayQuality>=5&&r.recQuality>=5},
  {id:"noC",     name:"全学期无 C 及以下",   test:(r,s)=>r.semesters.every(x=>x.courses.every(c=>c.p>=3.0))},
  {id:"balanced",name:"六维全部 6+",         test:(r,s)=>Object.values(s).every(v=>v>=6)}
];
