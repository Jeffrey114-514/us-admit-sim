/* 16-leaderboard.js — 排行榜：本地/Supabase 双路 + 弹层渲染 */
/* ---------- 排行榜（评级拆 offer 后上传 / 共享榜）---------- */
// 默认本地榜（localStorage，仅本机可见，开箱即用）。
// 只有在【官方域名】下才自动切到 supabase 共享榜——这样 fork 自建 / 本地开发的测试数据
// 不会灌进正式榜单，而官方线上站点依然是实时多人榜。
//   - 想让你自己的部署也用共享榜：把你的域名加进下面的 LB_CLOUD_HOSTS 正则即可。
//   - 建表 SQL 见本文件底部注释；若 CDN 不可用或配置有误，会自动回退本地榜，不会卡死。
const _lbHost=(typeof location!=="undefined"&&location.hostname)||"";   // 兼容无 location 的测试环境
const LB_CLOUD_HOSTS=[/^us-admit-sim(-.+)?\.vercel\.app$/];             // 官方站点（含 Vercel 分支预览部署）
const LEADERBOARD={ mode: LB_CLOUD_HOSTS.some(re=>re.test(_lbHost))?"supabase":"local", url:"https://wthjoefsodksrwlqgreb.supabase.co", anonKey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aGpvZWZzb2Rrc3J3bHFncmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDcwMTksImV4cCI6MjEwMzkyMzAxOX0.nt1BvmwrlpjUK_lY5J-y8ecZE2U5umY4Tq81TclJdoI", table:"leaderboard" };
let LAST_RESULT=null;          // 本局最佳战绩，供上传使用
let _lbClient=null;            // Supabase 客户端缓存（未配置/未加载则为 false）
// 按需异步加载 Supabase 客户端：仅当 mode="supabase" 且填好 url/anonKey 时才动态注入 CDN 脚本，绝不在页面加载期阻塞。
// CDN 加载失败（onerror）则回退本地榜，不影响游玩。
function ensureSupabase(){
  if(_lbClient!==null) return Promise.resolve(!!_lbClient);   // 已解析过（true/false）
  if(LEADERBOARD.mode!=="supabase" || !LEADERBOARD.url || !LEADERBOARD.anonKey)
    return Promise.resolve(false);
  return new Promise(resolve=>{
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.async=true;
    s.onload=()=>resolve(true);
    s.onerror=()=>resolve(false);   // CDN 不可达 → 回退本地
    document.head.appendChild(s);
  });
}
async function lbClient(){
  if(_lbClient!==null) return _lbClient;
  const ok=await ensureSupabase();
  if(ok && typeof window!=="undefined" && window.supabase && LEADERBOARD.url && LEADERBOARD.anonKey)
    _lbClient=window.supabase.createClient(LEADERBOARD.url, LEADERBOARD.anonKey);
  else _lbClient=false;
  return _lbClient;
}
function lbLocalGet(){ try{ return JSON.parse(localStorage.getItem("usadmit_lb")||"[]"); }catch(e){ return []; } }
function lbLocalSet(a){ try{ localStorage.setItem("usadmit_lb", JSON.stringify(a.slice(0,200))); }catch(e){} }
// 本机是否已完成上传：完成后排行榜上传入口彻底隐藏（防止改名重复上传刷榜）
function lbHasUploaded(){ try{ return localStorage.getItem("usadmit_lb_uploaded")==="1"; }catch(e){ return false; } }
function lbMarkUploaded(){ try{ localStorage.setItem("usadmit_lb_uploaded","1"); }catch(e){} }
function lbClearUploaded(){ try{ localStorage.removeItem("usadmit_lb_uploaded"); }catch(e){} }
// 隐藏所有上传入口（按钮 + 表单），仅保留排行榜
function hideUploadUI(rdBox){
  if(!rdBox) return;
  const bar=rdBox.querySelector('#uploadBtn'); if(bar){ const p=bar.closest('.rdbar'); if(p) p.remove(); }
  const f=rdBox.querySelector('#uploadForm'); if(f) f.remove();
}
function lbEntry(e){ return {id:e.id, school:e.school, band:e.band, grade:e.grade, score:e.score, gpa:Math.round(e.gpa*100)/100, sat:e.sat||0, ts:e.ts}; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// 名校声望分：rank 越小越牛 → 分数越高；再叠加评级加成。0~1060 区间，足够排序且不至于差距过大。
function computeScore(sc, grade){
  if(!sc) return 0;
  const N=SCHOOLS.length;
  const prestige=Math.max(0, Math.round((1-(sc.rank-1)/(N-1))*1000));
  const gbonus={S:60,A:30,B:10,none:0}[grade]||0;
  return prestige+gbonus;
}
async function lbSubmit(entry){
  entry.ts=Date.now(); entry.id=(entry.id||"").trim();
  const cli=await lbClient();
  if(cli && LEADERBOARD.mode==="supabase" && entry.id){
    try{
      // 同名去重（UPSERT on id）：保留该玩家历史最佳，避免刷榜或覆盖高分
      const {data:exist}=await cli.from(LEADERBOARD.table).select("score").eq("id",entry.id).maybeSingle();
      if(exist && (exist.score||0) >= (entry.score||0)) return {ok:true, where:"supabase", note:"keep-best"};
      const {error}=await cli.from(LEADERBOARD.table).upsert(lbEntry(entry), {onConflict:"id"});
      if(error) throw error;
      return {ok:true, where:"supabase"};
    }catch(err){ /* 失败则回退本地 */ }
  }
  // 本地榜：按 id 去重，同一玩家只保留最佳成绩，防止一人多次上传刷屏
  const a=lbLocalGet();
  a.push(lbEntry(entry));
  const byId={};
  a.forEach(e=>{ if(!byId[e.id] || (e.score||0)>(byId[e.id].score||0)) byId[e.id]=e; });
  lbLocalSet(Object.values(byId));
  return {ok:true, where:"local"};
}
async function lbFetch(){
  const cli=await lbClient();
  let cloud=[];
  if(cli && LEADERBOARD.mode==="supabase"){
    try{
      const {data,error}=await cli.from(LEADERBOARD.table).select("*").order("score",{ascending:false}).limit(50);
      if(error) throw error;
      cloud=data&&data.length?data:[];
    }catch(err){ console.warn("排行榜拉取失败，回退本地", err); }
  }
  // 合并云端 + 本机：同名取最佳（lbDedupe 已处理），保证既看到他人云端成绩也看到自己的本机成绩
  return lbDedupe(cloud.concat(lbLocalGet())).slice(0,50);
}
// 按玩家名去重，同一名字只保留最佳成绩（兼容历史上可能的重复数据）
function lbDedupe(rows){
  const byId={};
  (rows||[]).forEach(e=>{ if(!byId[e.id] || (e.score||0)>(byId[e.id].score||0)) byId[e.id]=e; });
  return Object.values(byId).sort((a,b)=>(b.score||0)-(a.score||0));
}
async function renderLeaderboard(el, opts){
  el = el || document.getElementById("lbPanel"); if(!el) return;
  opts = opts || {};
  const rows=lbDedupe(await lbFetch());
  if(!rows.length){ el.innerHTML=`<div class="small">还没有人上传成绩。${opts.upload===false?'':'拆开 offer 后，点「上传到排行榜」留下你的名字吧！'}</div>`; return; }
  let note='';
  if(opts.upload===false){
    note=`<div class="small" style="margin-top:6px">${LEADERBOARD.mode==="supabase"?"共享榜（Supabase）· 实时":"本地榜（本机）"}</div>`;
  }else{
    const uploaded=lbHasUploaded();
    note = uploaded
      ? `<div class="small" style="margin-top:6px">本机已留名 · <a href="#" id="lbReset" style="color:var(--good)">重新上传</a></div>`
      : (LEADERBOARD.mode==="supabase"?`<div class="small" style="margin-top:6px">共享榜（Supabase）· 实时</div>`:`<div class="small" style="margin-top:6px">本地榜（本机）· 在 LEADERBOARD 配置里填好 Supabase 即可升级为跨玩家共享榜</div>`);
  }
  el.innerHTML=`<table class="mini"><tr><th>#</th><th>玩家</th><th>最佳录取</th><th>评级</th><th>分数</th></tr>`+
    rows.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.school)}（${escapeHtml(r.band)}）</td><td>${escapeHtml(r.grade)}</td><td><b>${r.score}</b></td></tr>`).join("")+`</table>`+note;
  const reset=el.querySelector('#lbReset');
  if(reset) reset.onclick=(e)=>{ e.preventDefault(); lbClearUploaded();
    const rb=$("rdTable");
    if(rb && !rb.querySelector('#uploadBtn')){
      const bar=document.createElement('div'); bar.className='rdbar';
      bar.innerHTML=`<button class="btn" id="uploadBtn">🏆 上传到排行榜</button><span class="small">重新上传你的最佳战绩</span>`;
      rb.appendChild(bar);
      const form=document.createElement('div'); form.id='uploadForm'; form.className='collapsed'; rb.appendChild(form);
      bar.querySelector('#uploadBtn').onclick=()=>openUploadForm(rb);
    }
    renderLeaderboard();
  };
}
function openUploadForm(rdBox){
  const box=rdBox.querySelector('#uploadForm'); if(!box || !LAST_RESULT) return;
  if(box.dataset.open==="1"){ submitUpload(rdBox); return; }
  box.dataset.open="1"; box.classList.remove('collapsed');
  box.innerHTML=`<span class="small">玩家名：</span><input id="lbId" maxlength="10" placeholder="≤10字，中英文皆可" style="font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--line2);background:var(--card);color:var(--ink);width:160px"> <button class="btn" id="lbConfirm">确认上传</button> <button class="btn ghost" id="lbCancel">取消</button> <span id="lbMsg" class="small"></span>`;
  box.querySelector('#lbCancel').onclick=()=>{ box.classList.add('collapsed'); box.dataset.open="0"; box.innerHTML=""; };
  box.querySelector('#lbConfirm').onclick=()=>submitUpload(rdBox);
}
async function submitUpload(rdBox){
  const box=rdBox.querySelector('#uploadForm'); if(!box) return;
  const idEl=box.querySelector('#lbId'); const msg=box.querySelector('#lbMsg'); if(!idEl) return;
  const id=(idEl.value||"").trim();
  if(!id){ msg.textContent="请先输入临时ID"; msg.style.color="var(--bad)"; return; }
  if([...id].length>10){ msg.textContent="ID 不能超过 10 个字"; msg.style.color="var(--bad)"; return; }
  const res=await lbSubmit(Object.assign({}, LAST_RESULT, {id}));
  if(res.ok){
    msg.textContent="已上传 ✓"; msg.style.color="var(--good)";
    lbMarkUploaded();
    hideUploadUI(rdBox);
    renderLeaderboard();
  }else{
    msg.textContent="上传失败"; msg.style.color="var(--bad)";
  }
}
// 逐张拆信：当所有 offer 都被翻面时，自动揭开隐藏的评级与上传入口
function maybeRevealRating(rdBox){
  const offs=rdBox.querySelectorAll('.offer');
  if(offs.length && [...offs].every(o=>o.classList.contains('flipped'))){
    const s=rdBox.querySelector('#rdSummary'); if(s) s.classList.remove('collapsed');
    renderLeaderboard();
  }
}
