#!/usr/bin/env node
/* ============================================================
   build.js —— 把 src/ 下的源码内联打包成根目录的单文件 index.html
   用法： node build.js
   注意：根目录 index.html 是【构建产物】，请勿直接编辑；
         所有修改请改 src/ 下的源码，然后重新运行本脚本。
   ============================================================ */
const fs=require('fs'), path=require('path');
const ROOT=__dirname, SRC=path.join(ROOT,'src');
const ORDER=[
    "js/00-schools.js",
    "js/01-utils.js",
    "js/02-config.js",
    "js/03-traits.js",
    "js/04-achievements.js",
    "js/05-state.js",
    "js/06-setup.js",
    "js/07-stages.js",
    "js/08-events.js",
    "js/09-majors.js",
    "js/10-actions.js",
    "js/11-semester.js",
    "js/12-flow.js",
    "js/13-pick.js",
    "js/14-summer.js",
    "js/15-admit.js",
    "js/16-leaderboard.js",
    "js/17-help.js",
    "js/18-main.js",
    "js/19-footer.js"
  ];

// 读入所有 JSON 数据
const DATA={};
for(const f of fs.readdirSync(path.join(SRC,'data'))){
  if(!f.endsWith('.json')) continue;
  DATA[f.replace(/\.json$/,'')]=JSON.parse(fs.readFileSync(path.join(SRC,'data',f),'utf8'));
}

// 依次拼装 JS：替换 /*$name$*/[] 标记为对应 JSON
let jsParts=[];
for(const rel of ORDER){
  const p=path.join(SRC,rel);
  let code=fs.readFileSync(p,'utf8');
  code=code.replace(/\/\*\$(\w+)\$\*\/\s*\[\]/g,(m,name)=>{
    if(!(name in DATA)) throw new Error('未知数据标记: '+name+' (在 '+rel+')');
    return JSON.stringify(DATA[name],null,2);
  });
  jsParts.push(code);
}

const css=fs.readFileSync(path.join(SRC,'styles.css'),'utf8').trim();
const shell=fs.readFileSync(path.join(SRC,'shell.html'),'utf8');

const banner='<!-- 本文件由 build.js 自动生成，请勿直接编辑。源码见 src/ -->';
// 注意：所有模块内联进【同一个 <script> 块】——保持与原单文件版结构一致。
// 若拆成多个 <script>，依赖 /<script>[\s\S]*<\/script>/ 提取代码的测试会被
// 中间的 </script> 分隔符截断（非贪婪只取第一块，贪婪则拼出非法 JS）。
const out=shell
  .replace('<!--CSS-->', '<style>\n'+css+'\n</style>')
  .replace('<!--APP-->', '<script>\n'+jsParts.join('\n')+'\n</'+'script>');

fs.writeFileSync(path.join(ROOT,'index.html'), out.replace('<html', banner+'\n<html'));
console.log('✓ 已生成 index.html  '+out.length+' 字符  ('+ORDER.length+' 个 JS 模块 + '+
            Object.keys(DATA).length+' 个 JSON 数据 + 1 个 CSS + shell.html)');
