/* 02-config.js — 数值常量 / 模板 / 成绩换算 / 课程难度 */
/* ---------- config ---------- */
const TOTAL_ROUNDS=7, AP_BY_ROUND=[3,3,4,4,5,5,8], DEALT=6, RD_PER_BAND=10, REACH_MAX=5, MATCH_MAX=10, SAFETY_MAX=10, RD_MAX=20;
const SEM_W=[0.8,0.8,1.0,1.0,1.1,1.1,1.2];   // §4.6 学期权重：高年级成绩更重（美本“看趋势”），初三权重最低
const EPS_SIGMA=1.0;  // §5.1 共同冲击：每轮申请季抽一次 ε~N(0,σ)，让各校录取相关、制造“本季好坏年”波动
const ADMIT_SCALE=1.5;  // 重标定：录取强度系数（原 3.0）。#4 移除 blanket×0.62 后 base 率偏高，下调至 1.5 压缩强档优势、恢复保底校真实不确定性；同时让 ε 冲击相对更强。
const START_POINTS=24;   // 开局起始点数（固定）
// 行动点随年级递增：初三 3 / 高一 4 / 高二 5 / 高三上 8（全季共 32，与原 8×4 一致）
function apMaxThisRound(){ return (AP_BY_ROUND[G.round]||0) + sumFx('apDelta',0); }
const STAT_NAMES={academic:"学术",english:"英语",stamina:"精力上限",creativity:"创造力",social:"社交",luck:"运气"};
const STAT_ICON={academic:"book",english:"globe",stamina:"bolt",creativity:"bulb",social:"people",luck:"star"};
const TPL_DESC={"卷王":"学术拉满","快乐青年":"样样平均","斜杠":"活动与创意","躺平":"交给运气"};
const TEMPLATES={
  "卷王":   {academic:9,english:6,stamina:4,creativity:1,social:1,luck:3},
  "快乐青年":{academic:4,english:4,stamina:5,creativity:4,social:4,luck:3},
  "斜杠":   {academic:4,english:4,stamina:4,creativity:5,social:5,luck:2},
  "躺平":   {academic:2,english:2,stamina:4,creativity:3,social:3,luck:10}
};
const CAT_NAME={academic:"学业",social:"人际",chance:"机遇",health:"健康",family:"家庭",creative:"创意",award:"荣誉"};
const CAT_ICON={academic:"book",social:"people",chance:"star",health:"heart",family:"house",creative:"bulb",award:"award"};

/* GPA：真实成绩单制 */
const GRADE_SCALE=[["A",4.0],["A-",3.7],["B+",3.3],["B",3.0],["B-",2.7],["C+",2.3],["C",2.0],["C-",1.7],["D+",1.3],["D",1.0],["F",0.0]];
const LEVEL_BONUS={AP:1.0,H:0.5,R:0};
const LEVEL_DIFF={AP:0.20,H:0.10,R:0};
const RIGOR={
  regular:{name:"全常规",desc:"5 门常规课。最容易拿 A，但加权 GPA 上限就是 4.0，申请时课程强度偏弱。",mix:[["R",5]]},
  mixed:  {name:"混搭",  desc:"2 门 AP + 1 门 Honors + 2 门常规。稳中求进，多数人的选择。",mix:[["AP",2],["H",1],["R",2]]},
  heavy:  {name:"多 AP", desc:"4 门 AP + 1 门 Honors。加权 GPA 可冲 5.0、申请加分，但更难拿 A，压力与精力消耗更大。",mix:[["AP",4],["H",1]]}
};
function snapGrade(raw){
  let best=GRADE_SCALE[0];
  for(const g of GRADE_SCALE) if(Math.abs(g[1]-raw)<Math.abs(best[1]-raw)) best=g;
  return best;
}
