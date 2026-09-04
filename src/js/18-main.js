/* 18-main.js — 按钮接线与启动（必须最后） */
/* ---------- wire up ---------- */
$("startBtn").onclick=()=>{
  if(ptsUsed()!==START_POINTS){ $("ptsLeft").textContent=`点数必须为 ${START_POINTS}（当前 ${ptsUsed()}），请先点“随机”或手动调整。`; return; }   // #9：开局校验点数恰好 24
  startGame();
};
$("randBtn").onclick=()=>{Object.keys(editStats).forEach(k=>editStats[k]=ri(1,10));normalizeTo24();renderSetup();};
$("rerollTraitBtn").onclick=rollTraits;
$("endRoundBtn").onclick=endRound;
$("restartBtn").onclick=()=>{location.reload();};
$("allBtn").onclick=()=>{$("allTable").classList.toggle("collapsed");};
$("confirmPickBtn").onclick=goEnd;
$("helpBody").innerHTML=HELP;
let helpFrom="setup";
function openHelp(from){ helpFrom=from;
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));
  $("help").classList.add("on"); }
$("helpBtn1").onclick=()=>openHelp("setup");
$("helpBtn2").onclick=()=>openHelp("game");
$("helpBtn3").onclick=()=>openHelp("pick");
$("helpBackBtn").onclick=()=>{
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));
  $(helpFrom).classList.add("on");
};
$("edPickBtn").onclick=edPick;
$("edClearBtn").onclick=clearED;
$("summerApplyBtn").onclick=summerApply;
// 常驻排行榜弹层：任何界面随时查看实时榜
const lbModal=$("lbModal");
function openLbModal(){
  lbModal.classList.add("show");
  $("lbModalPanel").innerHTML=`<div class="small">读取中…</div>`;
  renderLeaderboard($("lbModalPanel"), {upload:false});
}
$("lbFloatBtn").onclick=openLbModal;
$("lbModalClose").onclick=()=>lbModal.classList.remove("show");
lbModal.addEventListener("click", e=>{ if(e.target===lbModal) lbModal.classList.remove("show"); });
rollTraits();
renderSetup();
