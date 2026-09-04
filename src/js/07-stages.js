/* 07-stages.js — 学期表 STAGES */
const STAGES=[
 {yr:"初三",sem:"上",theme:"中考备考 · 兴趣萌芽"},
 {yr:"初三",sem:"下",theme:"中考冲刺"},
 {yr:"高一",sem:"上",theme:"适应高中"},
 {yr:"高一",sem:"下",theme:"社团与探索"},
 {yr:"高二",sem:"上",theme:"标化首考 · 竞赛"},
 {yr:"高二",sem:"下",theme:"深度学习 · 成长期"},
 {yr:"高三",sem:"上",theme:"文书与早申"}
];
const yrLabel=r=>STAGES[r].yr+STAGES[r].sem;
