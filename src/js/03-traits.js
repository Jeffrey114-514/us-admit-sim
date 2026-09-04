/* 03-traits.js — 天性特质 + 特质求和（数据来自 data/traits.json） */
/* 天性特质 */
const TRAITS=/*$traits$*/[];
const sumFx=(k,d)=>{let v=d;G.traits.forEach(t=>{if(t.fx[k]!=null)v+=t.fx[k];});return v;};
const mulFx=(k,d)=>{let v=d;G.traits.forEach(t=>{if(t.fx[k]!=null)v*=t.fx[k];});return v;};
